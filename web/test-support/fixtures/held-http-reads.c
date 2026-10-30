#define _POSIX_C_SOURCE 200809L
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>

static void fail(const char *operation) {
  perror(operation);
  exit(1);
}

static long milliseconds(void) {
  struct timespec now;
  if (clock_gettime(CLOCK_MONOTONIC, &now) != 0) fail("clock_gettime");
  return now.tv_sec * 1000 + now.tv_nsec / 1000000;
}

static void ready(int socket_fd, short events, long deadline) {
  for (;;) {
    long remaining = deadline - milliseconds();
    if (remaining <= 0) { errno = ETIMEDOUT; fail("HTTP header deadline"); }
    struct pollfd descriptors[2] = {
      {socket_fd, events, 0}, {STDIN_FILENO, POLLIN, 0}
    };
    int result = poll(descriptors, 2, (int)remaining);
    if (result < 0 && errno == EINTR) continue;
    if (result < 0) fail("poll");
    if (descriptors[1].revents) exit(0);
    if (descriptors[0].revents & events) return;
    if (descriptors[0].revents & (POLLERR | POLLHUP | POLLNVAL)) {
      errno = ECONNRESET;
      fail("HTTP socket closed before headers");
    }
  }
}

int main(int argc, char **argv) {
  if (signal(SIGPIPE, SIG_IGN) == SIG_ERR) fail("ignore SIGPIPE");
  if (argc != 3) { fprintf(stderr, "usage: held-http-reads PORT PATH\n"); return 1; }
  char *end;
  long port = strtol(argv[1], &end, 10);
  if (*end || port < 1 || port > 65535 || argv[2][0] != '/' ||
      strchr(argv[2], '\r') || strchr(argv[2], '\n')) return 1;
  int sockets[2], buffers[2];
  long deadline = milliseconds() + 10000;
  for (int index = 0; index < 2; index++) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) fail("socket");
    sockets[index] = fd;
    int receive_buffer = 1024;
    if (setsockopt(fd, SOL_SOCKET, SO_RCVBUF, &receive_buffer, sizeof(receive_buffer)) != 0)
      fail("setsockopt SO_RCVBUF");
    socklen_t length = sizeof(buffers[index]);
    if (getsockopt(fd, SOL_SOCKET, SO_RCVBUF, &buffers[index], &length) != 0)
      fail("getsockopt SO_RCVBUF");
    if (buffers[index] <= 0 || buffers[index] > 8192) {
      fprintf(stderr, "unbounded receive buffer: %d\n", buffers[index]); return 1;
    }
    if (fcntl(fd, F_SETFL, O_NONBLOCK) != 0) fail("fcntl");
    struct sockaddr_in address = {0};
    address.sin_family = AF_INET;
#ifdef __APPLE__
    address.sin_len = sizeof(address);
#endif
    address.sin_port = htons((unsigned short)port);
    if (inet_pton(AF_INET, "127.0.0.1", &address.sin_addr) != 1) {
      fprintf(stderr, "invalid IPv4 loopback address\n"); return 1;
    }
    if (connect(fd, (struct sockaddr *)&address, sizeof(address)) != 0 && errno != EINPROGRESS)
      fail("connect");
    ready(fd, POLLOUT, deadline);
    int connection_error;
    length = sizeof(connection_error);
    if (getsockopt(fd, SOL_SOCKET, SO_ERROR, &connection_error, &length) != 0)
      fail("getsockopt SO_ERROR");
    if (connection_error) { errno = connection_error; fail("connect completion"); }
    char request[1024];
    int size = snprintf(request, sizeof(request), "GET %s HTTP/1.1\r\nHost: 127.0.0.1:%ld\r\nConnection: close\r\n\r\n", argv[2], port);
    if (size < 0 || (size_t)size >= sizeof(request)) return 1;
    for (int sent = 0; sent < size;) {
      ready(fd, POLLOUT, deadline);
      ssize_t count = send(fd, request + sent, (size_t)(size - sent), 0);
      if (count < 0 && (errno == EINTR || errno == EAGAIN)) continue;
      if (count == 0) { errno = EPIPE; fail("send request"); }
      if (count < 0) fail("send request");
      sent += (int)count;
    }
    char header[8193] = {0};
    size_t used = 0;
    while (used < sizeof(header) - 1) {
      ready(fd, POLLIN, deadline);
      ssize_t count = recv(fd, header + used, 1, 0);
      if (count < 0 && (errno == EINTR || errno == EAGAIN)) continue;
      if (count <= 0) { errno = ECONNRESET; fail("read HTTP headers"); }
      used++;
      if (used >= 4 && memcmp(header + used - 4, "\r\n\r\n", 4) == 0) break;
    }
    if (used == sizeof(header) - 1 || strncmp(header, "HTTP/1.1 200 ", 13) != 0) {
      fprintf(stderr, "expected bounded HTTP 200 headers: %.*s\n", 80, header); return 1;
    }
  }
  printf("{\"event\":\"held-http-reads-ready\",\"connections\":2,\"receiveBufferBytes\":[%d,%d]}\n", buffers[0], buffers[1]);
  if (fflush(stdout) != 0) fail("publish ready");
  char release;
  ssize_t released;
  do { released = read(STDIN_FILENO, &release, 1); } while (released < 0 && errno == EINTR);
  if (released < 0) fail("read release");
  for (int index = 0; index < 2; index++) if (close(sockets[index]) != 0) fail("close HTTP socket");
  return 0;
}
