#include <sys/sysctl.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>

static int denied_environment_sysctl(int *, u_int, void *, size_t *, void *, size_t);
static unsigned int selected_calls;

/* Inject one unreadable environment operation; every BSD identity remains a kernel read. */
#define sysctl denied_environment_sysctl
#include "../process-environment.c"
#undef sysctl

static int denied_environment_sysctl(int *mib, u_int length, void *old, size_t *old_length, void *newer, size_t new_length) {
  if (length == 3 && mib[0] == CTL_KERN && mib[1] == KERN_PROCARGS2) {
    const char *ledger = getenv("MAISTER_TEST_PROCESS_LEDGER");
    char filename[PATH_MAX];
    if (!ledger || snprintf(filename, sizeof(filename), "%s/process-environment-denied-pid", ledger) >= (int)sizeof(filename)) {
      errno = EINVAL;
      return -1;
    }
    FILE *control = fopen(filename, "r");
    if (!control) return -1;
    int denied_pid, failure_errno = EACCES, failure_limit = -1, failure_offset = 0;
    int found = fscanf(control, "%d %d %d %d", &denied_pid, &failure_errno, &failure_limit, &failure_offset);
    fclose(control);
    if ((found != 1 && found != 3 && found != 4) || denied_pid <= 0 ||
        (failure_errno != 0 && failure_errno != EINVAL && failure_errno != EACCES && failure_errno != EPERM) ||
        failure_limit < -1 || failure_limit > 2 || failure_offset < 0 || failure_offset > 1) {
      errno = EINVAL;
      return -1;
    }
    if (mib[2] == denied_pid) {
      selected_calls++;
      int injected = selected_calls > (unsigned int)failure_offset &&
        (failure_limit < 0 || selected_calls - (unsigned int)failure_offset <= (unsigned int)failure_limit);
      errno = 0;
      int result = injected && failure_errno != 0 ? -1 : sysctl(mib, length, old, old_length, newer, new_length);
      int error = injected && failure_errno != 0 ? failure_errno : (result == 0 ? 0 : errno);
      /* A short reported length exercises parsing without replacing any kernel bytes. */
      if (injected && failure_errno == 0 && result == 0) *old_length = sizeof(int) - 1;
      fprintf(stderr, "{\"event\":\"process-environment-control\",\"pid\":%d,\"call\":%u,\"injected\":%d,\"result\":%d,\"errno\":%d}\n", denied_pid, selected_calls, injected, result, error);
      errno = error;
      return result;
    }
  }
  return sysctl(mib, length, old, old_length, newer, new_length);
}
