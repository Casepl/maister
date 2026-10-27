#include <libproc.h>

static int selected_info_denied;
static int controlled_proc_pidinfo(int pid, int flavor, uint64_t arg, void *buffer, int buffersize);

/* Deny selected reads while retaining real kernel identity/tag checks for groups. */
#define main native_reader_main
#define proc_pidinfo controlled_proc_pidinfo
#include "../process-environment.c"
#undef proc_pidinfo
#undef main

static int controlled_proc_pidinfo(int pid, int flavor, uint64_t arg, void *buffer, int buffersize) {
  if (selected_info_denied) {
    errno = EACCES;
    return 0;
  }
  return proc_pidinfo(pid, flavor, arg, buffer, buffersize);
}

int main(int argc, char **argv) {
  selected_info_denied = argc > 2;
  return native_reader_main(argc, argv);
}
