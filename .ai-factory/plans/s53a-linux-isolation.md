# Implementation Plan: S5.3a Linux isolation driver and hosted-lane decision

Branch at planning: `master` (no branch created or switched).
Current continuation branch: `codex/s53a-qualification`; retain this explicit plan path rather than relying on branch-derived discovery.
Created: 2026-10-02.
Refined through `aif-improve`: 2026-10-20 on working baseline `8237993223fa5a7c3aafe9db42d9438612990938`; implementation, verification and local phase commits authorized. Original planning/qualification sources remain separately attributed.
Planning source: `f43ac1570380d2be19f7c59a70cd993f24ace440`.
Status: **A1–A13, C3/G-LINUX and C4a are complete. Native Ubuntu Linux55 and Darwin50, separate preflights, bounded-output26, publish10, R20 and full applicable regressions pass on both exact Nodes. A13 retains the accepted macOS 19/31 hosting recipe; A14 is not applicable and Linux hosting remains unqualified. A15 local disposition follows. Parent stabilization stays 43/45; S5.3/S5.4/C11 remain open. No push.**

Implementation authorized 2026-10-03 through `aif-implement`: execute the whole plan, commit by qualified phases and mark tasks only after their acceptance evidence passes. Initial implementation HEAD is the planning source. The current owner instruction authorizes local phase commits and explicitly forbids push; the earlier completed handoff authorization is historical.

## Settings and authority

Owner amendment, 2026-10-20: CI-R9 below replaces the single macOS isolation
job with two independent macOS jobs, serial within each. All seven suites and
50 required cases, existing deadlines and runner sizes remain mandatory.
Earlier unsharded-hosting language is historical for macOS; prospective Linux
hosting still requires its own qualification. The current continuation permits local commits only, with no push or hosted dispatch.

- Testing: **yes**, SDD → executed RED → minimal GREEN → REFACTOR → valid falsification → restored GREEN. Real Linux processes, real PostgreSQL and production web/supervisor entrypoints. No acceptance skips, quarantines, substitutes, timeout increases or larger runners.
- Logging: **verbose**, bounded structured DEBUG diagnostics; INFO for capability/launch/restart/exit/qualification; WARN for refused authority and bounded retries; ERROR for capability, inspection, cleanup and budget failures. Reuse `logInvocation`, existing fixture loggers and `LOG_LEVEL`; never log credential values, environment dumps, prompts, sentinel contents, SQLite contents or object bodies. Paths are role labels/digests in shared evidence; private local diagnostics may retain necessary owned paths.
- Docs: **yes**, mandatory documentation checkpoint through `$aif-docs` during implementation. Complete normative analytics before behavior changes; mark Linux mechanisms Designed until actually executed. No new standalone summary report deliverable; use existing invocation/report/timing artifacts and evidence fields in owning plans.
- Original planning invocation was planning only. The subsequent implementation authorization permits local code, specs, disposable test environments, validation and phase commits; it does not permit agent push, workflow dispatch/rerun or production infrastructure changes. The explicit plan path overrides filename discovery.
- Current owner authority: finish the qualified implementation and commit by phases locally; **do not push**. The earlier manual Mac handoff authorization applied only to that historical handoff. No PR, shared-branch merge, manual CI dispatch/rerun or production-infrastructure change is authorized.
- The original sequencing override permitted S5.3a while S5.2 was open. CI-R9d now supplies the separate hosted proof closing S5.2. Browser lifecycle expansion and separate-user production deployment stay distinct S5.3 deliverables.

## Roadmap Linkage

Milestone: **Stage A/B stabilization — S5.3a**, a bounded part of S5.3 in [stage-ab-stabilization.md](stage-ab-stabilization.md), following the accepted S5.2 hosted gate.
Rationale: finish Linux kernel-boundary qualification and decide hosted placement from complete measurements without reopening accepted A/B runtime semantics or silently closing S5.3.
No new roadmap milestone or roadmap checkbox change is required by planning. Completion updates later use the artifact's owner workflow.

## Research context and verified baseline

No `.ai-factory/RESEARCH.md` exists. Inputs are the request, current source, repository instructions, the stabilization/R9 plans and primary Linux references below. All source pointers describe the planning SHA; refresh them before implementation.

| Evidence | What it proves / limitation |
|---|---|
| Tracked files clean at baseline inspection; `HEAD`, local `master` and cached `origin/master` all equal `f43ac1570380d2be19f7c59a70cd993f24ace440` | Current local source baseline. Cached remote ref alone is not live remote verification. |
| [Hosted run 37027276191](https://github.com/maister-dev/maister/actions/runs/37027276191), read-only `gh run view` metadata | Exact `headSha` matches baseline. Four web shards, both runtime/supervisor jobs, Librarian browser, static/unit and production-image jobs passed. Intel isolation failed; total isolation duration 50m33s. Label-gated broad integration was skipped by existing policy and supplies no evidence. No rerun was requested or performed. |
| Latest Intel details supplied by owner | Exit 124; four completed suites/35 passed cases including S3, S1 race, P4 and cleanup took approximately 36m22s of a 39-minute slice allowance. Separate preflight passed; complete seven-suite/50-case reporter absent. Final containment reaped one process. This is failure evidence even if containment succeeded. Artifact contents were not independently downloaded during planning. |
| Owner's native Darwin ARM64 qualification | 50/50 in 801.033s, separate preflight, zero leaks. Supports that platform/source only; does not qualify hosted Intel or Linux. Preserve historical 801.079s and older report identities in their owning records; do not merge distinct attempts. |
| Current environment read-only inventory | Darwin ARM64; Docker Desktop context exists, but socket access was denied during inspection. No current Linux kernel/capability/Node evidence and no Linux environment launched. Previous Linux ARM64/Node 24.19 process-reader/watchdog smoke in analytics is not an isolation-driver qualification. |

Relevant source and normative inputs:

- Root `AGENTS.md`, `CLAUDE.md`, `web/CLAUDE.md`, `docs/CLAUDE.md`, `.ai-factory/{DESCRIPTION,ARCHITECTURE}.md`, `.ai-factory/skill-context/aif-plan/SKILL.md`.
- `.ai-factory/plans/stage-ab-stabilization.md`: D10, S5.2, S5.3a entry gate, acceptance matrix; `.ai-factory/plans/codex-stage-ab-ci-r9.md`: T5/T13b, hosting/budget and latest corrective qualification.
- `docs/system-analytics/test-infrastructure.md`: fixture ownership, Linux process reader, lane/report/budget contracts and macOS-specific S5.2 acceptance.
- `web/test-support/{process-isolation,real-web,process-invocation,owned-fixture,real-supervisor,production-fault-fixture,pg-container}.ts`, `fixture-parent-watchdog.mjs`, owning isolation/preflight/cleanup suites and nested cleanup fixtures.
- `scripts/{run-stage-ab-tests.mjs,run-stage-ab-tests.test.mjs,setup-isolation-ci-runtime.sh}`, `.github/workflows/ci.yml`, `web/vitest.workspace.ts`.
- `docs/{deployment,architecture,configuration,supervisor,error-taxonomy,decisions}.md`, deployment units, Docker/compose/env surfaces and API/event/data schemas.

## Decisions

### D1 — Select a mount-namespace driver, with private PID/proc and user namespaces

Use a **rootless Bubblewrap (`bwrap`) driver**, preserving the host UID and host network. Construct a fresh filesystem view with explicit readable/writable binds; create private user and PID namespaces and mount that PID namespace's `/proc`. This is the selected mechanism, subject to fail-closed capability and behavior qualification. Do not implement a second Linux mechanism as a fallback.

| Mechanism | Fit with actual harness | Privileges/dependencies/provisioning | Decision |
|---|---|---|---|
| Distinct web UID, supervisor-private roots 0700 | Kernel DAC denies private reads and cross-UID proc/ptrace. Current `/proc` inventory filters to runner UID; ordinary runner cannot inspect/signal another UID. Shared repo/worktree traversal and writes need deliberate grants. | Account/group provisioning and credential dropping; either privileged ephemeral harness or an exact-identity inspection/signal broker; remove supplementary groups and capabilities. Root-owned harness broadens cleanup authority. | Rejected for S5.3a: greater privilege and ownership changes. Remains relevant to separate-user production deployment. |
| Fresh mount namespace + private PID/proc + user namespace | Host-side UID/PID/start-time ownership remains usable. Supervisor-private files are absent from the sandbox. Private proc avoids host magic-link access. Existing watchdog cannot run unchanged inside it. | `bwrap`, permitted unprivileged namespaces, applicable AppArmor policy, working host `/proc` inspection; trusted outer launcher and kernel parent-death chain. No host CAP_SYS_ADMIN or privileged signal broker for the web. | Selected: narrow test-harness extension; qualify launcher and inspector rather than assuming wrapper transparency. |

Mounting `/` read-only and masking a private directory is insufficient: aliases, host proc and inherited descriptors can recover access. Rootless namespace support is also not implied by a Linux runner label. The [Bubblewrap security model](https://github.com/containers/bubblewrap/blob/main/README.md) makes caller policy decisive. The [upstream option/source contract](https://github.com/containers/bubblewrap/blob/main/bwrap.xml) defines explicit namespace and parent-death options; read the installed package's corresponding source before depending on its monitor behavior. [Linux PID namespace semantics](https://man7.org/linux/man-pages/man7/pid_namespaces.7.html) govern descendant lifetime and namespace-init death.

Required policy options: `--unshare-user`, `--unshare-pid`, private `--proc /proc`, `--die-with-parent`, `--disable-userns`, `--assert-userns-disabled`, `--cap-drop ALL`, plus exact mounts and `--chdir`. Verify `NoNewPrivs=1` and no effective/permitted/ambient capabilities at application exec. Do not use `--as-pid-1`; retain the reaper. Do not use `--unshare-user-try`, required-bind `-try` switches, `--not-a-security-boundary`, host-root binds or privilege restoration. Unsupported required options/capabilities are explicit failures.

Do not add `--new-session` blindly: the current fixture's detached host PGID is an ownership handle. Require non-TTY stdin/stdout/stderr (ignored stdin, pre-opened owned logs), no controlling terminal and closed unrelated descriptors. This addresses terminal injection without changing the group by accident. If the installed monitor changes PGID anyway, document and register its actual host identities; do not relax ownership checks to pretend PGID equals PID.

### D2 — Exact filesystem and authority boundary

Introduce an immutable, strictly typed launch policy shared by access probes and `startRealWeb`, with separate denied roots, read-only roots/files, writable roots and cwd. Keep `IsolationDriver` and the `{file,args}` wrapping seam; extend its input minimally rather than implementing a separate real-web launcher API. Preserve Darwin driver behavior and `EPERM`; Linux private-path absence must produce the specified `ENOENT`, not an arbitrary caught error. Application-read-only writes must fail with `EROFS` at the bound filesystem. Typed errors distinguish missing capability, invalid policy and failed process inspection; no new product `MaisterError` code.

The application `web/public` tree is optional when absent in the checkout, as in the verified baseline. An existing public tree must be a regular directory and is mounted read-only. Required build traces, source files and runtime dependencies remain mandatory; an absent optional public tree never authorizes a broader repository bind.

Read-only application trees are the explicitly named `web/{app,lib,components,config,i18n,styles,types}` directories needed by the fresh build's trace. Retain individual required inputs outside these trees and the verified pnpm package closure; traced test sources stay individual files so generated fixture state is never imported by a directory bind. Never bind all `web` or the repository to compact the policy. Inspect filesystem metadata once per distinct candidate when removing covered file binds. Launch-policy metadata is bounded at112KiB before spawn and at decode, leaving room below Linux's128KiB per-argument limit on the qualifying4KiB-page host. Status frames retain their separate64KiB bound; command metadata is bounded at32KiB. Reject canonical trace inputs outside approved application/dependency material. This does not grant write access to application sources or authority files, or change any test/CI deadline.

| Role | Linux application view | Enforcement / ownership |
|---|---|---|
| Production application | Exact checked-out web sources, `server.ts`, `.next` and required root package/dependency material read-only at the same absolute locations | Exact RO binds; `.next` build and lock remain host-owned. Resolve pnpm symlinks and bind only required target trees. No parent HOME/repository-parent bind. |
| Executables/runtime | Actual `process.execPath`, tsx loader/dependency graph, required shared libraries, Git and narrowly identified CA/DNS/timezone/NSS files | Enumerated RO inputs from installed runtime; record closure. Required missing input fails. Do not mount all `/etc`, `/opt`, `/var` or host home for convenience. |
| Shared repository/workspace | Explicit fixture repository and designated worktrees | RW binds of exact roots. Git worktree creation needs repo `.git` common metadata writable; the repository is a sibling of supervisor storage. Never bind the whole fixture base. |
| Web-owned state | `runtimeRoot`, deliberately supported web cache subdirectory if actual production startup needs it | RW exact bind(s); create/register owned roots before spawn. Do not make all `.next` or the application writable to repair a missed cache requirement. |
| Temporary/device/proc | Private temporary storage and HOME; minimal `/dev`; private PID-namespace proc | tmpfs/private view, no host tmp/proc/devices. Only required pseudo devices. Inspect actual mount/capability view. |
| Supervisor-private state | `deniedRoots`: runtime storage, state directory including SQLite main/WAL/SHM, runtime objects, raw transcripts and any maintenance-admission root used by fixture | Absent from namespace; deny policy cannot overlap a readable/writable bind or its aliases. Supervisor outside namespace retains access. |
| Harness authority | Invocation ledger, build lock, resource ownership markers, evidence directory, Docker/D-Bus/control sockets, host credentials | Remain outside namespace. Only pre-opened owned stdout/stderr logs cross. No inherited private directory/file/socket descriptor or control channel exposing host operations. |

Validate before exec: nonempty command; absolute existing canonical bind sources; duplicate/conflicting destinations; canonical overlap in both ancestor directions; symlink/`..` aliases; cwd inside readable scope; writable sources with correct invocation ownership. Fail rather than rewriting an unsafe policy. Plan the policy once for a fixture and reuse it on probes/restarts; do not re-derive it from mutable globals. A cwd formed from explicitly approved application files may be a synthesized namespace parent; remount the fresh namespace root read-only after installing binds and verified pnpm symlinks so these structural parents are immutable. Private tmp/home and explicit owned RW mounts remain separate mounts.

Freeze both source and destination paths plus source device/inode identity in the policy. Revalidate immediately before each exec and after mount setup, before application readiness; replaced roots, changed symlink targets or broadened restart overrides refuse with an actionable policy error. This is a trusted, immutable fixture-layout prerequisite, not a claim to withstand a concurrent privileged host remounter. An allowed application/cache bind must not recursively import an unrelated nested host mount; inspect the actual mount tree and qualify recursive read-only behavior. Bind only an explicitly approved nested mount or refuse it. LI-refusal owns the replaced-source/overlap/hardlink table; LI-boundary owns actual RO mount behavior. A5 restricts `restart(overrides)` from replacing or clearing the fixture's isolation policy; unchanged ordinary fixture override behavior remains outside that restriction.

The original access probe used unregistered `execFile`, inherited its caller environment and had no parent watchdog. A7 implemented probes with the same immutable mount policy and trusted outer-launcher lifecycle as web, including current `Invocation`, fresh `fixtureProcessEnvironment`, captured direct-child registration, bounded output and the existing 20-second probe deadline. Keep probe-result stdout separate from launcher status/diagnostics. Validate exactly one typed `AccessProbe` record and a successful application exit; empty/malformed output, launch refusal, timeout or signal is an explicit error, never a filesystem denial. On every completion/cancellation, await process closure, close pipes and prove the probe namespace/descendants gone before returning; cleanup failure accompanies the original error. Reuse existing invocation primitives and the launch seam rather than a second probe-only sandbox. LI-refusal owns timeout/spawn/output-failure subcontrols and LI-parent includes parent death of a probe; no duplicate probe lifecycle suite.

The trusted harness must not export hardlinks to private inodes into allowed material. A name-based namespace cannot revoke an already exported private inode/descriptor. The bounded fixture guard snapshots the known protected files (sentinel and existing SQLite main/WAL/SHM) with `lstat`/`stat`, records device/inode/link count, and rejects any multiply linked protected file or an explicit bind-file input with the same device/inode. Missing optional WAL/SHM is recorded as absent, while sentinel/main SQLite must exist; recheck before each restart. Do not recursively scan all repositories, dependencies or private storage. Trusted fixture setup enforces the no-export prerequisite for remaining private content. Add one deliberate hardlink subcontrol to LI-refusal; document this prerequisite rather than claim protection after intentional secret export. Boundary controls attempt symlink aliases, traversal, `/proc/<hostPid>/{root,cwd,fd,ns}`, privilege/remount/re-entry, and descendant fork/exec. Parent-private FDs are closed before child exec; log FDs contain only intended logs. Do not expose a generic host inspection/signaling broker to the sandbox.

Host networking intentionally retains authorized loopback HTTP/SSE, Postgres TCP and opaque-object access. This is a filesystem boundary, not network isolation. No Docker control socket is mounted; preflight refuses an unauthenticated daemon TCP endpoint reachable by the web. Production host HTTP/object/auth semantics remain unchanged.

Pass a strictly typed, explicit inner application environment assembled from the production fixture's required Node/web/DB/supervisor settings and exact invocation tag. Keep owner/parent identities and ledger access in the outer launcher; tag visibility does not grant ledger access. Do not forward ambient `NODE_OPTIONS`, preload variables, dynamic-loader variables, unrelated credentials or Docker control settings into the inner web. Needed bounded Node options are explicit validated argv/settings, with all loader files in the approved RO closure. Preserve real fixture DB/auth/host credentials needed by I2 without logging them. Verify the actual child environment and inherited FDs in LI-boundary; a hidden path does not make an inherited credential or control socket safe.

I1's current harness `readFile(sentinel)` plus `/health` is not an actual supervisor sentinel-read witness. A7 adds a tiny invocation-owned Node preload for the supervisor fixture only, passed through its existing `env.NODE_OPTIONS` seam: it reads the exact sentinel before normal `main.ts` boot and emits only a digest/byte-count with PID/invocation identity. Confirm that PID is the registered real supervisor, not an unrelated harness probe. No product route/flag is added. Prove positive live SQLite access through an ordinary committed host command receipt followed by its ordinary receipt lookup, and verify the known state file exists; I2's object route supplies the positive private-object byte read. Retain harness reads as existence controls. This bounds new instrumentation to the missing witness.

### D3 — Process identity, lifecycle and refusal contracts

The inner bridge's status socket is harness authority even though it is inside the private PID namespace. LI-boundary must prove that application/descendant access cannot duplicate that socket through pidfd/ptrace or activate the bridge's debugger. Require an existing restrictive Yama `ptrace_scope` (1–3) and disabled SIGUSR1 inspector activation on the trusted bridge; absence is an explicit capability failure, never a host-wide sysctl change. Host `/proc` read inspection remains usable for exact ownership. Ordinary private-proc fd links to socketpairs cannot be reopened as files, but that alone does not prove protection against descriptor duplication or process-memory access. A4–A7 have native Phase-1 syscall/control receipts for this prerequisite; extended lifecycle and final-source qualification remain open. Older ARM LinuxKit boundary receipts do not qualify it.

At the original planning baseline, `real-web.ts` preloaded `fixture-parent-watchdog.mjs` inside the wrapped Node command. A4–A7 implemented the outer-launcher relocation described below. That watchdog checks host owner/parent PIDs and ancestry through host `/proc`; private PID/proc would make it kill the application at startup. Place ownership supervision in a **trusted outer Node launcher**, outside namespaces, using the existing watchdog and invocation identity helpers. The inner web receives the kernel parent-death/PID-reaper guarantee instead of importing the host-PID watchdog. This is a relocation of supervision, never a watchdog-off fallback.

Implemented module: `web/test-support/linux-isolation-launcher.mjs`, using the same preload/TS import conventions as the existing watchdog. Keep policy construction in typed test support. Use argv arrays, not shell strings. Do not add a native privileged daemon or generic signal service. Implementation refinement: a tiny `linux-isolation-ready.mjs` preload holds Node application main execution until its host identity is verified; its one-purpose acknowledgement descriptor closes before main, so fast probes cannot exit before registration and application code inherits no extra control descriptor.

| Transition / operation | Required outcome and authority |
|---|---|
| Resolve → prepare → spawn | Capability and policy refusal happens before production launch. Outer launcher is direct child, detached group leader and the `RealWeb.pid` host ownership handle. Preserve exact environment tag; capture/register UID, PID, PGID, start time and invocation. |
| Outer spawn → namespace ready → app ready | `bwrap` monitor, reaper and application retain the tag and are visible to host inspection. Obtain bwrap status/readiness metadata through a host-owned pipe; reconcile the application namespace PID with host `/proc/<pid>/status` `NSpid`, current ancestry from the captured bwrap child and exact tag/UID/start-time tuple. Namespace-local or sandbox-reported host PID alone never authorizes signaling. Close readiness/control FDs before app exec unless their narrowly defined lifetime requires otherwise. |
| SIGTERM / SIGINT | The Linux graceful-stop seam replaces `owned-fixture.kill`'s group broadcast: signal only the currently verified outer launcher PID. The launcher forwards once to the verified application subtree while keeping monitor/reaper alive through production `server.ts` drain and preserving its exit code/signal. Do not broadcast TERM/INT to bwrap/PID1 or let outer immediate exit convert graceful shutdown into parent-death SIGKILL. Group SIGKILL remains bounded escalation/containment after the existing grace window. |
| SIGKILL / runner or worker death | Existing outer watchdog and `--die-with-parent` chain terminate the namespace; namespace init death reaps even TERM-resistant or `setsid` descendants. Prove owner/parent loss before containment, including death during readiness/registration. |
| Restart | Kill and verify old owned tree before creating a new boot ID; preserve DB, ports, source/build ID and immutable filesystem policy/roots. Restart cannot widen mounts or clear isolation. Supervisor remains live. |
| Signal inspection | Exact environment tag plus PID/UID/start-time identity, current ancestry and group membership. Preserve `sameProcess`, direct-child checks and mixed/uninspected-group refusal. Signal only individually verified owned processes if current policy permits containment; an anomaly remains failure. No argv-substring ownership, bare PID signaling, sudo kill, `pkill` or broad group guessing. |
| Partial startup / unexpected wrapper exit | Reject readiness, preserve original failure, release any live spawn/readiness wait, close FDs; contain only verified children; aggregate cleanup failure with original cause. No unresolved promise retained until a later unrelated case. |
| Terminal cleanup | Process tree first, pools before containers, then owned containers/roots/locks. Any survivor discovered by exit sweep is a lane failure even when reaped. Replaced/live/foreign roots refuse deletion; caller-shared roots are preserved. |

Read installed `bwrap` monitor source to determine signal forwarding and exit reporting. Outer launcher uses the validated host application identities above for graceful forwarding; before every signal it rechecks the same ownership tuple. Add a narrow verified-process signal helper in `process-invocation.ts` and an injected graceful-stop operation in `owned-fixture.ts` only where necessary; keep ordinary fixture group behavior and all SIGKILL containment guards intact. The wrapper must preserve an observed application outcome and distinguish setup/containment failure, not return the monitor's convenient success. No registration via a transient root→UID-changing process.

Specify a strictly typed internal application outcome `{code, signal}` and a distinct launcher/setup failure; map namespace/host identities before trusting a status record. `OwnedFixture.exited`/`RealWeb.exited` retain the `number | null` compatibility view; their implemented `outcome` exposes the detailed result for wrapped controls. An intentional SIGKILL must not become an unexplained successful exit or lose its observed signal behind a monitor status. Register exit/error listeners before registration/readiness, settle them exactly once, abort readiness on spawn error/early exit/cancellation, and remove timers/listeners on every terminal path. Keep cancellation and original cause through cleanup aggregation.

The [versioned Bubblewrap 0.9.0 option contract](https://raw.githubusercontent.com/containers/bubblewrap/v0.9.0/bwrap.xml) reports `child-pid` in the invoking PID namespace and terminal status in shell encoding; its [exit propagation source](https://raw.githubusercontent.com/containers/bubblewrap/v0.9.0/bubblewrap.c) collapses signal death to `128 + signal`. That cannot distinguish a normal exit137 from SIGKILL. A5 therefore owns the implemented `web/test-support/linux-isolation-child.mjs` inside the namespace: it starts the application as its direct child, observes Node's actual `{code,signal}`, and emits bounded typed readiness/output/exit frames over its stdout pipe to the outer launcher. It has the same RO/RW policy, no host authority and no host-PID watchdog. Application stdout/stderr are separate child pipes relayed as output frames; raw application output cannot impersonate a status frame. The application receives only its intended stdin/stdout/stderr, not the bridge's status or bwrap metadata FDs. Host inspection verifies the bridge from bwrap's captured child identity and the application from bridge ancestry, exact tag/start identity and `NSpid`; a frame alone never authorizes a signal.

Outer TERM/INT targets the verified application subtree while the bridge/reaper remain alive to report drain outcome. After the application terminal, await bridge/monitor closure and prove the namespace empty. If the outer/namespace is killed before a child-exit frame can be observed, record a distinct forced-containment/parent-death outcome and an unobserved application outcome; never invent an application code/signal from shell status. LI-term includes the minimal real-process exit137-versus-SIGKILL discriminating subcontrol, and LI-kill/LI-parent own loss-of-status during containment. Inspect the installed package's FD/status implementation before executing this recipe; no patched bwrap or privileged broker is planned.

`retryFixtureStart` remains the ordinary-fixture retry helper; the implemented Linux branch calls `startRealWeb` directly. Its real refusal/no-retry falsification remains A8. Linux restart must immediately propagate capability, policy, ownership, build and protocol failures, including their typed causes through startup aggregation. Retry only an identified transient bind conflict, within the existing bound and with WARN, after the prior tree is confirmed gone. If the server has no typed bind-conflict evidence, propagate rather than infer it from a generic log string. LI-refusal owns one real invalid-policy restart attempt, proving no widened/unisolated launch and no retry storm; I3 remains the sole continuity owner. Avoid changing the supervisor's unrelated retry policy in this slice.

Existing Linux inspection may need narrow handling for tagged namespace monitors/reapers; qualify `/proc/{stat,environ,status}` visibility and dumpability instead of deleting the UID filter or accepting uninspected entries. The same-UID choice is intended to preserve host authority, but this is a measured prerequisite.

### D4 — Environments, dependencies and provisioning

| Environment | Required identity and runtime | Evidence classification |
|---|---|---|
| Local native Linux/VM, preferred | Ubuntu 24.04 amd64 matching proposed hosted family; ordinary non-root test user; exact Node 24.15.0 and 24.19.0 in separate invocations; frozen pnpm dependencies; namespace/AppArmor capability; host `/proc` inspection; Docker daemon and pgvector/Postgres 16; `bwrap`, GNU coreutils/timeout, Git, C compiler for the inspection-denial fixture | Local Linux driver qualification. Not hosted timing/acceptance. |
| Local disposable ARM64 Linux container, if that is the accessible environment | Record image digest, architecture, kernel, UID mapping, outer seccomp/AppArmor/capabilities and exact Node. All stack processes execute in Linux; Docker daemon connection is outside the web namespace. Run as non-root. Nested user/mount/PID namespace permissions must be explicitly available. | Development evidence; ARM64 and container privilege/virtualization differences remain explicit. Cannot be relabeled amd64 hosted qualification. |
| Proposed hosted isolation | Standard GitHub `ubuntu-24.04` amd64 runner, existing 60-minute job, isolation Node 24.19.0; unprivileged application/test harness; narrowly scoped package/profile setup using existing runner sudo during provisioning only | Hosted qualification only after the owner pushes the qualified candidate and artifacts prove the actual runner image/kernel/capabilities. |
| Darwin regression | Native Darwin ARM64 (and Intel if available), `sandbox-exec`, exact runtime labels, original owning inventory/preflight | macOS regression only. Do not require a new failed Intel run simply to reconfirm historical timeout. |

Use the implemented Linux-only provisioning/capability script `scripts/setup-isolation-linux-runtime.sh`; preserve Darwin `scripts/setup-isolation-ci-runtime.sh`. Pin/record distro package revision, bwrap binary hash and source version after inspecting actual archive availability; the currently published Noble manpage identifies the 0.9.0 package family, not proof of an installed version. No floating Git clone or global npm install. Existing frozen pnpm/runtime packaging stays authoritative. C fixture compilation belongs to test evidence output, not a committed binary.

G-LINUX requires the recorded Ubuntu 24.04 amd64 native/VM environment and both exact Node versions; an ARM64 container may establish development behavior and expose defects, but leaves this target-architecture gate open. Hosted runner image/kernel differences still require A15 qualification. Package installation uses authenticated distro metadata with a recorded exact revision/hash; inspect the matching source and verify its required options before running the namespace capability probe. Setup is idempotent and records each package/profile/capability stage; a second successful invocation does not alter host-wide security policy.

[Ubuntu 24.04 restricts unprivileged user namespaces with AppArmor](https://documentation.ubuntu.com/release-notes/24.04/). First use the installed distribution policy; if insufficient, specify a narrowly scoped profile for the exact trusted `bwrap` executable and verify it. Do not disable AppArmor or alter global namespace sysctls as a fallback. A local container needing outer seccomp allowances requires a scoped, recorded development recipe before use; do not grant blanket `--privileged`, host PID namespace or a host-root mount. If no suitable Linux environment is accessible, stop the dependent execution and request the smallest concrete prerequisite (environment/capability), after independent specification work is complete.

Preflight must separately identify Docker client construction, daemon contact, container create/start, migration and query phases. Reuse `pg-container.ts` and its existing probe budgets; do not change its generic initialization timeout on the assumption that every failure is daemon unavailability. Latest Librarian browser metadata is green; that does not erase the previously unresolved Docker initialization diagnosis.

### D5 — Hosting decision and conditional Linux budget

The macOS contract is satisfied by CI-R9d at its exact pushed source. Retain
both mandatory macOS parts and their combined gate while qualifying Linux.
Linux is a separate S5.3 portability/security deliverable; it is no longer a
prerequisite to close S5.2 or an assumed remedy for the historical Intel timeout.

After G-LINUX, A12 audits the final driver evidence and A13 records one explicit
hosting decision: **retain macOS** (default) or **propose Linux adoption** based
on complete capability, lifecycle, operational and timing evidence. Green
macOS alone neither proves Linux nor justifies deleting Linux controls. A
retention decision can finish the hosting decision with Linux hosting expressly
unqualified; it cannot waive A8–A12 or claim hosted Linux acceptance.

Only a documented adoption decision activates A14's recipe change. Before that
change, amend `test-infrastructure.md`, parent S5.3a and the R9 contract together
without reopening or relabeling S5.2's historical accepted source. Preserve
push triggers, four web legs (24.15.0 and 24.19.0 × 1/2 and 2/2), two
runtime/supervisor legs, browser/image/static jobs and their acceptance.
Prospective Linux isolation remains one serial unsharded Node 24.19.0 job.
Local 24.15.0 qualification proves the driver at the minimum runtime; it is not
a hosted minimum-version claim. The following recipe and finalizer requirements
apply only if A13 selects adoption. No workflow change is authorized by a plan
checkbox or by the earlier Intel failures alone.

Unchanged hosted envelope:

- `timeout-minutes: 60`; provisioning step at most 15 minutes, separate preflight step at most 10 minutes (existing I-CI case limit 360s), production step at most 40 minutes.
- At full-slice start compute `B = min(2340, 3240 - elapsed_since_job_start)` seconds and refuse `B <= 0`.
- GNU `timeout --signal=TERM --kill-after=30s` enforces B; reserve the next 30 seconds for trap completion. Preserve the 3300-second slice/finalization boundary and final five-minute job reserve. Retain original failure/timeout status through cleanup/upload.
- Record setup, preflight, build, each suite, full slice, upload, cleanup and total GitHub job durations. A missing reporter cannot be manufactured from console progress.
- Upload actual preflight/full reports, then always finalize owned resources, then upload diagnostics including final cleanup outcome. Linux cleanup never stops/prunes the shared Docker daemon; remove only invocation-labeled containers/resources. An upload with only preflight is not full-report acceptance.

Linux always-finalizer entrypoint: proposed `scripts/finalize-isolation-linux-runtime.mjs`. Before any child spawn/resource allocation, `runStageAbLane` captures/registers its runner identity and atomically publishes a versioned job-owned invocation reference under the evidence directory with invocation ID, canonical ledger path, ledger directory device/inode and captured runner identity. Failure to publish refuses launch. Finalizer accepts only references beneath that job evidence root (schema, canonical path, no-follow, marker and device/inode checks), validates the original runner's PID/UID/start identity and requires it proved dead before destructive release. An unreadable/live or reused PID and a foreign/replaced reference refuse cleanup; no age-based reclaim. The dead owner's saved identity is authority to inspect its exact-tag invocation, never permission to signal the PID that now occupies its old number. Reuse `releaseInvocation` for exact-tag processes, labeled containers and registered roots; do not reconstruct ownership from console output. Save pre-containment survivor/resource findings and preserve original timeout/failure. A survivor found by finalization is failure even if reaped.

O1 kills a **worker** while the runner survives and owns its release; preserve O1/O1-default and their leak/failure semantics. Extend **O2-runner** instead: after its real runner SIGKILL and proven watchdog self-termination, call the actual finalizer to remove inert owned containers/roots. Retain its frozen title/count and add a sibling resource witness. Its live-runner/reference-replacement refusal cuts happen before the kill or against the disposable reference and restore it; they must leave both invocations untouched. Repeating finalization of already released, verified resources is a no-op success; absent unstarted references produce an explicit no-invocation outcome, not a fabricated report. Real survivor discovery still returns failure. `scripts/isolation-ci-workflow.test.mjs` executes the actual Linux cleanup shell to prove finalization runs when timing/report upload fails and preserves cleanup/timeout exit status; adapt the existing two failure controls to the active platform recipe, retaining their ability to exercise the restored Darwin recipe on rollback. Adapt the existing test rather than adding YAML-text-only coverage.

Publish-reference crash windows are explicit: before publication no child/resource may exist; after publication/before spawn only the inert invocation ledger may exist; after spawn the reference supports exact owned cleanup; after normal release the reference remains verifiable and repeats safely. Register the cleanup trap before any fallible diagnostic write. This protocol is test evidence metadata, not a new product database ledger or migration.

Hosting decision rule: a complete, valid, zero-leak hosted Linux pass at the owner-pushed SHA within B and below 60 minutes, with all unchanged mandatory jobs green on that SHA, qualifies that attempt and permits adopting Linux. Record measured slice and total headroom numerically; no new arbitrary speedup target. One green attempt is not statistical flake-rate proof. Repeated attempts retain all identities/outcomes and are owner-driven pushes; do not dispatch reruns automatically. Enforcement failure, leak, incomplete artifacts or budget overrun means **Linux hosting unqualified**, regardless of passing local measurements.

## Contract and deployment impact audit

| Surface | Expected impact and canonical artifacts / guard |
|---|---|
| Test-support driver and real-web process flow | Change `process-isolation.ts`, `real-web.ts`, trusted Linux launcher; canonical spec is `docs/system-analytics/test-infrastructure.md` (Purpose/entities/state/process/expectations/edge cases/linked artifacts). Expectations name policy guard, kernel primitive, ownership guard and owning test. |
| Test-only selector | Extend existing `MAISTER_TEST_ISOLATION` with `bubblewrap`; unset selects supported platform driver, explicit cross-platform/unknown value fails. `docs/configuration.md`, existing test variable inventory and `web/CLAUDE.md` describe readers. No production env/config path added. |
| CI tools/host recipe | Linux setup script, workflow and test prerequisites in `docs/getting-started.md`; distribution/profile/package authority and environment provenance in test-infrastructure. Tools are harness/CI-only. |
| API/events/errors/auth | **Wire contracts unchanged**: `docs/api/{web,supervisor}.openapi.yaml`, `docs/api/async/{execution-host-events,supervisor-sse,web-runs}.asyncapi.yaml`, `docs/supervisor.md`, `docs/error-taxonomy.md`; no new route, wire identifier, body-controlled locator, status/enum, domain error or grant. The separately authorized promotion correction changes guard precedence: a concurrent claimant observes existing `CONFLICT`, while a terminal follow-up remains `PRECONDITION`; authorization and rework fencing remain mandatory. Existing positive HTTP/Postgres/object controls prove authorized access. Run contract gates to verify this premise. |
| Data | **Unchanged** web Drizzle schema/main and Brain lineages, supervisor SQLite schema/versions, `docs/database-schema.md`, `docs/db/*`/generated ERD. No migration, backfill, new ledger or migration-number reservation. |
| Runtime config/DSL | **Unchanged** `maister.yaml`, Flow DSL, product config readers and runtime ports/credentials. No production web isolation toggle. Test policy is derived from trusted fixture setup, not request bodies. |
| Production deployment | **Unchanged** `Dockerfile`, `compose.yml`, production overlay, `.env.example`, web/supervisor samples, `deploy/maister.env.example`, systemd units. Current same-user units and shared repository boundary remain as documented in `docs/deployment.md`. Test-only bwrap is not a supported production container/user layout. |
| Architecture/security docs | Amend only qualification/test topology statements in `docs/architecture.md` and existing ADR/analytics links where needed; `.ai-factory/ARCHITECTURE.md`/rules/root instruction updates through owner commands only if a concrete assertion changes. `SECURITY.md` vulnerability-reporting policy unchanged. No public Linux-isolation deployment claim. |
| ADR | A multi-component namespace/lifecycle decision merits a new ADR before code. At planning baseline the highest allocation is ADR-192; main lineage ends `0192_scratch_prompt_intent`, Brain `0006_brain_indexing_profiles`. These are observations, not reservations. A1 rechecks current master, allocates then writes the actual ADR body/hub/index before citing its number. Budget a collision/anchor recheck after rebase. No invented next number here. |
| Public docs/UI/analytics | No UI, localization or product analytics schema change. No `site-docs/` update expected; any later public support promise triggers its EN/RU owner workflow. Test-infrastructure analytics and plan evidence change; `workspaces.md` records the authorized promotion guard-precedence correction. |

Dedicated deployment wiring task A3 distinguishes each test-only dependency from production surfaces. Do not add bwrap to the production image or change service users to satisfy a test. `getting-started.md` and `configuration.md` must explicitly say the test driver is not yet supported as production Docker isolation; the separate S5.3 deployment deliverable must provision users/groups, credentials, workspace/context materialization and mounts before that support is claimed.

Contract review is an executable no-delta decision, not a task to add API/DB artifacts gratuitously. A1/A12 inventory the existing web/supervisor route and event shapes, command/fence/receipt/object identifiers, error/auth grants and their actual readers. I2/I3 continue to exercise existing authenticated web HTTP and supervisor command/receipt/object/SSE paths; use the existing execution-host transport and ordinary `/commands/:commandId` lookup for the positive committed-state witness. Harness PID/status pipes are private process-control metadata documented in analytics, not public OpenAPI routes. If a change would introduce a production route, event, error, persisted identifier or grant, stop and amend the docs-first scope before code.

For data, audit `web/lib/db/schema.ts`, `web/lib/brain/schema.ts`, both migration directories/journals/snapshots, and `supervisor/src/{host-state,sqlite-storage}.ts`. Keep main→Brain migrations in real ephemeral PostgreSQL setup, template isolation and pool-before-container teardown. Verify the actual main/Brain migration ledgers and supervisor `PRAGMA user_version` remain compatible; no new column/index/table/schema-version, SQL file, backfill or generated ERD diff is expected. `db:erd --check` verifies the unchanged generated contract; do not run `db:generate` merely to produce a migration. A real data delta invalidates this no-migration decision and requires a revised Phase 0 with current allocations, SQL+journal+snapshot, narrative+domain/generated ERD, fresh/upgrade/rollback semantics and real migration controls before implementing it.

Extend the existing test-infrastructure domain rather than creating a second isolation analytics document. A1 adds one topical Linux specification before Expectations, with mount/authority table, host-versus-namespace process state/action table, launch/probe/restart/parent-death/finalization flows, refusal/cancellation/error outcome rows and these requirement references. Use Mermaid for the lifecycle/sequence where it adds information; an operation-driven state/action matrix may stand in as permitted by R5. Keep the top-level Expectations at at most 12 bullets: preserve the existing nine, then add boundary, lifecycle/refusal and qualification expectations linking to the detailed topical controls. Each names its kernel/guard/test enforcer. Link test-only error types explicitly; do not invent a `MaisterError` to fit a documentation template. Keep ADR rationale in its allocated record, configuration in its reader inventory, and recipe/evidence in their existing owners. Update `system-analytics/README.md` only if its existing index description changes. Search prose, tables, links and maturity tags together after every phase; source on disk may be Implemented while hosted qualification remains pending.

## Requirement traceability and observable expectations

The following IDs are local to this plan/specification, not ADR or migration allocations. A1/A2 carry them into the canonical Linux topical specification with exact owning case titles; this table is the implementation checklist, while the canonical spec owns full contracts. Every requirement has a primary control; subcontrols share a fixture only when they exercise that same responsibility.

| Requirement | Enforcement / observable pass condition | Primary control and task |
|---|---|---|
| LNX-01 private storage boundary | Same frozen policy hides existing sentinel and live SQLite main/available WAL/SHM; actual supervisor can read/use them; wrong errno, absent host file or failed app launch is not denial proof | I1/I4 and separate I-CI; A4/A7 |
| LNX-02 readable/writable scope | Required application/dependency closure reads, exact workspace/runtime writes and I2 HTTP/Postgres/object access succeed; RO application writes return EROFS | I2 positive flow, LI-boundary mount assertions; A4/A7/A8 |
| LNX-03 descendants and escape paths | Fork/exec/setsid descendants retain the same boundary; symlink/traversal/proc-root/fd/ns, inherited authority, new userns and remount/re-entry cannot read protected bytes | LI-boundary; A8 |
| LNX-04 invalid/unavailable enforcement | Real namespace denial and unsafe overlap/alias/hardlink/replaced source refuse before an application-exec witness, retain actionable typed cause and create no usable unisolated app | LI-refusal, existing O-identity for inspection authority; A4/A6/A8 |
| LNX-05 identity and signal authority | Exact tag+UID+PID/start-time/ancestry checks remain mandatory; unreadable, foreign, reused PID or mixed group never receives an unauthorized signal | O-identity; LI-kill sibling assertion only for wrapped tree; A5/A6/A9 |
| LNX-06 graceful outcome | Verified outer TERM/INT forwarding retains monitor/reaper through production drain, reports app code/signal and applies bounded escalation; all startup/readiness promises settle | LI-term; existing O-signal owns runner INT/TERM; A5/A9 |
| LNX-07 parent/KILL containment | Namespace-init/outer/worker/runner death at reached startup/ready barriers kills detached TERM-resistant descendants before any sweep | LI-kill/LI-parent; existing O2 remains ordinary supervisor control; A5/A9 |
| LNX-08 restart and probe lifecycle | Restart cannot widen/clear policy, invalid restart fails once, I3 serves existing history and another turn; probe errors/timeouts close the owned namespace and never become denial success | I3; LI-refusal/LI-parent only missing negative subcontrols; A5/A7/A9 |
| LNX-09 terminal release | Processes→containers→owned roots order and exact reference/runner-death checks hold; detected survivors fail even after reaping, shared/sibling resources survive, repeat finalization is safe | Existing O1/O1-default, O-roots, O2-runner plus real workflow cleanup shell; A14 |
| LNX-10 complete test evidence | Platform discovery/manifest/reporter exact titles agree: Linux55+separate1, Darwin50+separate1; no failed/skipped/todo/errors; validator passes and original50 titles persist | Runner validation controls and complete platform lanes; A2/A10/A11 |
| LNX-11 falsification and runtime provenance | A syntactically valid enforcement-removal mutant exposes real private bytes, restored tree denies them; Ubuntu amd64 both exact Nodes qualify locally with full reports/timings/zero leaks; Darwin stays labeled | Falsification protocol and G-LINUX; A11/A12 |
| LNX-12 hosting and scope | Local qualification precedes prospective macOS-contract amendment and Linux recipe; owner-pushed exact SHA has full valid artifacts/all mandatory jobs within unchanged B/60m; API/data/production deployment remain unchanged | Contract/diff gates, recipe execution, G-HOSTED; A1/A12–A15 |

Coverage acceptance is bidirectional: every requirement above maps to an executed observation, and every added test/subcontrol names its distinct requirement and a defect/guard it can detect. Do not count reruns or shared positive assertions as additional coverage. If a required edge cannot be exercised honestly, keep its task/gate open and record the missing prerequisite; a checklist or source inspection cannot replace its requested real-process evidence.

## Owning inventory and minimal new controls

Baseline source of exact titles: `requiredIsolationCases` in `scripts/run-stage-ab-tests.mjs` at the planning SHA. Preserve every title/observation; table IDs below refer to those frozen titles, not replace them. Snapshot the complete title set during A2 discovery and compare it with both reporters and manifest during A12/A15.

| Owning file (repository relative) | Required baseline cases | Count |
|---|---|---:|
| `web/test-support/__tests__/execution-ab-process-cleanup.integration.test.ts` | O-build-lock; O-exit success/assertion failure/missing reporter/invalid reporter; O-roots; O2-runner; O-signal SIGINT/SIGTERM; O1; O1-default; O2; O-identity | 13 |
| `web/test-support/__tests__/execution-ab-partitions.integration.test.ts` | B4; P1; P2; P3-live; P3-replay; P4 | 6 |
| `web/test-support/__tests__/execution-ab-process-death.integration.test.ts` | D2a; D2b; D4; L1; D3; D1 | 6 |
| `web/test-support/__tests__/execution-ab-isolation.integration.test.ts` | I1 sentinel/live-state denial + harness/supervisor controls; I2 launch/upload/HTTP/Postgres/object/history; I3 isolated web restart and continued turn; I4 unaffected supervisor/private root | 4 |
| `web/test-support/__tests__/durable-workers-boot.integration.test.ts` | flow_node_attempt; agent_turn; scratch_message; R1; R2; R4; R5; R3 | 8 |
| `web/test-support/__tests__/durable-workers-concurrency.integration.test.ts` | D1; D2; E | 3 |
| `web/lib/scratch-runs/__tests__/dispatch-window.integration.test.ts` | S1 launch; direct message; queue; Recover; D-A8; legacy; race; package launch; package message; S3 transport | 10 |
| **Full baseline** | Seven suites; every case passes once | **50** |
| `web/test-support/__tests__/execution-ab-preflight.integration.test.ts` | I-CI: real filesystem driver denial + real reachable/migrated PostgreSQL | **1 separately** |

Existing O-identity has a Darwin assertion and `/usr/bin/sandbox-exec` inspection-denial probe. Replace only its platform-specific probe with a real Linux equivalent while preserving its frozen title, argv-decoy/sibling/PID-reuse/foreign-signal assertions and Darwin branch. Proposed `web/test-support/fixtures/process-info-denied.c` calls `prctl(PR_SET_DUMPABLE,0)`, acknowledges readiness and stays live. An ordinary host inspector must then fail to inspect its environment, refuse registration/signaling, and leave a foreign sibling alive. Captured direct-child teardown contains the denial fixture. Missing proc paths, synthetic throw injection or running the inspector as root do not prove this refusal.

Add **one Linux-only owning suite**, proposed `web/test-support/__tests__/linux-isolation-driver.integration.test.ts`, containing exactly these five controls:

1. **LI-boundary:** fork/exec descendants cannot read private sentinel/SQLite through symlink/traversal/host-proc aliases or inherited authority; actual allowed writes succeed, application RO writes fail; capability/userns/remount/re-entry attempts cannot recover access. One shared fixture and assertion table, no duplicated lifecycle or owner-family cases.
2. **LI-refusal:** absent/unsupported enforcement capability and unsafe/overlapping/aliased/replaced mount policy explicitly refuse launch, create no usable unisolated web and leave no resource. Include typed invalid-policy restart and owned-probe spawn/output/timeout subcontrols under the same reached refusal/release contract. Use a real denied namespace invocation for capability RED: proposed tiny `fixtures/namespace-capability-denied.c` installs a per-process seccomp filter denying namespace-creation syscalls then execs the installed bwrap command. Compile with the same test C compiler; no host-wide policy change. Confirm setup fails before an application-exec witness and all resources are released; a selector-only throw is insufficient.
3. **LI-term:** trusted wrapper forwards SIGTERM to a real production web, production drain completes with the original outcome and a TERM-resistant descendant is gone before terminal sweep. Existing E owns durable-claim semantics; do not clone that family.
4. **LI-kill:** wrapped web SIGKILL/namespace-init death kills a detached/TERM-resistant descendant; exact ownership still protects a sibling. I3 owns restart continuity; this control owns namespace descendant containment.
5. **LI-parent:** worker/runner parent death during namespace startup and after readiness makes wrapper/application/descendants self-terminate without an exit sweep; include one active owned-probe parent-death cut. Use reached readiness barriers and the same fixture per cut; explicit parent-death evidence, no timing-only assumption.

Linux full lane becomes **eight suites / 55 cases**, plus independent preflight 1. Darwin regression remains **seven / 50**, plus preflight 1. Linux-only suite selection must be explicit in `laneSuites`/platform inventory, runner configuration and `requiredIsolationCases`; it must be mandatory on Linux and absent from the Darwin discovery set, not `it.skip` on Darwin or optional on Linux. Unknown platform fails. If implementation needs a different number of meaningful controls, amend this inventory and manifest in the same commit before qualifying; never present the old total as full evidence.

Wire Darwin exclusion and Linux integration discovery when the new file first lands in A4, because the current integration glob discovers every test-support file on both platforms. A10 promotes the completed five controls into the mandatory Linux lane. Intermediate phases run all controls actually introduced at that HEAD alongside the full existing50; they cannot claim the final55 inventory until A10/A11. No todo/skipped placeholders for future RED behavior and no unregistered final acceptance file.

`validateLaneReport` already checks exact owning-suite membership, required title uniqueness, all discovered assertions passed, no pending/todo/runtime errors and `success:true`. It permits additional passing cases, so qualification also compares actual discovered title sets/counts to the explicit platform manifest. Reuse its existing rejection tests; add only the missing mandatory-Linux inventory guard/exact-count proof. Do not duplicate missing-reporter or shard validator tests.

The production fault and nested cleanup fixtures currently start unisolated production web. Preserve their semantics and run their baseline cases on Linux as process/domain regression. Do not claim that every production fixture is namespace-confined; new LI controls explicitly instantiate the wrapped launcher. Do not expand every fault fixture or browser flow to isolation in this slice.

## Validation protocol

For every behavior change A4–A10/A14: execute the discriminating RED before the fix. If current code already meets the assertion, perform one syntactically valid local guard mutation that makes it fail; record why. GREEN is minimal; REFACTOR remains within changed seams and reruns the owning controls. Never commit future-phase RED tests as active failing acceptance.

Record each cycle in existing evidence fields as `{requirementId, owningCase, defectOrMutant, redSourceHash, redReport, discriminatingFailure, greenSourceHash, greenReport, refactorReport, restoredHash}`. Missing driver/capability, syntax failure, a test that never reached its barrier or an unrelated cleanup error is not RED evidence for denied-file enforcement. Use one production fixture with assertion tables and reached barriers for related edge cuts; add pure unit assertions only for stable policy/manifest/reference transformations that real integration cannot isolate economically. Refactor only after the meaningful owning controls are GREEN, using pure immutable policy functions and small single-purpose launch/inspect/signal/release operations. No new generic driver framework, flag-switched helper or duplicated ownership/release logic.

Mandatory falsifications, sequentially in disposable local trees with restoration hashes:

| Guard removed | Required failing observation | Positive control / restoration |
|---|---|---|
| Linux filesystem enforcement replaced with ordinary exec | I1 negative sentinel/live SQLite control fails because actual bytes become readable | Supervisor/unwrapped read remains positive; restore driver and I1–I4 green. This mutation is local-only and never a selectable fallback. |
| Private proc / descriptor or namespace-reentry guard | LI-boundary exposes the specifically targeted private access or privilege escape | Allowed web access remains positive; a syntax/capability boot error is not a killed escape mutant. If a guard is redundant, document its enforcing alternative rather than fabricate a failure. |
| Outer ownership supervision / kernel parent-death chain (remove both independently necessary arms as appropriate) | LI-parent or LI-kill observes live tagged descendant before containment | Foreign sibling stays live; restore and zero-survivor controls pass. Do not require a redundant arm's removal alone to fail. |
| Exact tag/current identity signal guard | O-identity / wrapped foreign-sibling control detects forbidden signaling or refused-identity violation | Restore and sibling survives; no mutation operates against actual unrelated user processes. |

Before any full run, prove discovery with the installed Vitest `list --project=integration` equivalent for the exact selected files. New Linux file family must be included on Linux and explicitly excluded from Darwin's platform suite. Preflight uses `runStageAbLane({slice:"isolation", files:[preflight]})` separately; then execute `pnpm --filter maister-web test:integration:isolation` for the complete platform inventory. Do not mistake a test-name/file subset for full qualification.

At every code-phase exit require full web unit and integration suite GREEN, plus supervisor unit/integration GREEN when the changed fixture touches that tier. Use existing scripts (`pnpm --filter maister-web test:unit`, `pnpm --filter maister-web test:integration`, supervisor `test:unit`/`test:integration`), without another qualification lane on the same host, with the explicit platform configuration. Host load is diagnostic context, not an admission threshold. If aggregates are impractical, execute a frozen complete discovered inventory in bounded serial file groups and prove no missing/duplicate/skipped cases; interrupted aggregates are not green. Keep logs/reports and failure sets. No acceptance quarantine is allowed; unresolved failures block the phase rather than borrow the skill's general quarantine option.

Also require relevant typechecks, read-only lint invocation (avoid unrelated `--fix`), `pnpm test:stage-ab-lane`, `pnpm test:runtime`, `pnpm runtime:check`, `pnpm validate:contracts`, `pnpm validate:docs:all`, and `git --no-pager diff --check`. ADR body/stub/bijection/anchors and relative links must validate. No DB generation/migration needed when the data diff remains empty; if that premise changes, stop and revise scope/allocations before writing a migration.

Evidence for each attempt: tested SHA plus source hash/dirty status, invocation ID, distro/image/kernel/architecture, exact Node/pnpm/dependency versions, bwrap package/binary hash, capabilities/userns/AppArmor/seccomp state, actual PID/UID/PGID/start-time policy, build ID, preflight/full reporter identities, manifest/discovery/title sets, `validateLaneReport` result, timings including build, exits/signals and terminal leak checks. Capture before and after containment separately. A zero count after reaping leaks is not zero-leak acceptance. Never change HEAD/source/build while a lane is live.

A14 changes the lane runner/finalizer after A11, so A11 evidence alone cannot qualify the owner-push candidate. After the last behavioral/recipe edit, A14 repeats separate preflight and the complete Linux55 lane on both exact Nodes in the required local amd64 environment, then Darwin50/preflight on its recorded runtime, plus full applicable phase/static/spec gates. Execute the actual Linux setup/timeout/finalization shell locally with unchanged budgets, including both cleanup failure cuts; preserve the complete Darwin driver regression. A recipe rollback also executes its actual restored cleanup-shell controls. A15 freezes only that final source/recipe, records the resulting commit SHA and source hash, then stops for owner push. A later docs-only evidence commit retains the original tested SHA; any runner/helper/workflow change requires a new local qualification and a new owner-pushed hosted attempt.

## Tasks, ownership and dependencies

Owners are responsibilities/file boundaries, not authorization to start parallel editors. Shared-file changes execute serially; do not revert another contributor's edits. Every task inherits the bounded logging/evidence rules above. A task is checked only after its listed acceptance is evidenced.

Implementation follows repository conventions: strict explicit types, immutable inputs/pure policy functions, imports at the top and English comments. Apply SOLID through single responsibilities and narrow driver/launch/inspection contracts; apply KISS and DRY by reusing existing ownership, build, database and release primitives. Inject only the necessary verified graceful-stop operation; do not introduce flag-controlled multi-mode functions, OOP scaffolding, a second resource ledger or a mock replica of production behavior.

### Phase 0 — Complete specifications and executable environment contract

- [x] **A1 — Freeze source and write the namespace/lifecycle decision.** Owner **Design**. Depends: none. Files: `docs/system-analytics/test-infrastructure.md`, `docs/decisions.md`, newly allocated `docs/decisions/adr-<allocated>.md`, this plan. Re-read live master/source/status and allocation namespaces. Specify D1–D3 as Designed with complete R5/R5a topical state/action and launch/probe/restart/finalization flows, LNX-01–12 traceability, all refusal/cancellation outcomes and named enforcers; allocate ADR from current master only. Execute the API/data no-delta audit against actual readers, schemas and both migration lineages before declaring it unchanged. S5.2 hosting text stays macOS until A13. **Acceptance:** internally consistent R5 analytics, actual ADR body/hub/index, unchanged product API/DB premise and truthful 42/45/open markers. **Logging:** INFO source/allocation/spec gates; ERROR contradictions; no runtime logs introduced.
- [x] **A2 — Freeze the full platform inventory and RED scenarios.** Owner **Qualification**. Depends: A1. Files: test-infrastructure normative tables, this plan; read runner/manifests/suites, no active failing test committed yet. Enumerate all exact 50 titles + I-CI, proposed five Linux titles, runner discovery and overlap mapping; identify I1/I4 supervisor-positive witness, probe ownership/output/timeout paths, O-identity Darwin dependency, watchdog host-PID incompatibility and O1-worker versus O2-runner finalizer ownership. Map source-replacement, inherited environment/FD, retry and terminal-outcome edges to the existing/new primary controls. **Acceptance:** each new behavior has one owning control, real RED trigger, actual runner project and falsification; Linux planned 55+1/Darwin50+1 consistent. **Logging:** INFO platform/file/case counts; ERROR missing/duplicate owners.
- [x] **A3 — Deployment wiring and local Linux prerequisite contract.** Owner **Environment**. Depends: A1, A2. Files: `docs/getting-started.md`, `docs/configuration.md`, test-infrastructure; inspect Docker/compose/env/systemd surfaces. Define package/profile/compiler/runtime availability, non-root harness, nested-container restrictions and source for pinned binary; enumerate which production files have no delta and why. Request a concrete Linux environment only if inaccessible; do not guess its capabilities or change host security. **Acceptance:** exact local/hosted recipes distinguish architecture/privileges; no production support overclaim; test-only dependency wiring and production-Docker gap explicit in both operator docs. **Logging:** DEBUG phase diagnostics, INFO environment provenance, ERROR required capability absent; no secrets.

**Phase-0 exit:** specifications complete and internally consistent, every operation/refusal/failure/cancellation row defined, deployment/spec impact matrix complete, ADR allocated without collision; docs/contracts green. No API/ERD changes to invent. Commit checkpoint C1.

### Phase 1 — Driver, trusted launcher and platform portability

- [x] **A4 — Implement the immutable Linux mount policy and real access driver.** Owner **Harness**. Depends: A1–A3. Files: `web/test-support/process-isolation.ts`, new `web/test-support/linux-isolation.ts` only if separating typed policy construction is needed, Linux owning suite's first controls, `web/vitest.workspace.ts` for immediate Linux discovery/Darwin exclusion. Execute the real negative-access assertion against an ordinary, unwrapped baseline Node control process before implementation: the existing sentinel/state bytes are readable and the denial assertion fails. This is a local RED control only, never an available driver/fallback; current missing-driver failure is not sufficient. Implement selected namespace policy, source/destination identity revalidation, explicit inner environment/FD authority, required mount semantics and typed capability/policy errors. Preserve wrap output and Darwin profile behavior; wire discovery when the first new file lands, with only actually implemented controls active. **Acceptance:** same policy gives specified denial/allowed read/write, invalid overlap/capability refuses before launch, no unisolated fallback; no new OOP framework. **Logging:** DEBUG policy roles/digest/options, INFO selected driver, ERROR capability/policy cause.
- [x] **A5 — Implement trusted outer supervision and signal/exit propagation.** Owner **Harness**. Depends: A4. Files: new `web/test-support/{linux-isolation-launcher,linux-isolation-child}.mjs`, `real-web.ts`, `owned-fixture.ts`, narrowly required verified-process signal helper in `process-invocation.ts`; existing watchdog only if needed. Capture RED for private-proc watchdog failure, real SIGTERM/parent-death behavior and shell-status loss of exit137 versus SIGKILL; implement the bounded typed child-status bridge; move preload outside namespace, close FDs, derive host application identity through bwrap status/NSpid/ancestry and exact tags. Replace Linux graceful group broadcast with verified outer-PID signaling and forwarding that retains monitor/reaper until drain. Keep existing grace/SIGKILL containment and fresh build verification. Freeze isolation through restart, fail capability/policy/ownership errors immediately and allow only proved bounded bind-conflict retries. Preserve existing numeric exit compatibility while providing verified code/signal outcome to the owning controls; settle exit/error/readiness exactly once. **Acceptance:** D3 table holds through readiness, exit, TERM/KILL, parent death and restart; app outcome retained; startup waits explicitly released on all error paths. **Logging:** INFO each lifecycle transition/boot/host identity/exit, WARN signal refusal, ERROR readiness/forward/cleanup failures.
- [x] **A6 — Preserve Linux exact ownership and port O-identity.** Owner **Ownership**. Depends: A5. Files: `process-invocation.ts` only if measured monitor semantics require a narrow change; `execution-ab-process-cleanup.integration.test.ts`, new `fixtures/process-info-denied.c`. Execute real dumpability-denial RED and all O-identity controls; retain Darwin sandbox-exec behavior and direct-child/foreign/mixed-group refusals. **Acceptance:** no relaxed environment/UID/start-time/group checks; namespace monitors inspectable; live unreadable proc refuses; direct captured child contained; foreign sibling untouched. **Logging:** DEBUG inspected identity metadata; WARN refusal reason; ERROR loss of inspector authority. Compiler/readiness failures are actionable.
- [x] **A7 — Wire shared policy into probes, I1–I4 and Linux prerequisites.** Owner **Harness/Environment**, one sequential edit owner. Depends: A4–A6. Files: `execution-ab-preflight.integration.test.ts`, `execution-ab-isolation.integration.test.ts`, `real-web.ts`, a focused test-support helper generating the invocation-owned supervisor preload if needed, proposed Linux setup script; `configuration.md`/`getting-started.md` as-built prerequisites. Give probes and production web one frozen policy with explicit repo/worktree/runtime/app mounts; register probes under their invocation, use the trusted outer watchdog, validate one bounded typed result and release every timeout/error/parent-death path; implement D2's actual-supervisor sentinel digest witness through the existing fixture env seam and ordinary committed receipt/lookup witness for SQLite (no new production test route). Keep build outside namespace. **Acceptance:** preflight separate; I1 denied existing live SQLite main/WAL family, I2 allowed access, I3 same immutable policy restart/continued turn, I4 registered real-supervisor read/state/health, probe timeout/output/spawn failures never count as denied-file success; default fault fixtures unchanged. **Logging:** INFO preflight subphase/probe/build/driver/platform results, ERROR original Docker/client/container stage and isolation causes; do not enlarge budgets.

**Phase-1 exit:** RED/GREEN/refactor evidence, named controls runnable/green, full applicable suites and static/spec gates GREEN; Darwin preflight and original50 regression preserved. A4–A7 land together if launcher/policy types are mutually required, never commit a tree that was not qualified. Commit checkpoint C2.

### Phase 2 — Falsification, complete inventories and local qualification

- [x] **A8 — Complete boundary/escape/fail-closed controls without lifecycle duplication.** Owner **Qualification**. Depends: A7. Files: new Linux owning suite, minimal `web/test-support/fixtures/` descendant/escape fixture(s), `fixtures/namespace-capability-denied.c`, I1/I4 assertions if missing. Implement LI-boundary/LI-refusal with reached barriers, RO/RW controls, fork/exec, aliases, proc/FD and capabilities; add the bounded known-file device/inode/link-count guard and deliberate hardlink/replaced-source/nested-mount subcontrols. Exercise ambient environment/FD refusal, invalid-policy restart and owned-probe error/timeout cleanup without duplicating I3 continuity. Before changing code, rerun the existing two-case owner on the current source in the qualified Ubuntu environment. Resume the invalid-policy restart retry falsification that previously never reached its assertion. Add reached cancellation subcontrols within LI-refusal for database acquisition, build, policy preparation and web readiness: `linux-lifecycle-fixture.ts` currently publishes cleanup only after PostgreSQL acquisition and checks `closing` only after the build. Prove cleanup is registered before resource acquisition, late completions are joined/reclaimed, no supervisor/build/web launches after cancellation (including directory and supervisor handoffs), and the original cause survives cleanup. No new top-level title or production test flag. **Acceptance:** all D2 enforcement claims observed; known exported-inode prerequisite rejected without whole-tree scanning; real namespace denial refuses before app exec; no kernel escape success; unchanged public access positive. **Logging:** INFO assertion-role/errno/outcome, DEBUG escape type without private bytes, ERROR unexpected read/write/exec success.
- [x] **A9 — Complete wrapped lifecycle and cleanup controls.** Owner **Qualification**. Depends: A7, A8. Files: Linux owning suite and focused nested launcher fixtures; `real-web.ts`/launcher for RED-first defects found. Implement LI-term/LI-kill/LI-parent against actual namespace wrapper, startup death, one active-probe parent-death cut and TERM-resistant/setsid descendant; foreign sibling witnesses, exact code/signal outcomes and terminal leak scan. **Acceptance:** D3 holds with no exit-sweep dependence for parent-death claims; detached descendants die; observed application codes/signals retained and unobserved containment outcomes distinguished; containment discovery fails lane. **Logging:** INFO readiness/signal/parent-identity/death/leak counts; ERROR leak/refusal anomalies. No broad fault-harness isolation expansion.
- [x] **A10 — Register mandatory platform manifests and discovery.** Owner **Lane**. Depends: A8, A9. Files: `scripts/run-stage-ab-tests.mjs`, existing runner test file, `web/vitest.workspace.ts`, test-infrastructure inventory. Preserve original50 titles; promote the completed Linux suite/five required titles into the mandatory lane, preserving the platform discovery/exclusion wired in A4, with unknown-platform refusal, serial concurrency and no sharding. Keep Darwin's `laneSuites.isolation`, `isolationPartFiles`, `isolation-ci-evidence.mjs` and 19/31 combined receipt contract intact. Introduce platform-specific full-lane selection only after all five Linux titles actually pass; Linux `--part` must refuse, and Darwin aggregate validation must never accept a Linux owner. Extend the existing executable runner/receipt controls, including unknown-platform and dropped-Linux-case REDs. **Acceptance:** Linux55+preflight1; Darwin50+preflight1; discovery/report/manifest agree; dropped Linux owner or case makes validation fail; existing web shards unchanged. Reuse existing report-rejection tests. **Logging:** INFO exact selected platform/suites/cases/invocation; ERROR manifest/report drift.
- [x] **A11 — Falsify enforcement/ownership, restore and qualify local Linux.** Owner **Qualification**. Depends: A10. Files: no new report artifact in git; evidence fields in this plan and existing owning plans/analytics, corrections in owned files only after new RED. Execute falsification table then restored full Linux55 lane and separate preflight on each exact Node 24.15.0/24.19.0; one fresh build per invocation. Execute Darwin50/preflight and full applicable suite/static gates; keep source frozen and platform labels. Freeze the current continuation source, not the older C2 or CI-R9d tree, including all merged harness/runtime edits. Retain separate receipts for both Nodes and for Darwin full-lane or authorized 19/31 parts with independent preflights; do not borrow the hosted checkpoint for modified source. **Acceptance:** `validateLaneReport` success, complete exact title sets, timing records and zero leaks before containment; source/restoration hashes verified; actual Ubuntu 24.04 amd64 local environment meets D4 for both Nodes. ARM64 container development results remain separate and cannot close G-LINUX. **Logging:** INFO mutant/restored source/runtime/report identity/timings; ERROR invalid mutant or incomplete/leaked lane. No hosted qualification inferred.

**Phase-2 exit / G-LINUX:** actual kernel boundary, lifecycle/refusal/cleanup and minimum/current Node driver gates qualified on local Ubuntu 24.04 amd64; complete local evidence retained; full applicable suites green. If Linux capability fails, stop before CI migration. Commit checkpoint C3.

### Phase 3 — Driver audit, explicit hosting decision and conditional migration

- [x] **A12 — Audit qualified driver and freeze the decision candidate.** Owner **Design/Qualification**. Depends: G-LINUX. Files: this plan and canonical test-infrastructure as-built Linux sections; no CI change yet. Re-derive API/DB/config/deployment impact from diff against the audited route/event/auth readers, main/Brain schemas/journals/snapshots and supervisor schema-version sources; reconcile every LNX requirement with exact-case/subcontrol evidence and all enforcement/lifecycle claims; adversarially review every corrective cycle. Recheck master/ADR allocations; if rebasing changes tested source, rerun affected controls and complete qualification before claiming candidate frozen. **Acceptance:** review findings resolved RED-first; no widening mounts/weakening assertions; no unqualified source/architecture substitution. **Logging:** INFO source/spec/case audit; ERROR unresolved gap, no new generic report task.
- [x] **A13 — Decide hosting from qualified Linux and accepted macOS evidence.** Owner **Design**. Depends: A12. Files: this plan, `docs/system-analytics/test-infrastructure.md`, parent S5.3a and R9 contract; allocated ADR metadata only if the actual decision requires it. Default to retaining the accepted two-part macOS recipe. Compare complete Linux local evidence and its prerequisites with the accepted macOS reports; record capability/maintenance/budget trade-offs, not an assumed speedup. If retention is selected, record A14 as not applicable by this decision (not implemented) and keep Linux hosting unqualified. If adoption is selected, apply D5's prospective contract amendment before A14. **Acceptance:** one explicit evidence-backed decision; all active contracts agree; S5.2 stays accepted at its original SHA, parent43/45 and S5.3/S5.4 remain open; no Linux hosted claim from local proof. **Logging:** INFO decision/source/evidence; ERROR contradictory status. Commit C4a before any CI code.

- [ ] **A14 — Conditionally migrate qualified isolation hosting to standard Linux.** Owner **CI**. Depends: A13 explicitly selecting adoption. If A13 retains macOS, this task is not applicable and no recipe/finalizer implementation is required; preserve that disposition without an implementation checkbox. Files: `.github/workflows/ci.yml`, Linux setup script, new `scripts/finalize-isolation-linux-runtime.mjs`, invocation-reference publication in `scripts/run-stage-ab-tests.mjs`, existing cleanup suite's O2-runner control and `scripts/isolation-ci-workflow.test.mjs`; preserve O1/O1-default semantics and the Darwin provisioning script; adapt cleanup-shell controls by the explicitly configured workflow platform so a rollback is testable. RED existing workflow/script controls for wrong runtime/manifest/budget or borrowed cleanup, actual cleanup-shell timing/upload/cleanup failure cuts, plus real forced-runner-death finalization through O2-runner; GREEN standard ubuntu-24.04 setup and GNU timeout using unchanged formula, D5 reference/runner-death validation and reused `releaseInvocation`, safe shared-Docker finalization and actual artifact upload ordering. Validate the actual setup/timeout/finalization recipe on local Ubuntu 24.04 amd64 without dispatching hosted runs. After the last edit, repeat complete Linux55 plus independent preflight at both exact Nodes, Darwin50/preflight and full applicable phase gates; publish-reference crash windows, live/reused/unreadable runner refusal, replaced ledger/reference refusal and idempotent re-finalization must pass. **Acceptance:** both Node versions/four web legs/two runtime-supervisor legs remain on push; serial55 inventory + independent preflight;60-minute job/B unchanged; no shared daemon stop/prune; original failure preserved and survivors fail even after containment; full applicable suites/static/spec gates GREEN. **Logging:** bounded provisioning DEBUG, INFO capability/version/phase/timing/upload/cleanup, ERROR missing report/capability. No `set -x` over environment credentials.
- [ ] **A15 — Commit final driver/hosting disposition and verify published changes.** Owner **Qualification**; hosting adoption remains owner-pushed. This continuation authorizes local commits only; the earlier handoff publication permission is historical. Depends: A12/A13 and, only for adoption, A14 with C4 validation. Files: this plan and existing parent/R9/canonical status fields. Reconcile every LNX requirement with the final source and reports; commit locally by the qualified checkpoints. For retention, record complete local driver qualification and the accepted macOS hosting decision separately; Linux hosting remains unqualified, and no Linux workflow is published. For adoption, present the final candidate to the owner and stop for owner push, then independently verify exact-SHA Linux55/preflight, all four web/two supervisor reports, remaining mandatory jobs, capabilities, timing/headroom and zero leaks under D5. Any subsequent pushed code requires its own applicable regression evidence; the old CI-R9d receipts do not qualify it. **Acceptance:** explicit driver qualification and hosting disposition with no borrowed source/platform evidence; S5.2's accepted historical checkpoint is preserved, S5.3/S5.4/C11 stay open for their other deliverables. Missing/failed Linux hosted evidence never becomes acceptance. **Logging:** INFO source/run/artifact/validator/headroom/decision; ERROR mismatch/incomplete/failure. No unsolicited publication, shared-branch merge, manual dispatch or rerun; the earlier Mac handoff push is historical and grants no current publication authority.

**Phase-3 exit:** complete G-LINUX and A12 audit, followed by either recorded
retention of accepted macOS hosting (Linux hosting still unqualified), or
G-HOSTED for the owner-pushed Linux candidate. Failed or missing qualification
is an open gate, not a completed disposition. S5.2 historical acceptance is
not erased by an unqualified Linux candidate.

## Current refinement and execution frontier

A8–A11 are qualified on native Ubuntu 24.04 amd64 and Darwin Apple Silicon,
on exact Node 24.15.0 and 24.19.0. The final receipts below supersede earlier
open compiler, PostgreSQL storage, SQLite throughput and proxy transport
findings. All failed and falsification attempts remain attributed to their
original sources; no earlier hosted result qualifies changed code.

The qualification keeps Linux55 and Darwin50, separate preflight, serial
isolation, fresh production builds, complete titles and zero leaks. R20 keeps
its original 360 rows/s threshold, default budgets, duration and durability.
Host load and power are diagnostic context under the owner's explicit
amendments. A12/A13 are complete; A15 records the local disposition. Hosting continues
on the accepted macOS 19/31 recipe, with Linux hosting unqualified.

## Final native qualification

Evidence remains outside the repository. Darwin root:
`/private/tmp/maister-s53a-closeout-20261026`; Ubuntu root:
`/tmp/maister-s53a-ubuntu-qlpo_wtn`. Each owner retains its command, exact Node,
source files before/after, original log, JSON report and invocation ledger.
`ready-final-inventory-audit.json` on each host checks all discovered files,
exact isolation titles, no skipped/pending/todo/runtime-error cases, one fresh
build per isolation owner, serial concurrency and clean zero-leak sweeps.

Final non-Markdown source SHA256: `fec95696e8212eb616c332fdf4f8ce1f9145fc517375ba346892ed70ae6172d1` (`ready-candidate-source.json`),
identical on both hosts. Runtime/R20 candidate SHA256:
`3687f024b3595db3ff5bde9c5ec3ebb67b41b3af46114fb6ae3b08c601d5ca31`.
The alloc-to-hop file-hash comparison permits exactly two changed files:
`web/test-support/supervisor-fault-proxy.ts` and its owning integration test.
R20 explicitly uses direct transport without that proxy; every production
source, dependency, runner, R20 fixture and assertion is byte-identical.
Its `alloc-r20-*` receipts retain their original source identity rather than
being relabelled as executions of the later fixture tree. All proxy-dependent suites were rerun with the corrected proxy. The intermediate
`floor-*` source additionally changes only two owning test files: the
supervisor ACK-floor control and a blank line in the proxy control. Production
and test-support runtime are byte-identical between hop and floor candidates.

The audit verifies each receipt against its original complete source map.
The final ready source changes only
`web/lib/scratch-runs/__tests__/scratch-idle-resume.integration.test.ts` from
floor: the owning C4 control now observes canonical host readiness after its
real outage and restart. Every production, dependency and test-support runtime
file is unchanged. Fresh ready group21 on both Nodes and platforms qualifies
that correction; the failed Ubuntu floor group21 (267/268) remains failed.

Ubuntu retains hop preflight/isolation/bounded/publish on 24.15 and floor
owners for those four gates on 24.19. Other Ubuntu 24.15 owners use floor except
ready group21; remaining Ubuntu 24.19 owners use ready. Darwin retains hop
web/isolation owners, with floor full-supervisor and four-case proxy controls
on both Nodes and fresh ready group21 on both Nodes. Mac batch06
on 24.15 is replaced by `floor-web-batch-06-repeat-24150`: an accidental
formatting lint temporarily edited files during the original invocation, so
that earlier reported pass is explicitly invalid even though all files were
restored exactly. No accepted receipt is relabelled to a later source.

The final guarded cleanup verifies the temporary Docker daemon identity and
an empty container list before stopping its exact user service. The service
is now inactive; shared Docker was untouched. Its first nonempty-daemon
refusal remains in the original log; a later verified empty-daemon cleanup
passed (`ready-owned-docker-cleanup.json`).

### Isolation and full inventory

| Platform / Node | Isolation | Fresh build | Independent preflight | Full integration files / cases |
|---|---|---|---|---|
| darwin / 24.15.0 | 50/50, 573.0s | `dvIj-7acBXFbshqRVP3IO` | 1/1 | 595 / 5248 |
| darwin / 24.19.0 | 50/50, 566.0s | `8c0SCCtbuUY7f-H3nXEff` | 1/1 | 595 / 5248 |
| linux / 24.15.0 | 55/55, 1515.8s | `6ea1HNF_RDMX4ICTbv1OX` | 1/1 | 596 / 5253 |
| linux / 24.19.0 | 55/55, 1506.1s | `w99hxP88K24GYdQ016wXj` | 1/1 | 596 / 5253 |

Each platform/Node also passes web unit 9222/9222 and supervisor 495 unit +
319 integration, with bounded-output 26/26 and publish 10/10 separately owned.
The full integration audit reconciles each file exactly once across ordinary
batches, isolation, preflight, R20, scheduler-clock and host-span-load; both
Node versions have identical complete case identities on each platform.

Typechecks, runtime checks, CI runner/receipt controls, contract and documentation
validation pass. Read-only lint exits zero with seven nonblocking formatting
warnings (five in unchanged portions of the PostgreSQL fixture and two in
SQLite owning tests); the qualified executable source remains byte-identical.
The first CI-script validation was blocked by sandbox Unix-socket `EPERM`;
its unchanged-code rerun with the required host access passes. Both attempts
retain their original logs.

### R20: unchanged throughput and durability gates

| Platform / Node | Rows/s (minimum 360) | RSS growth (maximum 25%) | Canonical settlements | Leaks |
|---|---|---|---|---|
| Darwin / 24.15.0 | 395.52 | 1.28% | 9/9 | 0 |
| Darwin / 24.19.0 | 393.85 | 0.27% | 9/9 | 0 |
| Ubuntu / 24.15.0 | 361.08 | 24.56% | 9/9 | 0 |
| Ubuntu / 24.19.0 | 384.64 | 16.09% | 9/9 | 0 |

All four complete owners exit 0 with unchanged source and their full load
window, lag/ACK/pressure/refusal assertions and canonical settlement gate.
Ubuntu 24.15 has narrow measured headroom; this is acceptance of those exact
runs, not a statistical throughput or flake-rate guarantee. No threshold,
window, timeout, runner size or production durability mode was weakened.

### Corrective cycles and falsification

- Darwin held-read fixture uses portable POSIX address conversion; watchdog
  selected-owner read failure contains only wholly inspected owned groups.
  The native EACCES control and foreign sibling witness reject the unsafe
  signalling mutant; no foreign process authority is widened.
- Test PostgreSQL autovacuum scheduling reclaims the existing 512 MiB tmpfs
  promptly. Storage size and durability remain unchanged.
- SQLite reuses prepared statements and connection-local TEMP parser credits
  and live-file progress while durable accepted wallets, reservations,
  events and ACKs retain WAL/FULL. Raw/semantic text pairs commit atomically
  before listeners; failed append rolls back both rows and credit spend.
  Physical admission and the storage-failure latch remain synchronous.
  Split/partial commit, stale admission, physical guard, latch and credit
  cascade mutations fail reached real SQLite controls.
- PostgreSQL inserts a typed JSON recordset with exact bigint decimal strings
  and existing stream/run locks, constraints and result classification.
  SQL-only transactions allocate relational registries lazily over the same
  guarded session; nested savepoints remain isolated. Real PostgreSQL REDs
  observe two unused registries and 4000 temporary entry pairs; eager/old-path
  mutants fail, and restored 54/54 focused controls pass both Nodes/hosts.
- The resumed-run unit fixture imports the real schema before its explicit
  override, restoring the full 9222-case project without changing production.
- Final Linux55 initially failed 54/55 before E's prompt admission. The proxy
  forwarded upstream keep-alive 72 s while its own server used 5 s. Real HTTP RED
  observes 72 vs 5; the request-header mutant forwards 99 s; restored 4/4 controls
  pass both Nodes. The corrected proxy strips hop-specific and Connection-
  nominated headers for ordinary, held and SSE paths while preserving body
  and end-to-end metadata. Fresh full isolation and full inventories above
  qualify the restored source; the failed receipt remains
  `alloc-isolation-24150`, not a passed attempt.

- The ACK-floor integration fixture now establishes actual server-side
  backpressure and a lagging cursor before pruning. The original tiny payload
  could completely drain on Linux, leaving a correctly live subscriber and
  an invalid timeout expectation. The real RED observes zero buffered bytes;
  the close-reason mutant reports protocol instead of floor. Restored 3/3
  controls pass both Nodes and final full-supervisor 319/319 integration
  confirms the fixture. Only the test payload and causal witnesses changed;
  runtime, durability, budgets and existing timeout remain unchanged.

- The scratch C4 fixture observes the stopped host through the real registrar
  and confirms its canonical unavailable row. A restarted process alone does
  not refresh that row; the manual slot gate correctly leaves it queued.
  The fixture now registers the new boot before invoking the gate and asserts
  that the exact queued run is promoted. Behavioral RED and a mutant omitting
  only this registration return a null promotion; restored full group21 passes
  both Nodes and platforms. No production code, timeout or assertion was
  weakened. An initial control read the registrar's pre-write row snapshot;
  that setup failure is excluded from behavioral/falsification evidence.

`alloc-falsification-audit.json`, `proxy-hop-mutation.json`,
`ack-floor-mutation.json`, `scratch-readiness-mutation.json` and the source-
labelled RED/GREEN/mutant/restored directories retain executed evidence.
The initial proxy control rejected its request before reaching the network,
and one mutation setup asserted before editing: those two attempts are
explicitly invalid controls and are excluded from falsification claims.

## Qualified driver audit and hosting disposition

A12 reconciles LNX-01–12 with the complete source-labelled evidence above.
Production filesystem denial, supervisor positive witnesses, namespace escape
refusals, immutable restart policy, cancellation handoffs, signal identity,
parent death and cleanup all retain their original required titles and live
foreign witnesses. The final review resolves the SQLite/PostgreSQL allocation
and transport/fixture corrections, including canonical restart readiness in
the scratch C4 owner, through reached behavioral RED, valid
falsification and restored GREEN. The full inventory audit rejects omissions,
duplicates, skips, source drift and leak containment presented as success.

| Requirement | Final qualification and disposition |
|---|---|
| LNX-01 | I1/I4 and independent preflights retain actual private-storage denial and the supervisor's positive witness on both exact Nodes. |
| LNX-02 | I2 and LI-boundary pass required application reads, exact workspace writes and read-only refusal. |
| LNX-03 | LI-boundary passes descendant, alias/proc/FD/namespace and privilege escape controls with the frozen mount policy. |
| LNX-04 | LI-refusal and O-identity pass capability, policy and inspection refusals before application execution. |
| LNX-05 | O-identity and LI-kill retain identity-bound signals and live foreign witnesses; the selected-reader correction also rejects its unsafe foreign-signal mutant. |
| LNX-06 | LI-term and O-signal retain production drain and distinguish application code 137 from SIGKILL. |
| LNX-07 | LI-kill/LI-parent pass reached startup and running lifecycle cuts with zero survivors before containment. |
| LNX-08 | I3 retains continuity; LI-refusal covers immutable restart and joined acquisition/handoff cancellations without later launches. |
| LNX-09 | Existing local release and runner-death controls pass. The prospective Linux hosted finalizer is not applicable under A13 retention. |
| LNX-10 | Both complete native inventories, exact titles, separate preflights, fresh builds, serial isolation and zero-leak sweeps pass the final four-source audit. |
| LNX-11 | Original enforcement/lifecycle falsifications and new SQLite/PostgreSQL/proxy/ACK/readiness controls retain valid RED, mutants and exact restoration. Both Nodes and platforms have complete final evidence; runtime-identical R20 receipts retain their original identity. |
| LNX-12 | A13 retains accepted macOS hosting. Linux qualification is local only; adoption, recipe migration and hosted acceptance are not claimed. |

The diff introduces no public HTTP/status/request/response changes, SSE payload
changes, new grants, configuration variables, CLI flags, dependencies, persistent
schema or agent grammar. SQLite TEMP accounting is connection-local; durable
accepted wallets, events, reservations and ACKs retain the existing schema and
WAL/FULL. The event-plane analytics describe the implemented mechanisms.
Runtime parity requires no new production binary, mount, port or compose
setting. Linux test prerequisites remain the documented native Ubuntu/bwrap
contract; production-container isolation is not claimed. Config-to-DB SET/CLEAR
symmetry is not applicable because no such mapping changes. Architecture,
rules and roadmap boundaries remain unchanged; no new ADR allocation is needed.

A13 selects **retention of the accepted macOS 19/31 CI recipe**. Native Linux
qualification establishes the local driver contract, including both exact
Nodes, but does not establish a hosted runner's kernel/capabilities, package
provisioning, artifact finalization or total job budget. The local timings do
not imply a hosted speedup. Retention preserves the already accepted hosting
contract without introducing an unqualified operational dependency. A14 is
**not applicable by this decision**, not implemented or checked complete.
Linux hosting remains unqualified. S5.2 retains its historical exact-SHA
acceptance; new local receipts do not relabel that CI result.

The remaining parent work is S5.3's separate-user deployment/browser lifecycle
matrix and the S5.4/C11 final acceptance audit, including its recorded open
findings. Parent completion remains **43/45**. Current authority is local
commits only: no push, PR, shared-branch merge or hosted dispatch.

Qualified C3 implementation commit: `34a9ebd9bf061301ad149eb86e9b471e81bf7df4`. Its non-Markdown tree matches
the final qualified source hash above; later disposition commits change
documentation only.

## Execution evidence

The following records preserve earlier attempts and their status at execution.
The final native qualification above supersedes their open A11/C3 findings;
failed reports remain failed and historical publication permission grants no
current push authority.


### A8 — Ubuntu continuation, restart falsification and database cancellation

Source prerequisites are present on `codex/s53a-qualification`: `357ae6cfd`
and HEAD `8ad23a5fcf258a136960846fb1748e5ba908fe52`. The initial worktree was
clean. All receipts below live outside the repository under
`/tmp/maister-s53a-ubuntu-qlpo_wtn/`; each execution directory contains the
command, patch hash, timing, full log, owning invocation ledger and Vitest JSON.
No A8 completion, C3 completion, fresh Darwin or Linux hosted qualification is
claimed.

- Host: Ubuntu24.04.4 LTS, native amd64 KVM VM, kernel6.8.0-147-generic,
  ordinary UID/GID1000. Docker29.5.3 is accessible through the user's rootless
  Unix socket. Real SQL reports PostgreSQL16.14/x86_64; main190 and Brain6
  migrations execute in disposable containers. Git2.43.0 and GCC13.3.0 are
  available. Official Node24.15.0 and24.19.0 archives match their published
  SHA256 inventories; frozen pnpm11.6.0 installation succeeded without a
  lockfile change. Runtime receipts: `environment-gate.json`,
  `host-proc-witness.json`, `node-downloads.json`, `postgres-version-witness/`.
- Installed non-setuid Bubblewrap0.9.0-1ubuntu0.3 matches the authenticated
  Ubuntu package archive (binary SHA256
  `e318903862396f96de3df57264e0158682b952fd3fb53ac23d876413e7b30f71`).
  Upstream0.9.0 plus the distro patch series were inspected. The existing
  narrow AppArmor profile matches the repository profile byte-for-byte;
  Yama remains1 and restricted unprivileged user namespaces remain enabled.
  Both exact Nodes pass actual required namespace, private proc, dropped-cap,
  NoNewPrivs and `--disable-sigusr1` probes. Host process/tag/start-time
  inspection passes. The unmodified setup script reaches its redundant
  AppArmor reload but exits1 because `sudo -n apparmor_parser` needs a password;
  this provisioning-command refusal is retained separately from the successful
  runtime capability observations. No host security setting was changed.
- Baseline complete owner: `a8-baseline-linux-owner-24150/`, invocation
  `523ee838-328f-40ff-8c80-1cadf114ec6b`, 2/2, 192.81s; fresh build126.95s,
  exact title set validated, all recorded sweeps report zero leaks.
- Valid restart retry falsification: `a8-restart-retry-mutant-24150/`,
  invocation `5288d719-87f9-4dd6-bc05-0e2aa92cafd7`, 180.78s. Removing only
  the Linux direct-start branch reaches LI-refusal's assertion: **20 attempts
  instead of1**. LI-boundary passes; cleanup reports zero leaks. Mutant
  `real-web.ts` SHA256 is
  `194e91945a38958d7859c3ea7ebdf1c99081cdc23cf9ab342c9d167d83342859`;
  restored bytes match
  `4fee19922fb14bf6de28a3e93addc598da89336be0995123c228aac75a63d2dd`.
  Restored complete owner: `a8-restart-restored-24150/`, invocation
  `f221ac54-bb07-472e-bc20-8b9da851e8b7`, 2/2, 177.29s.
- Database cancellation SDD extends the existing operation table. A real
  migrated database is held at its acquisition handoff; no resource is faked.
  The first test attempt, `a8-database-cancellation-red-24150/`, is **invalid
  RED**: duplicate test teardown obscured the assertion with a second pool
  end. After removing that duplicate, `a8-database-cancellation-red-corrected-24150/`
  reaches `cleanup must be registered before acquisition`, false versus true;
  invocation `df134e6e-66c4-420a-a6e7-39b3e344edb5`, 184.16s.
- Minimal database GREEN publishes cleanup before root/DB acquisition and
  joins acquisition before reclaiming late handles. `a8-database-cancellation-green-24150/`,
  invocation `e89d88f3-9cbb-42e3-91e1-08e0fd501af9`, passes2/2 in183.77s
  with unchanged source during execution. The new control observes joined
  cleanup, no later web launch and actual Docker404 after database removal.
  Refactor/falsification and the build/policy/readiness controls remain open.
  Discovery remains exactly LI-boundary/LI-refusal. SDD docs gate and the
  initial test typecheck pass; sandbox-denied tsx IPC is retained as a setup
  failure, followed by the successful host docs gate.
- Policy/readiness RED: `a8-policy-readiness-cancellation-red-24150/`,
  invocation `0575dedc-5b20-431b-941c-bb6a6af67d34`, 250.18s, unchanged
  source throughout. Both behavioral assertions execute: policy cancellation
  admits one later web launch and returns a successful fixture; readiness
  cancellation also returns a successful fixture. The actual policy-refusal
  error remains the same object through cancellation and cleanup. Both late
  handles are reclaimed, with zero live processes and remaining roots in the
  observations; cleanup does not turn the incorrect success into acceptance.
  Post-policy and post-readiness admission checks prevent those admissions.
- Complete cancellation GREEN: `a8-all-cancellation-green-retry-24150/`,
  invocation `b23b86ea-8c46-4f95-81e4-cd609d001f3b`, 273.72s, passes2/2
  with unchanged source and zero terminal leaks. Actual build registration
  and failure are witnessed; late build, policy and HTTP200 readiness
  handoffs reject cancellation, preserve the original failure where present
  and reclaim handles. The preceding unchanged-source attempt
  `a8-all-cancellation-green-24150/` is failed acceptance: Docker500 reported
  RootlessKit port32796 already in use, before the database barrier; its
  failed-start owned container required containment. No shared service was
  stopped and no timeout changed. That setup failure is not behavioral RED.
- Admission-check falsification: `a8-admission-checks-mutant-24150/`,
  invocation `5d4627ba-4018-43c6-9ebb-3f969f424d8c`, 284.82s, reaches all
  three intended assertions. Removing only post-build/policy/readiness
  checks permits a later web launch after build/policy cancellation and
  returns success after readiness cancellation. Exact restoration precedes
  subsequent controls; no permanent fault flag or unisolated fallback exists.
- The first join-removal control, `a8-acquisition-join-mutant-24150/`,
  invocation `3cb63f73-1f52-4259-9659-a3e26840bfc3`, 260.60s, reaches the
  readiness leak assertion and requires containment of seven processes.
  Its100ms sampling failed to discriminate other join boundaries because
  unrelated teardown remained pending. It does not qualify those boundaries.
- REFACTOR replaces the timing sample with the actual cleanup-stage event:
  acquisition entry is reached, cleanup has neither completed nor advanced
  to later stages, then the held real operation is released. Restored
  `a8-explicit-join-green-24150/`, invocation
  `dd9d6d77-f1c7-4f3d-846a-a5d3e02ac270`, passes2/2 in272.32s; typecheck
  and read-only changed-file lint pass on the same source.
- Discriminating join falsification: `a8-explicit-join-mutant-24150/`,
  invocation `1385d101-f2d6-4a2f-b95f-e4cfb8e8530f`, 240.62s, removes
  only the acquisition wait. All five collected observations report
  `joined:false`, and the database acquisition assertion also fails.
  Readiness reports seven live processes before containment; such cleanup
  cannot turn the run green. The exact saved source is restored afterward.
  Each external command directory retains original stdout/stderr, full
  source patch and SHA256, start/end source equality, monotonic duration,
  invocation ledger, build identity and complete reporter. Final restored
  owners on both exact Nodes pass: `a8-final-restored-24150/`, invocation
  `7e5943c8-b583-4071-8941-a21a1a4d0c6b`,258.16s, and
  `a8-final-restored-24190/`, invocation
  `147a71ca-de89-47e1-90e3-f83a7da03c2e`,256.09s. Both validate exactly
  LI-boundary/LI-refusal, fresh builds and zero terminal leaks on identical
  patch SHA256 `07f0b51df577cedd6a3db2b9f9234a425ed223a3143093fa1cf9eebf2e38e0d9`.
  The all-document/unchanged ERD gate also passes.
- Final coverage review adds call-through observations of supervisor and build
  admission after database cancellation. Removing only the post-database
  guard reaches the new supervisor-admission assertion (one actual start)
  in `a8-database-admission-mutant-24150/`,229.86s. Exact guard restoration
  passes the complete owner in `a8-complete-admission-green-24150/`,256.93s;
  both admission counts are zero. This last assertion refinement has a fresh
  minimum-Node receipt; final-source both-Node qualification remains A11.
  A8 is complete at the control level, not a C3/full-phase qualification.

A9 controls and A10 registration are now complete below. Keep A11–A13
unchecked until their actual acceptance gates pass. Fresh Darwin regression
needs an exact-source handoff from this Ubuntu host; historical CI receipts
do not qualify these changes.

### A9 — wrapped lifecycle controls and inherited-pipe RED

Discovery now finds exactly the five planned Linux titles; typecheck and
read-only changed-file lint pass. The mandatory full manifest is still the
original50 pending all five controls passing and A10. New fixture programs
use actual namespace wrappers, ordinary and detached TERM-resistant children,
captured host identities and disposable foreign witnesses. Startup death is
cut at a real CommonJS preload blocked before the application handshake;
ready and active-probe cuts kill the fixture runner. Each observes process
absence before containment, with no production fault flag.

`a9-initial-owner-24150/`, invocation
`2d23fd09-5b5f-4241-a27f-5ece59e9ba0e`,330.23s, is a valid behavioral RED:
LI-boundary/LI-refusal pass; LI-term records production `web-shutdown-done`
but receives an unobserved outcome after escalation; LI-kill/application
reaches its assertion with the actual application outcome still pending.
The application has exited, but resistant descendants retain stdout/stderr
and prevent the bridge's child `close` event. LI-parent passes startup-worker,
ready-runner and active-probe-runner cuts with zero live captured identities
before containment. Both foreign witnesses remain alive. Terminal sweeps
are clean, which does not erase the two behavioral failures.

The minimal correction observes child `exit`, synchronously publishes its
actual code/signal and unreferences inherited output pipes so descendants
cannot keep the bridge/namespace alive. Exact Node24.15 builtin child-process
and socket source is retained with the external evidence.
`a9-bridge-exit-green-24150/`, invocation
`79fb24a7-c7b5-4117-be6b-6e2f15af4e0e`,315.54s, passes all5 with clean
terminal sweeps. Production drain reports code0; INT-forwarded controls
distinguish code137 from actual SIGKILL; application/namespace-init/outer
death and all three parent cuts observe zero captured survivors before
containment. Foreign witnesses remain alive; namespace-init loss remains
truthfully unobserved rather than a synthesized signal.

The refactor adds an explicit no-group-broadcast/no-escalation observation
to the production drain control and exposes nested-worker exit before a
probe barrier, preserving the original diagnostic cause. Formatting is
limited to new controls and fixtures. Refactor
`a9-refactor-owner-24150/`, invocation
`16361c5c-d85e-40c1-84fe-5b033e257af9`,315.98s, passes all5.

- Fix-removal falsification `a9-child-close-mutant-24150/`, invocation
  `2221da54-8681-43df-9fe6-275fc5401824`,327.16s, restores the old child
  `close` handling. LI-term again loses the observed exit and LI-kill's
  application outcome stays pending; the other three cases pass. Mutant
  bridge SHA256 `0c921e9b94b54188f55605e2bc0f397366d4497d6ab80add107a294011a20a8c`.
- Status falsification `a9-signal-collapse-mutant-24150/`, invocation
  `35d8b14c-5509-4232-b584-efb112144faf`,287.50s, relabels actual SIGKILL
  as numeric137. Both exact-signal assertions fail with observed code137;
  the genuine exit137 control remains positive, other owning cases pass,
  and both foreign witnesses remain alive. Mutant bridge SHA256
  `836d2adeed7f9abc830dec6119bf2badebf097aa8c402f03ed20a1ae7bbb44f1`.

Both mutations restore exactly to bridge SHA256
`0475a8d626a76eedf123dbd38c32647c5214bd9ad6fe24583dddc2504ff9ffe2`.
The external command receipts now also archive every changed and untracked
source file, with per-file SHA256 and start/end equality. Final restored
`a9-restored-owner-24150/`, invocation
`b384273b-9476-4e90-b54d-f4ca7979c454`,333.84s, passes all5 with clean
terminal sweeps and unchanged source. A9 is complete at control level;
C3/full phase qualification remains open. Restored typecheck and lint pass;
the typecheck receipt separately records that its only filesystem delta was
the concurrent build’s temporary `.next.build-lock`, not source.

### A10 — mandatory platform manifest

All five Linux controls have passed before registration. Extend the existing
runner controls for Linux55/Darwin50 selection, Linux part and unknown-platform
refusal, every required Linux title, and unexpected passing-case rejection.
The original Darwin seven files,50 titles,19/31 parts and receipt validator
remain unchanged. Native `a10-manifest-red-native/` reaches all four new
assertion failures (30/34 pass); the initial sandbox command failed without
child-test detail and is not behavioral RED. Minimal GREEN
`a10-manifest-green/` passes34/34. Removing only unknown-platform refusal in
`a10-platform-refusal-mutant/` reaches the expected missing-exception assertion
after Linux part refusal passes (33/34). Exact restoration
`a10-manifest-restored/` passes34/34 in3.84s.

`a10-platform-discovery/` lists all8files/55cases through installed Vitest;
`a10-discovery-audit.json` reconciles each title and proves the original
Darwin50/19+31 manifest unchanged against `a10-darwin50-baseline.json`.
A10 registration is complete. A11 full execution, falsifications and fresh
Darwin qualification remain open; the CI workflow/receipt helper are untouched.

### A11 — final falsification and qualification

Filesystem enforcement removal is a local-only `ordinary-exec` driver mutant,
with no selectable fallback. `a11-ordinary-exec-mutant-24150/`, invocation
`d7a45921-1fcd-401a-9f55-54955e699a2e`,161.48s, reaches I1/I4 denial
failures on13 readable sentinel bytes while I2/I3 pass. Because I1 stops at
its first assertion, `a11-private-files-mutant-24150/` temporarily collects
its negative assertions without changing their expected denial. Invocation
`f4252b4e-22e1-4dfc-bf98-77719c3d45df`,174.19s, reaches failures on the
sentinel13, live SQLite4096, WAL580952 and SHM32768 bytes. Authorized web
read, harness read and supervisor health remain positive; I2/I3 pass.
Both attempts retain clean terminal sweeps. Driver and original test restore
byte-for-byte in `a11-filesystem-restoration.json`. Restored
`a11-filesystem-restored-24150/`, invocation
`d0f9c350-e4af-4053-ad81-311c8c69e91f`,190.52s, passes I1–I4 with
clean terminal sweep and unchanged source.

Namespace guard removal first failed before reporting in
`a11-namespace-guard-mutant-24150/`, invocation
`9cb7c99d-ce75-4ebf-b000-4d6d08225943`,318.36s. Successful user-namespace
entry could disrupt subsequent native probes; empty output produced a JSON
parse error, so this is not valid behavioral RED. The native probe now
attempts namespace creation last, and its caller preserves native failure
diagnostics. No expected result or deadline changes. With the same two
local quota flags removed, `a11-namespace-guard-red-corrected-24150/`,
invocation `37ed5e65-d995-4119-a20d-005b10bc5d65`,307.10s, reaches the
actual LI-boundary assertion: userns0 instead of ENOSPC/EPERM. Other4
controls pass; terminal sweeps are clean. Production guard bytes restore
exactly in `a11-namespace-restoration.json`; final restored owner remains
required after the remaining supervision/identity mutations.

Outer watchdog removal `a11-outer-watchdog-mutant-24150/`, invocation
`349558fb-6459-4399-97bd-839ea9e2ed07`,322.15s, reaches LI-parent’s
startup-worker death assertion with7 captured identities still live before
containment. Other4 controls pass; both foreign witnesses remain alive.
Task-owned containment then produces clean terminal sweeps, which does not
erase the observed leak failure. Outer preload bytes restore exactly in
`a11-watchdog-restoration.json`.

Removing only Bubblewrap `--die-with-parent` in
`a11-kernel-parent-mutant-24150/`, invocation
`9125b9d4-6267-4636-b568-8750598dae0f`,278.07s, reaches LI-parent’s
startup-worker assertion with6 live captured identities before containment.
LI-term loses its observed graceful outcome and LI-kill/application reaches
the pending-outcome assertion. Both foreign witnesses remain alive. Boundary
passes; LI-refusal separately fails before its database barrier because
RootlessKit returns Docker500 for host port32954 already in use. That
setup failure is retained and is not behavioral RED. Terminal sweeps after
owned containment are clean; the pre-containment leak remains failed
acceptance. Kernel guard bytes restore in `a11-kernel-restoration.json`.

Removing only the exact invocation-tag signal guard in
`a11-signal-identity-mutant-24150/`, invocation
`6436a8cd-e087-4b32-840b-3dea3b20bcff`,278.68s, reaches LI-kill’s
forbidden-signal assertion: the promise resolves instead of refusing and the
task-created foreign witness is dead before containment. Other4 controls
pass; LI-parent’s independent foreign witness stays alive. No unrelated
process is targeted. Original identity-guard bytes restore exactly in
`a11-identity-restoration.json`. All production guard mutations are now
restored; the corrected native probe observation is the sole additional
test change. Restored complete owners and final qualification follow.

Restored owners pass all5 on the identical source patch
`cbaf52e5cd7e59b3db216a9a0bc4a4467b5ccda21de9f8f560526acb893a3ae0`:

- `a11-all-guards-restored-24150/`, invocation
  `e10bd656-05eb-4299-9014-4170a691dcfa`,318.78s;
- `a11-all-guards-restored-24190/`, invocation
  `64e910c7-4275-4c2a-99ea-1c6a773e9f04`,315.63s.

Each uses a fresh build, observes active-build cancellation, passes all nine
pre-containment tree checks with zero survivors, retains both foreign
witnesses and has clean terminal sweeps. Source remains unchanged during
each attempt. This closes the corrective/falsification control cycles, not
the full Linux55/preflight, phase regression or Darwin gates. The existing
Darwin receipt rejection table also explicitly includes an added Linux owner;
its complete runner/CI contract suite remains a required static gate.

Complete discovery is retained under `a11-complete-discovery/`: ordinary
collection succeeds, then its postcondition rejects the two opt-in load
owners omitted by Vitest2's `mode === run|only` listing. This is a discovery
utility failure, not behavioral RED. `a11-discovery-with-loads/` separately
enables the existing two load flags for collection, verifies identical
source and preserves the ordinary JSON before reconciliation. The frozen
inventory is web884unit/9222cases and596integration/5247cases;
supervisor50unit/495cases and36integration/310cases. Ordinary integration
is584files in25 fixed groups; eight isolation owners, independent preflight,
scheduler-clock and both unchanged load owners execute separately.

The first full web unit attempt `a11-web-unit-24150/`,360.95s, passes
9221/9222 with no skips. The unchanged atomic-file mode assertion expects
0644 but observes0664. `umask-verification.json` proves native inherited
umask0002 produces0664 and an invocation-only child umask0022 produces0644.
The production writer uses Node's default mode; no production or test
assertion is changed. Subsequent validation subprocesses explicitly use
umask0022, retain the parent's actual mask in each receipt, and leave host
login/security settings unchanged. Both actual witness files remain within
the private evidence directory. The repeated complete unit gate passes below;
the original failed aggregate remains failed evidence.

The following Node24.15.0 receipts share base
`8ad23a5fcf258a136960846fb1748e5ba908fe52` and working diff SHA256
`1995a75f04dba930e0ca4860f612551c914b65ec977a5576703060954aa0d633`.
Each retains its complete source snapshot, command, timing and report outside
git; `qualification-audit.json` verifies the exact frozen discovery titles.

| Gate / evidence directory | Result | Invocation / duration |
|---|---|---|
| `a11-web-unit-umask-24150/` | 884 files / 9222 passed | 364.65s |
| `a11-supervisor-unit-24150/` | 50 files / 495 passed | 18.91s |
| `a11-supervisor-integration-24150/` | 36 files / 310 passed; clean outer sweep | `557a03e4-4f12-4332-a539-789cc505b0f3`;395.09s |
| `a11-web-integration-00-24150/` | first frozen group,24 files / 213 passed; clean outer sweep | `37b9d843-f2a1-4c9b-a500-69dfa213a3c9`;299.47s |
| `a11-preflight-24150/` | independent1/1; clean outer sweep | `89466edc-bee0-405c-8c06-5ed175cfe8f2`;12.25s |
| `a11-linux55-24150/` | complete8/55; validators pass; clean outer sweep | `2c5e5f9f-3761-455c-ace1-b4b7408f3516`;1588.76s |

The full Linux55 report is
`a11-linux55-24150/maister-ab-isolation-Hgxihx/vitest.json`, SHA256
`2ad84fb4e406f3de406db6efc99444faa4668c0c230ff726f0eda2f700519ac7`.
It observes all nine lifecycle trees gone before containment and both foreign
witnesses alive. Fresh default build `uTzITBnLXCFKXVN38fBVn` takes137.502s.
This receipt is below the unchanged2340s limit, with no skips or errors;
it does not qualify a later changed source, Darwin, the complete phase or hosting.

The second ordinary group, `a11-web-integration-01-24150/`, fails259/260
in230.54s. Its existing `promote-flow.integration.test.ts` two-racer control
expects `CONFLICT` but receives the target-drift `PRECONDITION` after the
winning promotion merges. `failure-audit.json` retains the assertion and proves
both that test and `web/lib/runs/promote.ts` are byte-identical to the continuation
HEAD. At that checkpoint the claim path checks target drift before
`canReclaim`; no production correction or weakened expectation is made.
The serial batch runner stops at this ordinary-regression failure; later groups
are not accepted. The owner subsequently authorizes the correction recorded
below. This original failed receipt remains failed, not an isolation RED or a
passing phase gate.

After the live lane closes, eight warnings in changed harness code are
corrected only by import grouping, blank lines and assertion wrapping.
`a11-final-lint/` passes with no warnings/errors. Final both-Node Linux55 and
independent preflight must bind the corrected source. A11/C3 remain open.

The corrected-source owner `a11-final-owner-24150/` passes5/5 in314.06s,
invocation `6faf72b7-dec5-49b0-a464-21914b0f4359`, with all nine pre-containment
tree checks, both foreign witnesses and clean outer cleanup. Its raw receipt
flags a diff mismatch because Git lengthened abbreviated index headers from
eight to nine characters after the read-only master-object fetch. The retained
`source-stability-audit.json` and qualification validator independently verify
identical source snapshots and diff bodies, with only those hash-prefix lengths
changed. No working source or HEAD changed. Future evidence uses `--full-index`.
The raw receipt is preserved rather than rewritten.

`a11-final-{web-types,supervisor-types,mcp-types,runner,runtime-tests,runtime-check,contracts,docs,diff}/`
all pass. Runner/workflow/receipt controls are34/34; the generated140-table ERD
is unchanged. These static gates are distinct from the failed ordinary
integration aggregate and the unavailable fresh Darwin gate.

Local control checkpoint `dbe36dd19004d3b4a399bbfcb45c60f4055d2fd9` and
manifest checkpoint `6f6dabc41e68e7499dacebb769a753ea4803f488` contain only the
validated owned files. Every staged blob was matched against its passing
owner/runner snapshot before committing. They are focused implementation
checkpoints, not C3 acceptance; no push or CI action occurred.

Read-only master recheck finds
`698b8cb35151b089d492c13cf3bcdc28a3858281`, compared with local baseline
`8237993223fa5a7c3aafe9db42d9438612990938`. Only `gates-exec.ts` and its existing
integration test differ; ADR allocations, promotion code and CI are unchanged.
`a12-master-recheck.json` retains the check. No rebase is performed and no new
ADR is allocated. This pre-correction audit records no production delta;
the later authorized promotion correction requires a revised impact audit.
A12's qualified-candidate gate is still pending.

### A8 follow-up — interstage cancellation admission

Final adversarial review identifies two unguarded awaits between the existing
cancellation checks: directory/sentinel preparation before supervisor startup,
and supervisor startup before the production build. Cancellation at either
handoff can admit a later process even though eventual cleanup joins and reclaims
it. Reopen A8 narrowly: reuse LI-refusal and its real call-through barrier helper;
retain the actual filesystem write and actual supervisor startup results until
cancellation is registered. Assert zero later supervisor/build admissions in the
existing test body, so an unwanted launch is a reached behavioral RED rather
than a hook timeout. After RED, add admission checks before those two launches,
remove them for falsification, restore exact sources and rerun the owner.
No new top-level case, production flag, timeout or inventory change is allowed.
Final-source both-Node Linux55 remains required after this correction.

The first attempt `a8-interstage-admission-red-24150/` fails setup in177.24s,
before the assertion body, after RootlessKit selects port33066 while a connection
to this invocation's PostgreSQL port33063 remains in TIME-WAIT. Native `ss`
confirms that exact tuple in `port-followup.json`. The report has five skipped
cases and containment discovers/removes one owned container: this is failed
setup/leak evidence, not behavioral RED. No host socket, daemon or security
setting is changed. The unchanged-source retry reaches both assertions.

| Cycle / evidence directory | Complete owner result | Invocation / duration |
|---|---|---|
| `a8-interstage-admission-red-retry-24150/` | 4 pass/1 fail; LI-refusal observes supervisor1 and build1 instead of0 | `030402c4-bc36-4d72-a90d-5487728576e2`;321.00s |
| `a8-interstage-admission-green-24150/` | 5/5; both admissions0 | `1850687f-20aa-4325-bdff-dcb7c11f4bc7`;330.14s |
| `a8-interstage-admission-mutant-24150/` | 4 pass/1 fail; removing only both checks reproduces both1-vs-0 assertions | `bde86a8b-b817-441d-8183-802bf8705a7e`;305.19s |
| `a8-interstage-admission-restored-24150/` | 5/5; both admissions0; exact titles/validator pass | `80e34888-e463-4292-8a9b-2dc7f78eb679`;306.33s |

All four reached runs retain unchanged sources and clean outer sweeps; each
GREEN observes all nine lifecycle trees gone before containment and both
foreign witnesses alive. Refactor review retains the two calls to the existing
`assertAcquiring` helper: no further abstraction or behavior change is needed.
The fixture is restored exactly to SHA256
`d78f4218dc25ecb14bc33581beaf8cb144518e2dfea2e14260c0ac447cbc7961` from mutant
`776e420c78304c52c344bc2195be1cdfcedf29d3ba226e451e972217ac9dc11a`;
`a8-interstage-{mutation,restoration}.json` retains both identities.
`a8-interstage-green-{types,lint}/` passes, with zero lint warnings.
Correction commit `63c6e546b3da12a62953d8c9fa799018a9c1b869` contains only the
fixture checks and their real call-through controls; both staged blobs match
the restored-GREEN snapshot. A8 is complete at control level again. C3 is not
accepted, and final-source both-Node Linux55/preflight remains the next gate.

### A11 amendment — authorized concurrent-promotion correction

The owner explicitly authorizes the minimal RED-first production correction
after the ordinary regression's unchanged two-racer failure. This expands the
previous harness-only scope to `web/lib/runs/promote.ts`, its existing real
PostgreSQL/Git integration owner and the canonical workspace promotion contract.
It does not authorize CI migration or any remote operation.

Before this correction, clean source
`490c7fe175d8fc38f1c5410ea910fbebb2707ea8` passes
`a11-frozen-24150-preflight/` (1/1,13.06s, invocation
`d9db8efe-0714-427a-ae92-7f38232c03a3`) and
`a11-frozen-24150-linux55/` (8 files/55 exact titles,1495.96s, invocation
`8c91c1de-26f5-4376-9b34-c7a793ab8ed9`). The latter report SHA256 is
`3b19cb11174a50da063863f62e1bbf19fe0a7d82182ab117e04cf47c9a5dfc37`.
Both existing validators, exact discovery reconciliation and clean outer
sweeps pass; all nine lifecycle observations have zero survivors before
containment and both foreign witnesses survive. The frozen source/runtime
record is `qualification-source-490c7fe.json`. These receipts qualify only that
minimum-Node candidate, not the upcoming production correction.

- [x] **P1 — Specify and reproduce both claim-ordering windows.** Preserve the
      existing two-racer title, but hold its contender's authorization under the
      real workspace lock until the winner's actual Git merge advances the
      target. Add one integration case that holds the contender's actual
      PostgreSQL `Review` result until the winner finishes, then releases that
      unchanged result before the contender acquires the workspace lock.
      Call-through barriers must reach their intended frontiers, release in
      `finally` and join every attempt. Expect exactly one merge and loser
      `CONFLICT`; setup/deadline failures are not RED.
- [x] **P2 — Correct ownership precedence and qualify the owner.** Under the
      existing workspace lock, preserve an initially ineligible/terminal run's
      `PRECONDITION`, authorize, then reject active workbench/promotion ownership
      before fresh status and target-drift checks. Preserve the nonshared fresh
      status reread that protects rework, stale-claim recovery, readiness,
      unattended-promotion fences and genuine target-drift refusal/override.
      Execute the complete real owner, affected consumers and static gates;
      review the minimal change, restore the old ordering as a valid
      falsification, then restore exact GREEN bytes.
- [ ] **P3 — Re-freeze the corrected candidate.** Commit the independently
      validated correction locally. Reconcile discovery for the added case,
      rerun the complete ordinary regression and applicable phase gates, then
      qualify independent preflight plus fresh-build Linux55 serially on both
      exact Nodes. Re-audit API/DB/config/deployment impact: production guard
      ordering now changes, while existing error codes/shapes, schemas,
      migrations, settings and hosting are intended to remain unchanged.
      Fresh Darwin50/preflight still needs its own exact-source handoff.

The observed target-drift failure and the additional stale-status window share
one claim-ownership precedence defect. The correction belongs in the shared
workspace promotion service, not individual routes. The scratch path has no
reviewed-target drift gate and reads its run after locking the workspace; parked
PR finalization already checks ownership before its fresh run-status read.
Those paths retain their existing contracts and consumer regression coverage.
No new ADR, API field, migration, dependency or production test flag is planned.
Unresolved questions: none for this authorized correction.

The complete real owner executes both intended REDs on unchanged production
code. `promote-order-red-24150/` first records8/10 passing in16.70s.
The strengthened controls then assert durable `Done`/`done` and exactly one
actual Git merge before checking the loser's error code. Their retained cycle is:

| Directory under the Ubuntu evidence root | Result | Invocation / seconds |
|---|---|---|
| `promote-order-positive-red-24150/` | 8 pass/2 fail; both reached `PRECONDITION` instead of `CONFLICT` | `58c3c787-0738-4895-8f7f-e163e42b264e`;14.57 |
| `promote-order-green-24150/` | complete10/10 | `e8d09614-1255-4fd5-a108-3bd766db8aaf`;14.61 |
| `promote-order-mutant-24150/` | exact original production bytes reproduce both failures;8/10 | `5aa32118-2b07-4049-82b9-a9ffb9a1e6ed`;15.52 |
| `promote-order-restored-24150/` | exact restored GREEN;10/10 | `16e96243-0cca-41f1-9987-cb4b85929836`;13.25 |
| `promote-order-restored-24190/` | same restored source;10/10 | `0430c36b-b601-425e-a912-2ff72e9aca01`;13.25 |

All rows have clean outer cleanup and no skipped cases. Passing rows reconcile
the exact discovered title set with the existing lane validator. GREEN and
both restored runs bind HEAD`490c7fe175d8fc38f1c5410ea910fbebb2707ea8` plus
diff SHA256`12e7385009d16196f8aa93c8fbc6eaf3642ddf1639d913e9f6fa50cbe8b322e6`.
The production file restores exactly to
SHA256`83fff5d653823d1ff80e523c3af12e8c4df309161709724e1ce15967bea12936`;
`promote-order-{mutation,restoration}.json` binds the original-order mutant.
Read-only adversarial review finds no blocking issue or justified refactor;
the initial-status guard plus movement of the existing authorization/ownership
checks preserves the nonshared reread and all claimable-request gates.

`promote-unit-green-24150/` passes the existing4-file/69-case service/route
regression in4.94s. Web/supervisor/MCP typechecks, scoped lint with zero warnings,
MCP build and contract checks pass. `promote-green-docs/` records a sandbox
`tsx` IPC `listen EPERM`; its unchanged-source native rerun
`promote-green-docs-native/` passes. The installed Vitest discovery preserves
all nine original promotion titles and adds one; complete web integration
discovery is now5248 cases. `promote-discovery-audit.json` retains the before/
after inventories; Linux55 and Darwin50 titles are unchanged.

The18-file consumer sweep is recorded with its exact `rg` command/output in
`promote-consumer-sweep.json`, plus the existing shared-tree rework fence.
`promote-consumers-green-24150/` is **failed**, despite its attempt label:
279/282 in253.47s, invocation`bc6b7329-9c0a-48d6-ab32-437b11820a50`.
Exact title reconciliation passes, the lane validator correctly rejects it,
and cleanup is clean. All three failures are the existing sync-target conflict
restoration cases: Git2.43.0 rejects
`reset --hard --end-of-options <sha>` before restoring the worktree.
`git-reset-compatibility-probe.json` independently reproduces that rejection
in an invocation-owned disposable repository without calling promotion;
`reset --hard <hex-sha> --` succeeds there. `web/lib/worktree.ts` is unchanged
from the continuation source, SHA256
`3ec0fe3851b5ca34b1802e7e82aa0795dbe828567fc2c51bc283cb852b664696`.
The owner authorized the minimal Git2.43 compatibility correction on2026-10-22,
retaining hex validation and every existing restoration check.
That attempt qualified P2's owning behavior but left its broader consumer gate
open. The successful current-Git rerun below closes P2; P3 and complete phase
qualification remain open.

### Git compatibility recheck and runtime repair (2026-10-22)

The owner authorized a minimal Git2.43 restore correction, then requested a
recheck after upgrading Git. No production restore change was made. The
prepared case(h) resolution assertion was discovered with all65 original
names, typechecked and linted, but `restore-red-24150/` stopped before workers
at reaper acquisition: the running Docker29.5.3/containerd2.2.4 no longer
matched installed Docker29.9.2/containerd2.4.2 shim binaries. That1.91s attempt
is an environment prerequisite failure, not behavioral RED. Its outer sweep
is clean and a later Testcontainers-label inspection finds no resources.

Read-only inspection found six persistent services on this rootless daemon,
with live restore disabled and `unless-stopped` restart policies. The owner
explicitly authorized `systemctl --user restart docker.service` and their brief
interruption, overriding the original no-restart restriction for this action
only. The command succeeded; all six containers returned to running, including
healthy MAIster PostgreSQL, nginx, site and docs; SearXNG/Redis have no configured
healthcheck. No volumes, daemon configuration or security controls changed.
`runtime-after-owner-upgrade.json` records packages/binary hashes and the new
Docker29.9.2/containerd2.4.2/rootlesskit3.3.0 identities. Later qualification
must use these identities rather than borrow earlier environment receipts.

Git is now2.55.0 (`1:2.55.0-0ppa1~ubuntu24.04.2`). The actual original argv and
proposed alternate both succeed in a disposable repository
(`git-reset-current-probe.json`). The complete unchanged real sync-target
owner then passes65/65 in45.41s, with exact titles, validator success and clean
cleanup: `restore-current-git-24150/`, invocation
`f75dd51c-d13e-4287-8c56-700f8eba55d6`, reporter SHA256
`da23b996534007e5bb5ae74c50e15cb29925ee48639d0858f49b38015468c0f8`.
The passing PostgreSQL owner also verifies new container creation after the
restart. Production and test bytes match`bd4744d9f` exactly; only this plan
and the then-proposed documentation differed during that run (full snapshot
retained). The prepared assertion patch is retained outside the repository at
`restore-prepared-test.patch`; its test and proposed spec are restored exactly.

Disposition: the separate restore-argv correction is **not implemented and not
needed for this upgraded qualification environment**. Git2.43 compatibility
remains a known limitation with its original failed reports; no support claim
for that version is inferred. No new test, fallback, timeout or assertion
change resolves the gate. Continue the broader promotion consumers and full
phase qualification on the unchanged production candidate with Git2.55.
Unresolved questions: none for this recheck.

The broader promotion consumer gate now passes18/282 in251.44s:
`promote-consumers-current-git-24150/`, invocation
`108db991-614a-4e00-90c9-446c50feb67c`, reporter SHA256
`eaba965ba68e98721919c2369ad390533ee66234a8b995db3a66b40bbc7ea840`.
Exact title reconciliation, the existing lane validator and clean outer
cleanup pass. The source is`bd4744d9f` plus this plan's recorded diff; no
production/test bytes differ. This closes P2's consumer gate at Git2.55,
without erasing its failed Git2.43 receipt. P3/A11/full phase qualification
and fresh Darwin remain pending.

Before the environment upgrade, clean
`bd4744d9f4529b027679e4045abd894f4246e8e9` passes the full web unit
inventory884/9222 in340.16s (`promote-checkpoint-web-unit-24150/`, report SHA256
`07ed6525fcbfda9d8bf7059a6de5448af54a6cffb1eb2a426cfcffe5337c637e`)
and separate production clock owner1/6 in192.14s
(`promote-checkpoint-clock-24150/`, invocation
`7db1443b-c59c-4a97-be69-82c6f59f745d`, clean outer sweep).
The prepared-test snapshot additionally passes supervisor unit50/495 in19.46s,
runner/macOS-receipt34/34, runtime4/4, runtime check, web typecheck, scoped lint
and contracts (`promote-checkpoint-supervisor-unit-24150/` and
`restore-prepared-{runner,runtime,runtime-check,types,lint,contracts}/`). Their
command receipts bind the exact snapshot; none replaces full final-source
Linux, ordinary integration or Darwin qualification.

### A11 follow-up — Docker port collision and failed-start allocation

Full ordinary regression on `ce974c1392468d42d74e8f8e2e4f5a58f73fdea0`
encountered two independent rootless Docker start failures:
`a11-final-ce974c139-web-07-24150/` (port32964,169 passed/10 unexecuted)
and `a11-final-ce974c139-web-11-24150/` (port33080,210 passed/10 unexecuted).
Each left one container discovered and removed by terminal containment; both
attempts are failed. Their unchanged-source retries passed179/179 and220/220,
respectively, but **no cause was fixed between those attempts**. Retrying a
package does not qualify the allocator or the failed-start cleanup path.
Original reports and `failure-audit.json` remain in each failed evidence folder
under `/tmp/maister-s53a-ubuntu-qlpo_wtn`.

Installed Testcontainers10.28.0 creates the Docker object before invoking start,
but its failed-start path does not remove it. The shared helper receives no
started handle and only wraps the error. `docker-port-and-start-cleanup-audit.json`
records source hashes and distinguishes this verified ownership gap from the
port collision itself. The latter matches the rootless child/host namespace
allocation problem described by [Moby53153](https://github.com/moby/moby/issues/53153)
and [Moby52903](https://github.com/moby/moby/issues/52903). The occupants of32964
and33080 were not observed. An earlier33066 receipt directly records TIME-WAIT;
it does not identify the occupants of these later ports.

- [x] **P4 — Reclaim rejected PostgreSQL allocations.** Extend the existing real
  `pg-container.integration.test.ts` owner with an actual occupied-container-port
  refusal, original-error identity, pre-containment absence and live sibling
  SQL witness. Execute RED before the minimal per-allocation cleanup correction;
  restore the old cleanup behavior as a falsification, then restored GREEN.
  Preserve all existing titles, deadlines, terminal leak failures and Linux55 /
  Darwin50 manifests. No startup retry or daemon configuration change belongs
  to this correction.
- [x] **P6 — Remove the four direct PostgreSQL ownership bypasses.** The constructor
  sweep found `observatory-overview.integration.test.ts`,
  `observatory-kind-attribution.integration.test.ts`,
  `repo-delivery-scan.integration.test.ts` and `outcome-bucket.integration.test.ts`
  creating unlabelled SDK containers directly and receiving handles only after
  successful start. Add invocation-ownership assertions inside their existing
  cases, execute RED, then route those fixtures through the shared main-lineage
  helper. Preserve all original titles, migrations and deadlines; qualify their
  complete owners and falsify the constructor routing before claiming closure.
- [ ] **P5 — Resolve the Docker allocator prerequisite and re-freeze.** Successful
  repeated packages alone do not close this prerequisite. Reconcile complete
  ordinary discovery and requalify affected gates on the corrected source;
  P3/A11/A12/C3 remain open. Fresh Darwin execution remains required.

The ordinary orchestrator stopped after accepted groups0–13. Group14 was
explicitly interrupted via its recorded runner UID/PID/start identity to begin
this correction: `requested-interruption.json`,1754.74s,exit1. Its finalizer
removed one container, so it is a failed/interrupted receipt, not zero-leak
qualification. Subsequent Docker inspection found no Testcontainers resources.
No shared daemon or persistent service was stopped during this investigation.

P4 real-control evidence (all under the same external evidence root):

| Attempt | Result | Invocation; seconds |
| --- | --- | --- |
| `pg-start-red-24150/` |7 PASS /1 intended FAIL: allocation still exists before containment|`9fa2237e-45e8-4ea8-8215-ff587f441ac8`;82.788|
| `pg-start-green-24150/` |8/8; initial CLI cleanup implementation|`b2d0d290-0114-4dd6-9391-5acaa0db40e5`;84.614|
| `pg-start-refactor-green-24150/` |8/8; cleanup and independent oracle use the same SDK-selected daemon|`78980c44-af18-4122-8c5d-cd4f73538527`;78.508|
| `pg-start-mutant-24150/` |exact original helper repeats the intended7/1 failure|`42b5d2f2-4ef1-4810-980e-966248a90962`;79.567|
| `pg-start-restored-24150/` |8/8; exact restored helper|`82e29720-02bb-4fcf-9bc8-8f5702fd8429`;85.447|
| `pg-start-restored-24190/` |same restored source,8/8|`43b55213-cc84-4965-b74f-a2184a3763ad`;80.581|

The restored runs share source `ce974c139` plus full-index diff SHA256
`afdf0e8c164c6335a9a51555edf64fd15cd30e0e6d0757c8bdac0d484fcff575`.
Helper SHA256 is `2074c497bbe6a71d05b24b909c6d916745c85ceb7ed5c4f66ef77e4cbbc4f7df`.
`pg-start-{mutation,restoration}.json` binds the exact original/restored bytes.
Each receipt retains commands, source snapshots, report hashes and timings;
`failure-audit.json` rejects RED/mutant reports and proves the intended assertion,
while `qualification-audit.json` applies `validateLaneReport` and exact title-set
comparison to GREEN reports. The negative control performs its own exact-ID
containment after the failed assertion; accepted runs observe absence before
containment. Terminal sweeps find zero leaks. The control also proves original
Engine error identity, actual same-invocation labels and a successful sibling
SQL query. Both restored versions retain all original seven owner titles plus
one new ordinary-integration control; Linux55/Darwin50 are unchanged.

The SDK refactor avoids a CLI/SDK endpoint mismatch. Installed Dockerode4.0.12
and Docker Modem5.0.7 forward abort signals to real requests, including removal;
list/inspect/remove remain bounded at30/10/30seconds. The existing mocked
unit rejection remains Docker-free. Its2-file/3-case native owner passes;
`pg-start-refactor-unit/` retains the sandbox `listen EPERM` failure and
`pg-start-refactor-unit-native/` the unchanged-source pass. No startup retry,
security setting, daemon configuration, product API or database schema changed.
Focused P4 acceptance is complete. Final `CI=true` gates pass: web/supervisor/MCP
typechecks, MCP build, changed-file ESLint, `validate:docs:all` and
`validate:contracts` (`pg-final-*/` receipts). The first four static attempts
failed before execution because sandbox access to the pnpm SQLite store was
denied; `pg-final-frozen-deps/` verifies frozen/offline dependencies using the
existing local store, followed by the successful `*-native/` checks. Lockfile
and application dependencies are unchanged. The final static source is
`ce974c139` plus diff SHA256
`99a263667af5a35f94f74a8bfc4abf0026eb3545ae997dc06cd672410c25439e`;
only evidence prose differs from restored owner GREEN. Independent adversarial
review found no remaining P4 blocker. Full phase acceptance and P5/P6 remain
open; this correction does not qualify Docker port allocation or Linux55.

P6's four ordinary owners preserve their original27 titles (13+2+8+4), database
names, main migration lineage and180-second setup ceilings. The shared helper
provides the existing PG16/pgvector image, tmpfs/WAL limits, allocation ownership
and pool-before-container teardown. No product query or scheduler behavior is
changed. `pg-consumers-discovery/` records installed-Vitest discovery.

| Attempt | Result | Invocation; seconds |
| --- | --- | --- |
| `pg-consumers-red-24150/` |23 PASS /4 intended ownership assertion failures after real database setup|`6d9a87ff-0524-4ebd-a473-6562411e703b`;59.288|
| `pg-consumers-green-24150/` |27/27 after helper routing|`b9e36c5c-2ece-4fe7-be1c-97811b35b8b1`;46.830|
| `pg-consumers-refactor-24150/` |27/27 after final fixture cleanup|`f99dafe6-df25-48f1-bef0-615a8ec27e98`;45.230|
| `pg-consumers-mutant-24150/` |exact old fixtures restore the same23/4 behavioral result|`438619e7-8429-4925-94b5-5c99fd2e1941`;61.047|
| `pg-consumers-restored-24150/` |27/27; exact restored source|`09e444ce-3222-4c23-8918-5a6cb4830bce`;43.274|
| `pg-consumers-restored-24190/` |same source,27/27|`14db8d34-aa80-4b23-a3f2-17d93796a776`;44.150|

The final three accepted receipts share `50eae3f01` plus full-index diff SHA256
`2bc73a76b82f634d03f07dd2b58ffb63a97e2905720e8a1e7cfc5cc3fb614ccb`.
`pg-consumers-{mutation,restoration}.json` records each exact source hash;
each run preserves commands, reports and timings. Negative `failure-audit.json`
checks all four intended assertions and validator rejection; accepted
`qualification-audit.json` checks exact original title sets, report validation
and zero terminal leaks. Independent review found no remaining routing blocker.

The broader constructor sweep includes `.mjs`: the only remaining direct
constructor outside the helper is `reaper-database-worker.mjs`. It is the
independent O-reaper SDK/Ryuk death witness, already labelled and registered
before start. Its first database deliberately survives SIGKILL; ready IDs are
removed by O-reaper's finally block. A prereadiness-created object instead
requires terminal containment and fails the lane. This explicit exception does
not claim P4 immediate cleanup, and importing the application helper would
change the native witness's dependency boundary. Ordinary consumers have no
remaining direct constructor; no control or failure assertion was weakened.

P5 now has a deterministic current-daemon reproduction:
`docker-allocator-current/` and `docker-allocator-owned-probe/receipt.json`,
invocation `f10027e5-18c8-4772-a327-c62f58a380b4`,UID1000,Docker29.9.2,
containerd2.4.2,RootlessKit3.3.0,builtin port driver. After the first owned
container receives33258, an owned host socket binds33259. The next automatic
publication selects that occupied33259 and fails at RootlessKit AddPort; its
container remains `created`. Both exact labelled containers and the socket
are reclaimed, with no remaining probe IDs. This diagnostic's exit0 means the
probe and containment completed, not that Docker passed the prerequisite.
Unlike the earlier32964/33080 failures, the competing listener is now known.
No retry, daemon restart, configuration change or sysctl change is made.
An allocator-correct rootless endpoint is required before full qualification;
the previous authorized restart corrected version mismatch only.

P6 final `CI=true` web typecheck, changed-file lint, docs/contracts and34 runner
controls pass (`pg-consumers-final-{types,lint,docs,contracts,runner}/`). Full
installed-Vitest integration discovery is596files/5249cases; ordinary owners
are584files/5185cases. `pg-consumers-final-discovery/discovery-audit.json` proves
every prior title remains and the only addition is P4's failed-start control.
`a12-current-impact-audit.json` confirms the only production code delta from
the continuation baseline is the authorized `promote.ts` guard ordering;
API/events/auth shapes, schemas, migration lineages, configuration, dependency
lockfile, public UI/docs and deployment/CI files have no diff. Main journal ends
at0193, Brain at0006. This is a source-impact audit, not A12 candidate acceptance.

P5 prerequisite remediation uses a separate invocation-owned rootless daemon,
not a shared-daemon downgrade. Official Docker28.5.2 static binaries and its
matching rootless wrapper are pinned in `docker-28.5.2-download.json` and
`docker-rootless-extras-28.5.2-download.json`; actual daemon build is89c5e8f.
`owned-docker-endpoint.json` records the transient user unit, private data/state/
socket paths, UID1000, installed RootlessKit3.3.0, seccomp and cgroupv2/systemd.
No host security setting or shared service changes. The identical strict
allocator gate fails on29.9.2 (`allocator-gate-29/`,occupied33261) and passes
on28.5.2 (`allocator-gate-28/`,occupied32769 is skipped for32770). Both retain
the live socket witness and clean every owned diagnostic resource.

The complete8-case PostgreSQL owner passes on the new endpoint:
`pg-owner-docker28-24190/`, invocation
`da4771b8-f1a2-4098-b971-591cd1edb37f`,76.219s, including real PostgreSQL/main
migrations, Ryuk, original-error preservation, failed-start cleanup and live
sibling protection; exact report validation and terminal zero-leak checks pass.
`with-owned-docker.py` pins the same explicit Unix endpoint for fresh SDK,
worker and CLI/finalizer processes and checks daemon identity before each run.
The original29.9.2 endpoint remains installed and unqualified for this allocator
contract. P5 remains open for the corrected-source re-freeze and full affected
qualification; Linux55/both-Node/phase/Darwin evidence is not inherited from
the8-case endpoint prerequisite check.

The owner subsequently authorized committing and pushing after completion,
then clarified that S5.3a itself must be finished before push. Local qualified
phase commits continue; no intermediate push, PR, shared-branch merge or manual
CI dispatch/rerun is authorized. The owner will execute the prepared commands
on native Apple Silicon with Docker Desktop after pulling the committed branch.
That explicit manual handoff permits publication with the recorded Darwin/R20
gates still open; historical hosted receipts remain separate.

### A11 ordinary-fixture corrections and measured load blocker (2026-10-23)

The complete ordinary discovery at clean source
`12ad4550bed3e75b842278442b62e22b7892b8bf` is 584 files / 5185 cases.
All 25 serial groups executed on Node24.15.0; 23 groups (536 files / 4753
cases) passed the existing report validator and exact-title reconciliation.
Groups11 and16 retain three failures; they are not accepted by retrying their
packages. External evidence remains under
`/tmp/maister-s53a-ubuntu-qlpo_wtn`, including the frozen group inventory,
`web-integration-accepted-12ad4550b-e3b0c44298fc.json` and each group's
`command.json`, original reporter and qualification/failure audit.

- [x] **P7 — Correct bounded-output transport and failed-case cleanup (Ubuntu).** The
  owner authorized this narrow fixture correction. Group11's original
  S2.8 assertion expected exhausted real HTTP409 retries but resolved; the
  following S2.5 case then processed the failed case's pending command and
  failed its own application assertion. The native transport must bound each
  socket's receive buffer before connecting and hold only the two existing
  8 MiB responses. Observe the actual two server SQLite response-spool IDs
  across retry exhaustion/cancellation/held409, then their removal before
  recovery. Reuse the invocation compiler watchdog and exact child registration;
  join normal release, fail forced containment, join outstanding assertions,
  independently attempt all cleanup, and remove only the failed synthetic
  command before restarting projection. Keep all26 titles and deadlines.
  Execute behavioral RED, minimal GREEN, transport/cleanup falsifications,
  exact restoration and both-Node complete-owner GREEN; audit discovery and
  affected group11. Fresh Darwin owning26 remains part of the handoff.
- [x] **P8 — Supply fixture Git identity and own publish bare roots (Ubuntu).** Group16
  failed before its publish assertion because bare `commit-tree` had no author
  identity. That setup failure is not behavioral RED. The independently
  executed `publish-original-root-red-24150` reached its absence assertion:
  `/tmp/publish-bare-fP5TM5` survived completed teardown. Its recorded inode and
  exact failed Git argv/parent SHA prove ownership; other correlated paths do
  not automatically grant deletion authority. Reuse the per-command Git helper
  and canonical registered temporary-home helper, create remotes under that
  parent, attempt every cleanup and assert each allocated path absent before
  outer containment. Preserve all10 titles. Falsify root placement, restore exact
  sources, qualify both Nodes and affected group16, and retain allocation/absence
  identities. Do not change production publish/worktree code or global Git config.

Group11: invocation `50e94483-875c-4201-bd3d-c16944d95caa`, 374.873408s,
218/220 passing; report SHA256
`dd07c46c7a924ef0ae38dc18c15e57bb8ae7a1ac525f96ea19e6a00befab75fc`.
Group16: invocation `ce008dbf-40a9-4b00-be36-6ccaf1674def`, 227.944968s,
211/212 passing; report SHA256
`c77681bfa3b7f5751cd3eeebac84901514661f03b012a8011c30e0b769ac6513`.
Registered-resource cleanup passed those groups, but the independently found
unregistered bare-root leak still fails resource acceptance.

R20's original full run at this source remains invalid: 71.884813 rows/s below
the unchanged360 floor (`a11-12ad4550b-d28-event-plane-load-24150`, invocation
`8765f262-7a56-460b-9b7e-1454c2f7a008`, 1248.195464s, report SHA256
`86831b58ba523af8dca69a114618b5b5bf5899ea997ddee619bae17b5c576b1b`).
This is a missed load-profile prerequisite, not behavioral RED. A separate
bounded observational run (`a11-r20-sqlite-diagnostic-24150`) used external
SQLite method timing and parent-owned fsync tracing without repository edits.
Its299.119s measured window spent235.574s in synchronous SQLite methods:
132.712s COMMIT,59.472s preparation;72,966 WAL fsyncs consumed98.898s
(overlapping COMMIT time). Instrumentation changes timing and proves no safe
optimization. This diagnostic exited124 at its420s observation limit; terminal
containment discovered10 processes and1 container, so it is explicitly failed
and supplies no qualification. `cleanup-audit.json` verifies zero remaining
owned processes/containers and both registered roots absent. A separate attempted
early signal was refused because the runner's environment lacked the invocation
tag; the guard was not bypassed. `timing-audit.json` retains the complete measured
scope. The owner explicitly chose to leave R20 open and run the unchanged gate
on Mac; production SQLite optimization is not authorized in this continuation.
The handoff must include R20 without relabeling a Mac result as Ubuntu load
qualification. A11/C3/G-LINUX remain open.

### P7 — reached transport/cleanup evidence and exact restored source (2026-10-25)

The original group11 failure above is the behavioral RED. Merely adding spool
observations to the old transport passed26/26 (`bounded-spool-red-24150`);
that nondeterministic attempt is not RED. The native two-socket fixture then
passed26/26. Valid v2 falsifications run every original title: releasing the
sockets before returning fails the actual held-spool assertion (25/26); an
intentional interruption after acquisition retains the original error while
removing the exact failed command (25/26); removing that deletion reaches
`failed draft command survived fixture cleanup` with one real PostgreSQL row
remaining (24/26, including the subsequent application failure). All runtime
process/container sweeps were clean. Evidence directories are
`bounded-holding-falsification-v2-24150`,
`bounded-cleanup-failure-control-v2-24150`, and
`bounded-cleanup-falsification-v2-24150`, each with its original reporter and
`falsification-audit.json`. The first cleanup-removal attempt was insensitive
and is explicitly rejected in `bounded-cleanup-falsification-24150/invalid-falsification.json`.

`bounded-falsification-v2-restoration.json` proves exact source restoration;
restored26/26 passed on both exact Nodes. The final review then moved worker
shutdown before SQLite snapshot acquisition, so snapshot failure cannot
replace a still-running worker. Both complete owners and the entire affected
24-file group were executed again on these final code bytes:

| Gate / evidence directory | Node | Cases | Duration | Invocation | Report SHA256 |
|---|---|---|---|---|---|
| `bounded-reviewed-green-24150` | 24.15.0 | 26/26 | 77.183470s | `0a054f53-0b43-416a-a94e-5f28c18964aa` | `84db2bcb13b38e23b776869a072971360ea90b520f14e5cea318bcb00e56f5de` |
| `bounded-reviewed-green-24190` | 24.19.0 | 26/26 | 81.022682s | `4c719277-c273-4f41-8f9c-b00d18a60298` | `4a263299c4efdabc5d2572b6e8b3b82607ffb314f54b9dd7f3d90e111f2e785a` |
| `bounded-reviewed-group11-24150` | 24.15.0 | 220/220 | 359.072228s | `97fa118b-3cc8-4e06-a269-179e0fdf3e9f` | `f4ea1bc1d2546d8fc457b7d4edf24befc3bc1b0e541523b7173d2d9d9f7d444f` |

These receipts bind HEAD `12ad4550bed3e75b842278442b62e22b7892b8bf`
plus the recorded dirty-source snapshots, not the later evidence-text commit.
Each has exact original title reconciliation, existing validator success,
zero pending/todo/runtime errors and zero terminal leaks. Final web typecheck,
changed-source lint, contracts, docs and diff checks passed
(`bounded-reviewed-*-24150`). All original26 titles, deadlines and8 MiB
payloads remain. Fresh Darwin26 is still pending; P7's checkbox is local Ubuntu
fixture acceptance only and does not close A11/C3.

Final corrected code SHA256:

- `web/lib/execution-host/__tests__/bounded-output.integration.test.ts`: `61f132e3eee356ada5217af5903725a4fae1bd3d917c3e29708076bb0e15a68e`.
- `web/test-support/held-http-reads.ts`: `f7605699bc2145047e6a010c175ffacd7b9aa69f055e16c83aa224b0df0fb9fa`.
- `web/test-support/fixtures/held-http-reads.c`: `4b6d46fb4782aacdf5fef12a266af2cb168bed595699e8835f2836dfe91d5927`.
- `web/test-support/process-invocation.ts`: `f4a552ea58ea421dc7fa96e6a13fdae6f32e587203d8274918f9d26939ea935f`.

A separate resource audit found that older external raw `vitest list` commands
ran setup files without teardown. `discovery-root-leak-proof.json` identifies
2078 empty roots from four exact discovery invocations using recorded inode,
device and marker identities; its SHA256 is
`b1ace625e7ef91173403e92cf2d8a66255ce6735f80bc1efb05287a426a3040f`.
The guarded `discovery-proven-root-containment-24150` reclaimed only those
proven roots; `discovery-root-cleanup-audit.json` confirms0 recorded survivors.
Their original resource acceptance remains failed. New discovery uses a private
invocation, joined real Vitest process and explicit `releaseInvocation`:
`bounded-final-owned-discovery-24150` passes the unchanged37 titles across
bounded-output/publish/R20, with all3 created roots absent. This does not
convert the original raw-discovery leaks into accepted runs.

### P8 — Git identity and bare-root lifetime qualification (2026-10-25)

The original Git identity setup failure is not behavioral RED. The independent
real filesystem absence assertion (`publish-original-root-red-24150`) is RED;
`publish-proven-root-archive.json` preserves the exact proven original leaked
repository without deleting correlated but unproved paths. The corrected owner
reuses `git` for the bare `commit-tree` identity and `mkdtempReal` for its
canonical registered home, nests all ten bare remotes there, independently
attempts cleanup and verifies all ten paths absent before containment.
Production publish/worktree code and global Git config are unchanged.

The placement-removal falsification runs all10 product assertions successfully,
then fails the actual afterAll absence assertions for10 real surviving roots:
`publish-placement-falsification-24150`, invocation
`a1f81968-dc34-4a99-b33d-bf272d9f1799`,13.282897s, reporter SHA256
`e42d5b880cf659f50c701d5758a2992c5b035653186e664bfa283ef23a6f1b2b`.
The existing validator rejects that reporter. Its pre-containment proof records
every exact allocation/path/device/inode; only those ten roots were archived
under its external evidence directory. Containment does not change this failure.
`publish-falsification-restoration.json` proves exact source restoration.

| Gate / evidence directory | Node | Cases | Duration | Invocation | Report SHA256 |
|---|---|---|---|---|---|
| `publish-owned-green-24150` | 24.15.0 | 10/10 | 14.266043s | `41fbbb34-5a53-47af-bb86-a61eece991cb` | `88f072bed3626fb97330079e40b914962c852a5d46e90871b84cb534d522e627` |
| `publish-restored-green-24150` | 24.15.0 | 10/10 | 13.759001s | `693161fb-7ee5-438a-98e0-06b1f518e6d5` | `adf24e1c0a6bf714401e6e84b8b728d299684b53dc78e6aad14fa37b215b9622` |
| `publish-restored-green-24190` | 24.19.0 | 10/10 | 13.577993s | `5b51312d-b623-45c3-af70-157df1b634ca` | `6626fbd24ade4d653a560086f769b4c1109797c9c2af17709f51266739764570` |
| `publish-final-group16-24150` | 24.15.0 | 212/212 | 218.124315s | `3576cd31-7f62-4699-bccb-00df71f0fdde` | `2c649c8effd60a2280ba89dda057404335b0ea9fce846db0188b2d3ab7996521` |

All four GREEN receipts observe ten allocations and ten matching absences;
exact original titles, report validators and terminal zero-leak checks pass.
They bind HEAD `5085e5c000800826efb6066c37c63ea533630295` plus the
recorded patch, whose publish test SHA256 is
`a68acec2cf72570de57da4ac197014b6ae368905f82a5783ae8ef67b1dc4b567`.
Final web typecheck, changed-file lint, contracts, docs and diff gates pass.
`publish-final-owned-discovery-24150` confirms the unchanged37 titles with
explicitly joined cleanup and all3 roots absent (discovery SHA256
`af8a13b51918cbcbea1d74e2e66d53eaa86b49a7e0c9ea7d26c1c1c1f430d79e`). Fresh Darwin10 remains pending. The phase
checkbox records Ubuntu fixture acceptance only; final combined-source Linux
and the independent full-phase R20/Darwin gates remain open.

### Final Ubuntu candidate, requirement audit and remaining gates (2026-10-25)

The final tested code commit is `3d97c9dcf6c200c6b54ce0c8258c7766f7fdac3d` (tree
`09497e1f716abc811a6213146aac3e36e0f86a45`). P7 is `5085e5c000800826efb6066c37c63ea533630295`;
P8 is this final code commit. A subsequent evidence/handoff commit changes only
documentation and does not relabel these commands as executed at that later SHA.
Each complete Linux55 invocation below starts from the clean frozen code tree
and uses its own fresh production build, with a separate preflight on the same
Node version. All four reports validate the exact inventory and finish with
zero terminal leaks; original failed attempts remain separately recorded.

| Gate / external evidence directory | Node | Cases | Duration | Invocation | Report SHA256 |
|---|---|---|---|---|---|
| `a11-3d97c9dcf-d28-preflight-24150` | 24.15.0 | 1/1 | 13.146073s | `d4e3fc04-9347-42a4-9504-b0128327cb4b` | `ae75ec49d33fc79f6b014cd1ba16a710c661e728f45485fb442282cb9a770bba` |
| `a11-3d97c9dcf-d28-linux55-24150` | 24.15.0 | 55/55 | 1644.042760s | `6377e1c5-67e8-4999-b2f6-cbf9b3ad6645` | `8584413f88365cd192265a3eb3529cfa1123629bd8ade1bb978b44e5b4630f7c` |
| `a11-3d97c9dcf-d28-preflight-24190` | 24.19.0 | 1/1 | 11.738693s | `2c5152bb-4ada-4def-aef9-63c956057b03` | `bc9806ca59484674312b44c3bcfe96e6c455ee458c0568adf4ec59fbbf45ac74` |
| `a11-3d97c9dcf-d28-linux55-24190` | 24.19.0 | 55/55 | 1554.554620s | `12b3c844-a642-417f-b50e-5d431b94d769` | `461749283a8659ccfd752ff925e5d9da221ed3a00c10b81cb2e69fbd0ab7c337` |

The external evidence root remains `/tmp/maister-s53a-ubuntu-qlpo_wtn`.
`qualification-source-3d97c9dcf.json` records Ubuntu24.04.5, kernel6.8.0-147,
x86_64, non-root UID1000, exact Nodes, pnpm11.6.0, Git2.55.0,
Bubblewrap0.9.0-1ubuntu0.3 and its binary/AppArmor identities. Existing Yama1
and restricted user namespaces1 remain enabled. Test databases use the task-owned
rootless Docker28.5.2 endpoint and the pinned runtime cohort; the shared29.9.2
allocator remains unqualified and was not repaired by changing application code.
During this final qualification, no host security setting, shared Docker
service or production data changed.
`static-final-3d97c9dcf.json` records all11 final static/runner/runtime/contract/
docs/lint/diff gates passing at the clean source.

After qualification, the task-owned Docker unit was stopped on 2026-10-26
only after its container and volume inventories were both empty. The private
endpoint no longer serves; the shared daemon and all nine container records
(including six running services) have identical IDs, states, start times and
restart counts before/after. Yama, namespace restrictions and the AppArmor
profile hash are unchanged. `owned-docker-final-cleanup.json` retains these
checks; external evidence and the pinned runtime files remain available.
`handoff-source-equivalence.json` verifies that the handoff changes only the
three existing documentation files and that its embedded commands exactly
match the syntax-checked artifact. Final docs/contracts receipts remain in
the same external evidence root under `handoff-recorded-docs-24190` and
`handoff-recorded-contracts-24190`.

The original complete ordinary inventory ran at `12ad4550b`:584 files/5185
cases, with three failures in groups11/16. Its23 unaffected groups have accepted
exact-source receipts for536 files/4753 cases. P7 then passes the complete
24-file/220-case group11, and P8 passes the complete24-file/212-case group16.
Those source-labelled receipts cover all original5185 titles; they are not
represented as one fresh whole-ordinary invocation at the final HEAD. The
unchanged ordinary source files and production code are compared explicitly in
`a12-final-candidate-3d97c9dcf.json`. The only shared helper delta since12ad is
exporting the existing native compiler function for P7; its body and all
ownership guards are byte-identical. P7's new behavior has its own reached
RED/falsifications and restored owning qualification, followed by final Linux55.

The full phase receipts at12ad retain their source identity:

| Gate / external evidence directory | Files / cases | Duration | Report SHA256 |
|---|---|---|---|
| `a11-12ad4550b-d28-web-unit-24150` | 884/9222 | 352.202873s | `3addce418c2b0ae1399087a5238271da610091b1cb5e5f0dcb51dda454aa10ed` |
| `a11-12ad4550b-d28-supervisor-unit-24150` | 50/495 | 18.747410s | `6a7ff0e1425a90b5a9d86e41c78173fa73e364126f6373d0b7fe795974e04a43` |
| `a11-12ad4550b-d28-supervisor-integration-24150` | 36/310 | 408.990084s | `cf05d14367013626c0eb210ba9e608225c1658f499812341e69b89e9c20c6bea` |
| `a11-12ad4550b-d28-scheduler-clock-24150` | 1/6 | 181.038510s | `455866f07be049f28bbd3752b48e0201289773e9ba32b1e62ad0e4425439ae56` |
| `a11-12ad4550b-d28-host-span-load-24150` | 1/1 | 139.291442s | `76d14bdee114d8d79a5ba2755eee574f20ea740fca8bf58670cecf9bc99f57be` |

Their code paths remain unchanged by P7/P8. R20 is the explicit outstanding
full-phase failure, not a skipped or waived case. No claim of complete C3 or
G-LINUX follows from the passing isolation lanes alone.

The independent requirement/source audit is complete as preparatory work;
A12's qualified-candidate checkbox remains open because its G-LINUX dependency
is not satisfied. Final read-only review found no remaining P7/P8 blocker.

| Requirement | Current exact-source evidence / remaining boundary |
|---|---|
| LNX-01 | I1/I4 and separate preflight pass in both final Linux lanes; actual protected storage denial and positive supervisor witnesses remain mandatory. |
| LNX-02 | I2 and LI-boundary retain required reads, exact allowed writes and actual read-only failures; both final lanes pass. |
| LNX-03 | LI-boundary passes descendant/setsid, alias/proc/FD/namespace and privilege escape assertions with the original policy; no widened mounts. |
| LNX-04 | LI-refusal and O-identity pass typed capability/policy/ownership refusal before app execution. |
| LNX-05 | O-identity and LI-kill retain exact signal authority and live foreign-process witnesses. The unchanged guard's original valid falsification/restoration remains source-labelled. |
| LNX-06 | LI-term observes code137/null separately from null/SIGKILL; production drain and existing O-signal pass. |
| LNX-07 | All9 namespace lifecycle cuts report0 survivors before containment; both foreign witnesses remain alive on each exact Node. |
| LNX-08 | I3 remains the continuity owner. LI-refusal observes one invalid-policy attempt/no replacement and all8 reached acquisition/handoff cancellations; late work is joined, no later launch is admitted and original errors survive. |
| LNX-09 | Existing local O-controls and invocation cleanup pass; shared resources remain outside authority. A14's proposed Linux hosted finalizer is excluded and is not claimed implemented. |
| LNX-10 | Final Linux55+separate1 exact reports and strict runner/receipt validators pass; original Darwin50 and19/31 contract are unchanged. Fresh Darwin reports remain pending. |
| LNX-11 | Valid enforcement/namespace/watchdog/identity falsifications and exact restorations are retained; unchanged guards plus fresh both-Node Linux execution are audited. Full-phase R20 and fresh Darwin prevent C3 completion. |
| LNX-12 | Current two-job macOS hosting is retained by the owner's scope constraint. Linux hosted execution is unproved; no A14 recipe, migration or hosted claim exists. Formal A13 acceptance still depends on A12. |

The actual API/DB/config/deployment audit against8ad23a5fc finds one production
code change: promotion claim-order precedence in `web/lib/runs/promote.ts`.
It retains the existing CONFLICT/PRECONDITION codes and payloads. Routes,
events, auth grants, main/Brain schemas and migrations, supervisor SQLite
schema14, configuration, dependencies and deployment artifacts are unchanged.
Main migration remains0193_numerous_spectrum; Brain remains0006_brain_indexing_profiles.
The macOS workflow SHA256 remains
`84401cb7cdf1dda675f0bd7249bc4dc2d8297c6ee6de1c65fd0f85b7067c12a7`.
Git2.43 compatibility was not changed; Git2.55 passed the unchanged restore owner.
No production SQLite optimization was authorized or implemented.

The read-only origin recheck resolves master to
`698b8cb35151b089d492c13cf3bcdc28a3858281` and the handoff branch
to its original8ad23a5fc tip. Highest actual ADR remains193; ADR193, its hub
and both migration journals are identical to that master source. No new
allocation or rebase was needed. Both required357ae6cfd/8ad23a5fc ancestors
are present (`a12-pre-handoff-remote.json`).

At the Linux handoff, the remaining gates were fresh native Darwin50 and independent preflight,
Darwin bounded-output26/publish10, and the owner's unchanged R20 measurement.
A Mac R20 result must keep its platform label and cannot retrospectively turn
Ubuntu's71.884813 rows/s attempt into an accepted load profile. P3/P5's complete
phase clauses and A11/A12/A13/C3 remain open accordingly. A14 is excluded;
A15/hosted acceptance is not completed by the authorized branch handoff push.
Historical CI-R9d/S5.2 remain closed at their original exact hosted source;
parent stabilization stays43/45, S5.3/S5.4 remain open. The subsequent Mac run
below supplies the current disposition of these pending gates.

### Native Darwin handoff results (2026-10-26)

Executed the exact command block below on clean
`f16ec6124a5b55df1618cc4606148937b8610e2c` (tree
`ebe5b55c90089afe571b4677ca3041c0363c6b46`). Its code is unchanged from
`3d97c9dcf`; the intervening commit changes documentation only. Environment:
macOS26.6.2/Darwin25.6.0 ARM64, Node24.19.0, pnpm11.6.0, Docker Desktop29.4.2
with its existing12 CPUs/20,942,036,992 bytes. Node's archive matches the
handoff SHA256. No runtime code, SQLite setting, deadline, load profile,
Docker resource setting or CI recipe was changed.

Evidence root: `/private/tmp/maister-s53a-darwin-z4kVXS`. Each stage retains
its original log, invocation descriptor, attempt and outer-cleanup JSON;
only passing stages have an accepted receipt. Reporter paths below are
relative to that root. Receipt report hashes were independently recomputed;
passing reporters have no failed or pending cases.

| Stage | Result | Lane duration | Reporter |
|---|---|---|---|
| Independent preflight | 1/1 passed | 5.350s | `maister-ab-isolation-HezOUW/vitest.json` |
| Bounded-output | 25 passed,1 failed | 34.054s | `maister-ab-web-wufREm/vitest.json` |
| Publish | 10/10 passed | 5.864s | `maister-ab-web-PFYO7c/vitest.json` |
| Darwin50 | 50/50 in all7 suites passed | 573.266s;574.458s including outer finalization, below2340s | `maister-ab-isolation-L99QE9/vitest.json` |
| R20 | 0/1,7 reported unhandled errors; diagnostic only | 393.880s | `maister-ab-web-TixzxR/vitest.json` |

All five lane sweeps report zero leaks; all five outer finalizers have empty
cleanup/acceptance-error lists. Failed test exit codes remain1, and the
overall script exits1. This cleanup result does not turn either failure green.
Darwin50 invocation is `68e90fd0-92c8-4f4b-8d86-1a9906e69da6`; its reporter
SHA256 is `0630a49d02ee7a4fa340c6136b6f08b718e4d5f78d5997e35c7471b4183f7c40`.

Bounded-output fails before the draft adapter assertion:
`held-http-reads.c:73` uses `INADDR_LOOPBACK` while defining
`_POSIX_C_SOURCE=200809L`. The installed Darwin SDK exposes that macro only
without `_POSIX_C_SOURCE` or with `_DARWIN_C_SOURCE`. This is a fixture
portability/compile failure, not behavioral RED. Preserve P7's Linux proof;
repair the portable loopback-address construction and rerun the complete26
owner before claiming Darwin qualification.

The owner explicitly selected diagnosis under current background load after
the quiet-host prerequisite failed. Recorded R20 load averages are15–17
(one-minute), above the test's less-than8 guidance; observations are in
`load-observations.jsonl`. At220.925s, the stream records PostgreSQL
`could not extend file "base/16384/19382": No space left on device`.
The fixture configures PGDATA as512MiB tmpfs. Later queries fail with SQLSTATE
53100 and finally `the database system is not yet accepting connections` at
the post-window query; `r20Summary` is absent. The exhausted relation/WAL
breakdown was not measured before fixture cleanup, so no storage optimization
or capacity amendment is inferred or applied.

Independent calculation from330 raw samples, using the test's post-warmup
head-delta formula, gives392.812 rows/s. This is a diagnostic derivation, not
an accepted R20 summary. Maximum sampled host-to-manager lag is23,414; the
last sample has589 subscriber pauses and10 disconnects. Neither throughput
alone nor the clean teardown satisfies the load gate. Ubuntu's71.884813
rows/s failure retains its own platform/source identity. Remaining work is
the bounded-output portability correction, R20 storage/failure diagnosis and
qualified reruns; A11–A13/C3, S5.3/S5.4/C11 and Linux hosting remain open.

### Active corrective pass after the Mac handoff (2026-10-26)

The owner authorized fixing the remaining failures and completing A11–A13/C3.
Preserve macOS hosting and no-push scope. First replace the held-read helper's
non-POSIX loopback macro with POSIX address parsing; its two loopback sockets,
bounded receive buffers, held bodies and release contract remain unchanged.
The existing compiler failure is portability RED, not behavioral falsification;
the full26-case owner must reach and pass its original transport assertion.
Measure R20's actual PostgreSQL relation/index/WAL footprint before choosing a
storage correction; retain its load, durability, deadlines and acceptance
assertions. Requalify affected source on Darwin and native Ubuntu at both exact
Nodes before changing completion checkboxes. Evidence remains outside git.

The repeated Mac storage diagnostic reaches ENOSPC with roughly256MiB of
`run_messages` TOAST for18 live messages (11MiB logical /193KiB compressed
values), while autovacuum visits the table about once per minute. Qualify a
one-second test-database autovacuum interval against the unchanged R20 owner;
keep512MiB, WAL64/32, default vacuum workers/costs and enabled durability.
The existing bare-lineage control verifies the effective setting. This is a
test-fixture scheduling correction, with no production configuration/schema
change. A diagnostic success alone cannot close R20 acceptance for a later source.

The owner explicitly removes the `load < 8` admission condition. Record host
load and mains power in evidence, but judge R20 by its unchanged throughput,
lag, settlement, pressure and leak assertions. Do not run another qualification
lane on the same host. Higher host load alone does not disqualify a passing run;
historical failed assertions remain failures.

The current corrective source passes native Darwin ARM64 R20 on Node24.19.0
with AC power and starting load19.285:393rows/s, maximum lag52, first/last
minute unacknowledged maxima52/50, all nine canonical settlements, zero
pressure/refusals/producer pauses/stream errors and zero leaks. The complete
386.040s invocation `e7fa18df-7c3d-4745-83d5-352970505d42` records1/1 and
unchanged tracked source at base `7bad3a8b6` plus its captured corrective diff
in `/private/tmp/maister-s53a-closeout-20261026/r20-current-24190/`.
Node24.15.0 also passes on AC at starting load8.916:395rows/s, maximum lag54,
first/last minute unacknowledged maxima54/52, nine canonical settlements,
zero pressure/refusals/pauses/stream errors and zero leaks in384.537s
(`r20-current-24150`, invocation `83d37ecb-44ee-44d9-a7af-6bef82a0c276`).
These receipts precede the watchdog correction below. This is local Darwin
acceptance, not hosted or Linux acceptance. The full web unit suite on the
same production source passes9222/9222.

The owner now explicitly authorizes production SQLite optimization with TDD,
unchanged durability and the360rows/s floor. Start with bounded per-connection
prepared-statement reuse: observe real SQLite compilation on repeated durable
outbox appends, verify replay after reopening, and preserve independent active
iterators. Do not alter transaction boundaries, WAL/FULL, admission accounting,
publication-after-commit or error propagation. Measure restored R20 on both
platforms before claiming the optimization sufficient; further transaction
changes need their own documented invariants and reached RED controls.
The fresh Mac acceptance attempt starts on AC at load5.95 but fails the
unchanged last-minute/first-minute unacknowledged maximum ratio (82 >70),
despite393rows/s and nine canonical settlements. Keep that failure distinct
from the preceding diagnostic GREEN395rows/s. C3 remains open.

Prepared statement reuse is committed as `7bad3a8b6`: real compilation RED,
reopen replay GREEN, shared-cursor falsification and restored full supervisor
807/807 on both Mac Nodes, plus complete Ubuntu integration on24.19. This is a
qualified optimization phase, not R20 acceptance. Its native Linux R20 fails
the throughput floor at approximately87rows/s. The next candidate moves only boot-scoped parser credits
to transactional SQLite TEMP tables: all admission snapshots include them,
failed durable spends roll back them, persistent wallets/files/events/ACKs keep
WAL/FULL, and legacy persistent credits are audited before boot retirement.
Require real frame-only no-main-commit RED, live quota, rollback and reopened
event controls before treating that change as qualified. No durability mode,
load profile, floor, deadline or CI change is authorized by this optimization.

The frame-credit candidate passes808/808 on both Mac Nodes and its quota-omission
mutant fails the real live-budget assertion. Continue the same corrective phase
with recoverable producer log/spool progress in TEMP, while retaining durable
capacity before bytes: reserve raw-log growth in64KiB blocks, include current
progress in every live budget/read, seal exact bytes, and inventory interrupted
files on restart. No object-upload progress is deferred. Require a reached
real-file/no-extra-main-commit RED and restored accounting/restart control,
then complete both-platform regression and unchanged R20 for the combined source.
The combined transient-credit/progress candidate reaches208rows/s on native
Ubuntu24.19, with nine canonical settlements and zero leaks, but fails the
unchanged360 floor. Its complete1226.837s receipt and frozen source are retained
under `closeout-r20-sqlite-transient-24190` on the Ubuntu evidence root.
The next read-cost candidate combines the fresh admission budget in one SQL
statement and avoids pressure/debug statistics reads when their results are
unused. Real SQLite controls reach RED (six reads instead of one; two unused
publisher reads instead of zero), then GREEN with fresh values, durable replay
and enabled debug output preserved. The full supervisor suite passes811/811 on
both Mac Nodes. Its current native Ubuntu24.19 R20 completes in1238.534s
with223rows/s, all nine canonical settlements and zero leaks, but fails the
unchanged360 floor (`closeout-r20-sqlite-reads-24190`, invocation
`3ce6e542-da6c-4be4-a076-b99f460b83cc`). Persistent SQLite remains WAL/FULL.

Fresh corrective Darwin50 on24.19 reaches49/50: O2-runner catches an owner
inspection race (`proc_pidinfo` reports ESRCH while PID liveness remains true),
then its watchdog kills only itself and leaves the tagged Vitest worker for
the containment sweep. This is a real failed ownership gate, not a load waiver.
Qualify the error path with a reached selected-read denial and a live unwatched
child: freshly inspected, wholly owned groups must retire before containment;
foreign or uninspectable groups never acquire signal authority. Preserve the
500ms watchdog cadence and all deadlines. Evidence is retained under
`current-isolation-24190`, invocation `53654c80-073b-4eee-8b28-59d87751dcfc`.

The selected-read denial reaches behavioral RED: the original watchdog leaves
an owned unwatched child alive. The correction freshly inspects the entire
group even when owner lookup fails, signals only wholly inspected owned
membership, and always stops itself if group inspection fails. Removing the
membership guard reaches a distinct falsification: the foreign tagged child
is killed. The guard is restored byte-for-byte; the complete cleanup owner
passes13/13 on both Node24.19.0 and24.15.0, in97.999s and96.197s, with zero
leaks and unchanged tracked/untracked source. Receipts are
`watchdog-read-failure-red-24190`, `watchdog-foreign-guard-mutant-24190`,
`watchdog-restored-green-24190` and `watchdog-restored-green-24150` under the
Mac closeout evidence root. Full Darwin50/Linux55 requalification remains open.

The next measured correction removes repeated reads only within one synchronous
operation: pressure refresh returns its fresh budget, physical admission reuses
that exact budget, and file-backed physical measurement avoids unrelated page
statistics. Public diagnostic snapshots retain page/freelist statistics. Already
funded producer progress updates only TEMP and checks the storage-failure latch;
all capacity growth and durable writes still measure physical headroom, and real
file/SQLite errors still latch failure. No cross-operation result cache is allowed.
Require reached real-SQLite read-count RED, current pressure/accounting and
failure-latch controls, restored full supervisor suites and new native R20.

A bounded next correction may commit one validated text-update frame's raw line
and semantic update together. The pair keeps its original ordering and both rows
must be WAL/FULL committed before any runtime/session listener sees either row.
Use one existing decoder/frame reservation, at most two event envelopes and the
unchanged physical write headroom. Any second-row failure rolls back both rows,
sequence allocation and reservation spends. No transaction spans an await.
Only ordinary text chunks with no usage record use the pair; permissions,
responses, tool updates, guardrails and invalid frames retain their existing paths.
Any required content objects must be durably sealed before the paired event commit. Invalid-frame raw evidence must still be preserved.
Require reached real-ACP/durable-commit RED plus SQLite observer/reopen/rollback
controls, a killed partial-commit mutant, all producer/guardrail/pressure suites
and fresh native R20. This is an internal transaction-boundary change with no
API, stored schema, durability mode, workload or acceptance-threshold change.

The next measured admission correction shares one fresh file-budget read across
headroom and funding checks inside their existing synchronous transaction.
Allocation still refreshes the changed budget afterward. Releasing a boot-owned
TEMP frame uses one cascading DELETE and the storage failure latch, followed by
fresh capacity observation; it must not require new physical write headroom to
return already-funded credits. Require real SQLite read-count RED, exact credit
release/foreign-owner/pressure controls, restored full suites and both-Node R20.

The credit candidate's native minimum-Node R20 reaches366rows/s but fails the
unchanged unacknowledged-growth bound (270 >265); it is not accepted. The saved
manager profile identifies SQL construction as a material CPU cost. Bound the
event INSERT query shape independently of batch size by sending one parameterized
recordset, retaining the same database row types, transaction, constraints,
classification, duplicate handling and returned-ID check. Require real PostgreSQL
RED for the query parameter bound, identical stored outcomes, rollback/retry and
Unicode/bigint controls, falsification, then fresh full R20 and regression.

### Owner handoff — native Apple Silicon with Docker Desktop

The first execution and its remaining failures are recorded above. For a new
candidate, run these commands on the owner's native
macOS ARM64 host, with Docker Desktop running, a non-root shell, Git, Apple
command-line tools (`cc`), and GNU `gtimeout` (the `coreutils` package). Do not
run the Intel/Colima CI provisioning recipe on this host. This is local Darwin
regression, not hosted Intel or Linux qualification. Do not change Docker
resources, test deadlines or the R20 load profile to obtain a pass.

Use exact Node24.19.0 and pnpm11.6.0. If they are not already selected, this
optional private tool installation changes only its newly created `/tmp` tree:

```bash
set -euo pipefail
test "$(uname -s)" = Darwin
test "$(uname -m)" = arm64
export S53A_TOOLS="$(mktemp -d /tmp/maister-s53a-tools-XXXXXX)"
curl --fail --show-error --location https://nodejs.org/dist/v24.19.0/node-v24.19.0-darwin-arm64.tar.gz --output "$S53A_TOOLS/node-v24.19.0-darwin-arm64.tar.gz"
printf '%s  %s\n' 8294b7aa9b03997481c06babf1e8b270c859358f27da57a11509afe537ac381d "$S53A_TOOLS/node-v24.19.0-darwin-arm64.tar.gz" | shasum -a 256 --check
tar -xzf "$S53A_TOOLS/node-v24.19.0-darwin-arm64.tar.gz" -C "$S53A_TOOLS"
export PATH="$S53A_TOOLS/node-v24.19.0-darwin-arm64/bin:$PATH"
npm install --prefix "$S53A_TOOLS/pnpm" --no-save --package-lock=false pnpm@11.6.0
export PATH="$S53A_TOOLS/pnpm/node_modules/.bin:$PATH"
node --version
pnpm --version
```

From the repository root, set the **full handoff commit SHA supplied by the
agent after its final documentation commit**. The tested Linux code source is
recorded in the final candidate table; the handoff commit may add only these
documentation/evidence instructions. The script refuses a different HEAD or
any dirty source. Preserve unrelated Mac work before selecting this commit.

```bash
export S53A_EXPECTED_SHA=PASTE_THE_FULL_HANDOFF_SHA
test -z "$(git status --porcelain)"
git fetch origin codex/s53a-qualification
git switch --detach "$S53A_EXPECTED_SHA"
export S53A_HANDOFF_SCRIPT="$(mktemp /tmp/maister-s53a-command-XXXXXX)"
node --input-type=module - "$S53A_HANDOFF_SCRIPT" <<'JS'
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const plan = readFileSync(".ai-factory/plans/s53a-linux-isolation.md", "utf8");
const match = /^<!-- S53A_DARWIN_LOCAL_BEGIN -->\n```bash\n([\s\S]*?)\n```\n<!-- S53A_DARWIN_LOCAL_END -->$/m.exec(plan);
assert(match, "missing exact Darwin handoff command block");
writeFileSync(process.argv[2], match[1] + "\n", { mode: 0o600 });
JS
bash "$S53A_HANDOFF_SCRIPT"
```

The five stages run serially: independent preflight1, bounded-output26,
publish10, fresh-build Darwin50 and unchanged R20. Each uses the existing lane
and report validators. The ordinary37-title snapshot comes from joined,
invocation-owned final discovery; this recipe does not run raw `vitest list`,
which previously leaked setup roots. R20 remains independently failed/open on
Ubuntu regardless of a later Mac outcome.

An untagged outer controller publishes a private invocation descriptor before
launch; only the child runner receives its ownership tag. After the runner is
proved dead, existing `releaseInvocation` verifies and reclaims that invocation.
A live or uninspectable runner, changed ledger or changed cleanup implementation
refuses release. A missing runner record never authorizes signaling live
processes. Test failures, timing failures and containment leaks remain failed;
a final receipt is written only after successful tests and successful outer
cleanup. A cleanup failure stops later stages; a cleanly finalized test failure
retains the failure and allows the remaining independent stages.

The shell and Node syntax checks passed locally. Portable real-process controls
at `darwin-control-portable-xcofdf/audit.json` on Linux/Node24.19.0 verify both
registered and unregistered live-runner refusal, unchanged live roots, joined
dead-runner cleanup and preservation of failure without an accepted receipt.
They do not execute or qualify Darwin. A Mac prerequisite/compile/runtime
failure is not behavioral RED. Keep the printed evidence directory, including
original logs, invocation descriptors, reports, provisional/accepted receipts
and outer cleanup records; do not relabel a contained failure as acceptance.

<!-- S53A_DARWIN_LOCAL_BEGIN -->
```bash
#!/usr/bin/env bash
set -euo pipefail
: "${S53A_EXPECTED_SHA:?Set the exact SHA supplied with the handoff}"
test -z "${NODE_OPTIONS:-}"
node --input-type=module -e 'import assert from "node:assert/strict"; assert.equal(process.platform,"darwin"); assert.equal(process.arch,"arm64"); assert.equal(process.versions.node,"24.19.0"); assert.notEqual(process.getuid(),0)'
test "$(git rev-parse HEAD)" = "$S53A_EXPECTED_SHA"
test -z "$(git status --porcelain)"
test -x /usr/bin/sandbox-exec
command -v gtimeout
command -v cc
command -v lsof
node --input-type=module -e 'import assert from "node:assert/strict"; import {execFileSync} from "node:child_process"; assert.equal(execFileSync("pnpm",["--version"],{encoding:"utf8"}).trim(),"11.6.0")'
export S53A_EVIDENCE="$(mktemp -d /tmp/maister-s53a-darwin-XXXXXX)"
trap 'printf "Evidence retained: %s\n" "$S53A_EVIDENCE"' EXIT
umask > "$S53A_EVIDENCE/original-umask.txt"
umask 022
export CI=true
node --input-type=module -e 'import assert from "node:assert/strict"; const keys=Object.keys(process.env).filter(key=>key.startsWith("MAISTER_")||key.startsWith("TESTCONTAINERS_")); assert.deepEqual(keys,[],"Remove ambient MAISTER_/TESTCONTAINERS_ overrides before qualification")'
if test -n "${DOCKER_CONTEXT:-}"; then
  export DOCKER_HOST="$(docker context inspect "$DOCKER_CONTEXT" --format '{{.Endpoints.docker.Host}}')"
elif test -z "${DOCKER_HOST:-}"; then
  export DOCKER_HOST="$(docker context inspect --format '{{.Endpoints.docker.Host}}')"
fi
unset DOCKER_CONTEXT
node --input-type=module -e 'import assert from "node:assert/strict"; import {existsSync,readFileSync} from "node:fs"; import {homedir} from "node:os"; import {join} from "node:path"; assert.match(process.env.DOCKER_HOST??"",/^unix:\/\//); const path=join(homedir(),".testcontainers.properties"); if(existsSync(path)) assert(!/^\s*tc\.host\s*=/m.test(readFileSync(path,"utf8")),"Reconcile tc.host with the selected Docker endpoint before running")'
# Docker Desktop exposes this socket inside its Linux VM.
export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
export TESTCONTAINERS_HOST_OVERRIDE=127.0.0.1
sw_vers > "$S53A_EVIDENCE/os.txt"
uname -a >> "$S53A_EVIDENCE/os.txt"
id >> "$S53A_EVIDENCE/os.txt"
sysctl hw.logicalcpu hw.memsize > "$S53A_EVIDENCE/host-resources.txt"
node --version > "$S53A_EVIDENCE/node.txt"
pnpm --version > "$S53A_EVIDENCE/pnpm.txt"
git --version > "$S53A_EVIDENCE/git.txt"
cc --version > "$S53A_EVIDENCE/compiler.txt"
gtimeout --version > "$S53A_EVIDENCE/timeout.txt"
printf '%s\n' "$DOCKER_HOST" > "$S53A_EVIDENCE/docker-endpoint.txt"
docker version > "$S53A_EVIDENCE/docker-version.txt"
docker info --format '{"id":{{json .ID}},"version":{{json .ServerVersion}},"os":{{json .OperatingSystem}},"arch":{{json .Architecture}},"kernel":{{json .KernelVersion}},"cpus":{{json .NCPU}},"memory":{{json .MemTotal}},"security":{{json .SecurityOptions}}}' > "$S53A_EVIDENCE/docker-identity.json"
node --input-type=module -e 'import assert from "node:assert/strict"; import {readFileSync} from "node:fs"; assert.match(JSON.parse(readFileSync(`${process.env.S53A_EVIDENCE}/docker-identity.json`,"utf8")).os,/Docker Desktop/)'
git rev-parse HEAD > "$S53A_EVIDENCE/source.txt"
shasum -a 256 pnpm-lock.yaml > "$S53A_EVIDENCE/lock-sha256.txt"
pnpm install --frozen-lockfile 2>&1 | tee "$S53A_EVIDENCE/install.log"
pnpm --filter @maister/mcp build 2>&1 | tee "$S53A_EVIDENCE/mcp-build.log"
cat > "$S53A_EVIDENCE/ordinary-titles.json" <<'JSON'
{
  "lib/execution-host/__tests__/bounded-output.integration.test.ts": [
    "AT-01 bounded output on the production supervisor > AT-06 v2: agrees on original private failure bytes after hydrating a canonical command content reference",
    "AT-01 bounded output on the production supervisor > AT-06 v2: reconstructs original command output from durable evidence after releasing its assignment",
    "AT-01 bounded output on the production supervisor > AT-07: delivery ignores a changed caller payload and verifies the stored v2 request again",
    "AT-01 bounded output on the production supervisor > AT-07: reset ACK and blocked receipts past the outbound budget survive a web process restart",
    "AT-01 bounded output on the production supervisor > AT-07: stalled_body ACK and blocked receipts past the outbound budget survive a web process restart",
    "AT-01 bounded output on the production supervisor > AT-07: startup handles an unsent v2 prompt after dispatch claim 1 with its frozen identity",
    "AT-01 bounded output on the production supervisor > AT-07: startup handles an unsent v2 prompt after dispatch claim 3 with its frozen identity",
    "AT-01 bounded output on the production supervisor > S2.5: a deadlock in the owner's apply keeps it retryable without consuming failure attempts",
    "AT-01 bounded output on the production supervisor > S2.5: a stale commit cannot overwrite a successor application",
    "AT-01 bounded output on the production supervisor > S2.5: a stale failure cannot overwrite a successor application",
    "AT-01 bounded output on the production supervisor > S2.5: an unconfirmed shutdown release preserves the claim and reports failure",
    "AT-01 bounded output on the production supervisor > S2.5: query applies verified owner output and its marker exactly once",
    "AT-01 bounded output on the production supervisor > S2.5: refuses owner application after only a prefix of verified output",
    "AT-01 bounded output on the production supervisor > S2.5: renews preparation and releases only its claim on worker shutdown",
    "AT-01 bounded output on the production supervisor > S2.5: rolls back domain writes and recovers an expired claim with two workers",
    "AT-01 bounded output on the production supervisor > S2.5: unavailable output storage keeps owner application retryable without consuming failure attempts",
    "AT-01 bounded output on the production supervisor > S2.8: domain deferral keeps the result pending without poisoning or running cleanup",
    "AT-01 bounded output on the production supervisor > S2.8: draft adapter extension receives complete original output and applies once",
    "AT-01 bounded output on the production supervisor > accepts the exact 1-MiB framed boundary",
    "AT-01 bounded output on the production supervisor > failed-create-lifecycle: a refused resume cannot poison the next native incarnation",
    "AT-01 bounded output on the production supervisor > failed-create-lifecycle: an initial refused resume records only a binding-free logical session",
    "AT-01 bounded output on the production supervisor > fails only the producer when a frame exceeds 1 MiB",
    "AT-01 bounded output on the production supervisor > preserves a 65,537-byte multibyte ACP message and keeps a sibling usable",
    "AT-01 bounded output on the production supervisor > preserves a 65536-byte tool result through the transcript consumer",
    "AT-01 bounded output on the production supervisor > preserves a 65537-byte tool result through the transcript consumer",
    "AT-01 bounded output on the production supervisor > reconstructs accepted output after releasing the original assignment"
  ],
  "lib/execution-host/__tests__/event-plane-load.integration.test.ts": [
    "event-plane throughput under load (R20) > keeps host-to-manager lag flat with no stream close and one ACK per batch"
  ],
  "lib/local-packages/__tests__/publish.integration.test.ts": [
    "PR-to-source publish (integration) > a non-fast-forward push → CONFLICT (two-phase: markers not updated on failure)",
    "PR-to-source publish (integration) > a stale publish lock is reclaimable (a crashed publish never wedges)",
    "PR-to-source publish (integration) > configured base_branch becomes the PR target branch",
    "PR-to-source publish (integration) > pushes the package branch and falls back to push-only for an unsupported provider",
    "PR-to-source publish (integration) > re-publish updates the SAME stable branch (fast-forward), never duplicating",
    "PR-to-source publish (integration) > refuses to publish a committed invalid package baseline",
    "PR-to-source publish (integration) > rejects a targetSourceId that is not a registered source with CONFLICT",
    "PR-to-source publish (integration) > serializes concurrent publishes of the same package — the loser gets CONFLICT",
    "PR-to-source publish (integration) > stores the PR url when the provider adapter opens a PR",
    "PR-to-source publish (integration) > upstream_moved on a fork with lineage → canSync: true"
  ]
}
JSON
cat > "$S53A_EVIDENCE/control.mjs" <<'JS'
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [operation, stage, stageExit, logExit] = process.argv.slice(2);
const evidence = process.env.S53A_EVIDENCE;
const sourceSha = process.env.S53A_EXPECTED_SHA;
assert(evidence && /^[a-f0-9]{40}$/.test(sourceSha ?? ""));
assert(["preflight", "bounded-output", "publish", "darwin50", "r20"].includes(stage));
assert.equal(process.env.MAISTER_TEST_WORKTREE_INVOCATION_ID, undefined, "outer control must stay untagged");
const sourceMatches = () => execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() === sourceSha &&
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim() === "";
const helperFiles = ["process-invocation.ts", "process-environment.c", "process-group-liveness.c", "fixture-compiler-watchdog.mjs", "worktree-test-root.ts"];
const helperHashes = async () => Object.fromEntries(await Promise.all(helperFiles.map(async (file) => [file,
  createHash("sha256").update(await readFile(join(process.cwd(), "web/test-support", file))).digest("hex")])));
const loadApi = () => import(pathToFileURL(join(process.cwd(), "web/test-support/process-invocation.ts")));
const descriptorPath = join(evidence, `${stage}-invocation.json`);

if (operation === "prepare") {
  assert(sourceMatches(), "source must be frozen before preparation");
  const api = await loadApi();
  const invocation = await api.createInvocation(join(evidence, stage));
  const identity = await lstat(invocation.directory);
  const descriptor = { stage, sourceSha, uid: process.getuid(), invocation,
    preparedAt: Date.now(), helperHashes: await helperHashes(),
    ledgerDevice: identity.dev, ledgerInode: identity.ino };
  await writeFile(descriptorPath, JSON.stringify(descriptor, null, 2) + "\n", { flag: "wx", mode: 0o600 });
} else if (operation === "finalize") {
  assert(/^\d+$/.test(stageExit) && /^\d+$/.test(logExit));
  const descriptor = JSON.parse(await readFile(descriptorPath, "utf8"));
  assert.equal(descriptor.stage, stage);
  assert.equal(descriptor.sourceSha, sourceSha);
  assert.equal(descriptor.uid, process.getuid());
  assert.deepEqual(await helperHashes(), descriptor.helperHashes, "cleanup implementation changed; restore the exact handoff source before finalizing this descriptor");
  const api = await loadApi();
  const sourceDrift = !sourceMatches();
  const { invocation } = descriptor;
  assert.match(invocation.id, /^[a-f0-9-]{36}$/);
  assert.equal(invocation.directory, join(evidence, stage, "processes", invocation.id));
  const identity = await lstat(invocation.directory);
  assert(identity.isDirectory() && !identity.isSymbolicLink());
  assert.equal(identity.uid, process.getuid());
  assert.equal(identity.mode & 0o777, 0o700);
  assert.equal(identity.dev, descriptor.ledgerDevice);
  assert.equal(identity.ino, descriptor.ledgerInode);
  const records = await api.invocationRecords(invocation);
  const runners = records.filter((record) => record.kind === "process" && record.role === "runner");
  assert(runners.length <= 1, "unexpected runner authority");
  if (runners.length === 1) {
    const current = await api.findProcessIdentity(invocation, runners[0].identity.pid);
    assert(!current || !api.sameProcess(current, runners[0].identity), "refusing cleanup while the recorded runner is alive");
  } else {
    const live = (await api.readProcessSnapshot(invocation)).filter((row) => row.owned && !row.zombie);
    assert.equal(live.length, 0, "missing runner record does not authorize signaling live processes");
  }
  const errors = await api.releaseInvocation(invocation, `Darwin handoff ${stage}`);
  const acceptanceErrors = [];
  if (sourceDrift || !sourceMatches()) acceptanceErrors.push(new Error("source changed during qualification"));
  if (runners.length !== 1) acceptanceErrors.push(new Error("stage never registered its runner"));
  for (const record of records.filter((row) => row.kind === "root")) {
    try { await assert.rejects(lstat(record.root), { code: "ENOENT" }); }
    catch (error) { errors.push(error); }
  }
  const durationSeconds = (Date.now() - descriptor.preparedAt) / 1000;
  const limitSeconds = stage === "darwin50" ? 2340 : stage === "r20" ? 1560 : 600;
  if (durationSeconds >= limitSeconds) acceptanceErrors.push(new Error(`stage including finalization exceeded ${limitSeconds}s`));
  const result = { stage, sourceSha, invocationId: invocation.id, durationSeconds, limitSeconds,
    stageExitCode: Number(stageExit), logExitCode: Number(logExit),
    cleanupErrors: errors.map((error) => String(error)), acceptanceErrors: acceptanceErrors.map((error) => String(error)), completedAt: new Date().toISOString(),
    hostedEvidence: false };
  await writeFile(join(evidence, `${stage}-outer-cleanup.json`), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(result));
  if (Number(stageExit) !== 0 || Number(logExit) !== 0 || errors.length || acceptanceErrors.length) {
    process.exitCode = 1;
  } else {
    const provisional = JSON.parse(await readFile(join(evidence, `${stage}-provisional.json`), "utf8"));
    assert.equal(provisional.stage, stage);
    assert.equal(provisional.accepted, false);
    assert.equal(provisional.hostedEvidence, false);
    assert.equal(provisional.sourceSha, sourceSha);
    assert.equal(provisional.invocationId, invocation.id);
    await writeFile(join(evidence, `${stage}-receipt.json`), JSON.stringify({ ...provisional,
      outerCleanup: result, accepted: true }, null, 2) + "\n", { flag: "wx" });
  }
} else {
  throw new Error("usage: control.mjs prepare|finalize stage [stage-exit log-exit]");
}
JS
cat > "$S53A_EVIDENCE/run.mjs" <<'JS'
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const repo = process.cwd();
const stage = process.argv[2];
const evidence = process.env.S53A_EVIDENCE;
const expectedSha = process.env.S53A_EXPECTED_SHA;
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
assert(evidence && /^[a-f0-9]{40}$/.test(expectedSha ?? ""));
const api = await import(pathToFileURL(join(repo, "web/test-support/process-invocation.ts")));
const descriptor = JSON.parse(await readFile(join(evidence, `${stage}-invocation.json`), "utf8"));
assert.equal(descriptor.stage, stage);
assert.equal(descriptor.sourceSha, expectedSha);
assert.equal(descriptor.uid, process.getuid());
assert.deepEqual(api.invocationFromEnvironment(), descriptor.invocation);
const invocation = descriptor.invocation;
await api.registerProcess(invocation, { role: "runner", caseName: stage, rootRole: "invocation", root: null, bootId: invocation.id, logFile: null }, process.pid);
assert.equal(process.platform, "darwin");
assert.equal(process.arch, "arm64");
assert.equal(process.versions.node, "24.19.0");
assert.notEqual(process.getuid(), 0);
assert.match(expectedSha ?? "", /^[a-f0-9]{40}$/);
assert.equal(git("rev-parse", "HEAD"), expectedSha);
assert.equal(git("status", "--porcelain"), "");
assert.equal(process.env.MAISTER_TEST_BUILT_WEB, undefined);
assert(evidence);
const { runStageAbLane, isolationFiles, validateLaneReport } = await import(pathToFileURL(join(repo, "scripts/run-stage-ab-tests.mjs")));
const { validateIsolationReport, isolationPreflightFiles } = await import(pathToFileURL(join(repo, "scripts/isolation-ci-evidence.mjs")));
const definitions = {
  preflight: { files: isolationPreflightFiles, slice: "isolation", cases: 1, limit: 600 },
  "bounded-output": { files: ["lib/execution-host/__tests__/bounded-output.integration.test.ts"], slice: "web", cases: 26, limit: 600 },
  publish: { files: ["lib/local-packages/__tests__/publish.integration.test.ts"], slice: "web", cases: 10, limit: 600 },
  darwin50: { files: isolationFiles("darwin"), slice: "isolation", cases: 50, limit: 2340 },
  r20: { files: ["lib/execution-host/__tests__/event-plane-load.integration.test.ts"], slice: "web", cases: 1, limit: 1560 },
};
assert(Object.hasOwn(definitions, stage));
const definition = definitions[stage];
const { files } = definition;
for (const key of Object.keys(process.env).filter((key) => key.startsWith("MAISTER_")))
  assert(["MAISTER_TEST_WORKTREE_INVOCATION_ID", "MAISTER_TEST_PROCESS_LEDGER"].includes(key), `Remove ambient override: ${key}`);
if (stage === "r20") process.env.MAISTER_EVENT_PLANE_LOAD = "1";
const inventoryBytes = await readFile(join(evidence, "ordinary-titles.json"));
const inventory = JSON.parse(inventoryBytes);
const sourceTree = git("rev-parse", "HEAD^{tree}");
const startedAt = new Date().toISOString();
const start = performance.now();
let completed = false;
try {
const result = await runStageAbLane({ slice: definition.slice, files, evidenceDirectory: evidence, owningInvocation: invocation });
const durationSeconds = (performance.now() - start) / 1000;
const bytes = await readFile(result.reportPath);
const report = JSON.parse(bytes);
validateLaneReport(report, files);
const cases = definition.slice === "isolation" ? validateIsolationReport(report, files) : report.numTotalTests;
assert.equal(cases, definition.cases);
if (definition.slice !== "isolation") {
  for (const file of files) {
    const suite = report.testResults.find(row => row.name === join(repo, "web", file));
    const expected = inventory[file];
    assert(expected?.length > 0);
    assert.deepEqual(suite.assertionResults.map(row => [...row.ancestorTitles, row.title].filter(Boolean).join(" > ")).sort(), expected);
  }
}
assert.equal(git("rev-parse", "HEAD"), expectedSha);
assert.equal(git("status", "--porcelain"), "");
assert(durationSeconds < definition.limit);
await writeFile(join(evidence, `${stage}-provisional.json`), JSON.stringify({
  kind: "local-darwin-regression", hostedEvidence: false, sourceSha: expectedSha,
  sourceTree, stage, platform: process.platform, arch: process.arch,
  node: process.versions.node, uid: process.getuid(), startedAt, durationSeconds,
  invocationId: result.invocation.id, directory: result.directory,
  files, cases, reportPath: result.reportPath, reportSha256: hash(bytes),
  ordinaryInventorySha256: hash(inventoryBytes), accepted: false,
  outcome: result.status, cleanup: "passed-without-containment-leaks",
}, null, 2) + "\n", { flag: "wx" });
completed = true;
} finally {
  await writeFile(join(evidence, `${stage}-attempt.json`), JSON.stringify({
    stage, sourceSha: expectedSha, sourceTree, startedAt,
    durationSeconds: (performance.now() - start) / 1000,
    platform: process.platform, arch: process.arch, node: process.versions.node,
    sourceUnchanged: git("rev-parse", "HEAD") === expectedSha && git("status", "--porcelain") === "",
    completed, hostedEvidence: false,
  }, null, 2) + "\n", { flag: "wx" });
}
JS
overall_status=0
for stage in preflight bounded-output publish darwin50 r20; do
  case "$stage" in
    darwin50) limit=2340 ;;
    r20) limit=1560 ;;
    *) limit=600 ;;
  esac
  node "$S53A_EVIDENCE/control.mjs" prepare "$stage"
  invocation_id="$(node --input-type=module -e 'import {readFileSync} from "node:fs"; console.log(JSON.parse(readFileSync(process.argv[1],"utf8")).invocation.id)' "$S53A_EVIDENCE/$stage-invocation.json")"
  invocation_ledger="$(node --input-type=module -e 'import {readFileSync} from "node:fs"; console.log(JSON.parse(readFileSync(process.argv[1],"utf8")).invocation.directory)' "$S53A_EVIDENCE/$stage-invocation.json")"
  set +e
  gtimeout --signal=TERM --kill-after=30s "${limit}s" env MAISTER_TEST_WORKTREE_INVOCATION_ID="$invocation_id" MAISTER_TEST_PROCESS_LEDGER="$invocation_ledger" node "$S53A_EVIDENCE/run.mjs" "$stage" 2>&1 | tee "$S53A_EVIDENCE/$stage.log"
  stage_status=("${PIPESTATUS[@]}")
  gtimeout --signal=TERM --kill-after=5s 60s node "$S53A_EVIDENCE/control.mjs" finalize "$stage" "${stage_status[0]}" "${stage_status[1]}" 2>&1 | tee "$S53A_EVIDENCE/$stage-finalization.log"
  cleanup_status=("${PIPESTATUS[@]}")
  set -e
  if test "${stage_status[0]}" -ne 0 || test "${stage_status[1]}" -ne 0 || test "${cleanup_status[0]}" -ne 0 || test "${cleanup_status[1]}" -ne 0; then
    overall_status=1
    printf 'FAILED stage=%s command=%s log=%s finalizer=%s finalizer_log=%s\n' "$stage" "${stage_status[0]}" "${stage_status[1]}" "${cleanup_status[0]}" "${cleanup_status[1]}" >&2
    # A failed outer finalizer leaves an unresolved resource boundary; stop here.
    test -f "$S53A_EVIDENCE/$stage-outer-cleanup.json" || exit 1
    node --input-type=module -e 'import assert from "node:assert/strict"; import {readFileSync} from "node:fs"; const audit=JSON.parse(readFileSync(process.argv[1],"utf8")); assert.equal(audit.cleanupErrors.length,0,"Resolve the recorded cleanup failure before another stage")' "$S53A_EVIDENCE/$stage-outer-cleanup.json"
  fi
done
printf 'Evidence: %s\n' "$S53A_EVIDENCE"
exit "$overall_status"
```
<!-- S53A_DARWIN_LOCAL_END -->

### Phase 0 — specification and environment receipts (2026-10-03)

- Live master was read over HTTPS after configured SSH lacked a usable key:
  `git ls-remote https://github.com/maister-dev/maister.git refs/heads/master`
  returned the exact planning SHA `f43ac1570380d2be19f7c59a70cd993f24ace440`.
  Highest actual ADR record was192; ADR-193 was then allocated with matching
  record/hub/index. Main migration0192, Brain0006 and supervisor SQLite version14
  remain unchanged, as do API/event/auth/config and production deployment files.
- Canonical analytics now contain LNX-01–12, launch/restart/probe/finalization
  states and outcomes, exact existing50 plus independent I-CI title inventory,
  five proposed Linux controls and single-owner RED/falsification mapping.
  Operator docs explicitly distinguish test prerequisites and production Docker.
- Node24.15.0 `validate:contracts` passed all registered parsers, nine validator
  controls and five adapter mirrors. `validate:docs:all` passed Mermaid, ADR,
  links, indexes and all33 validator controls; generated ERD remains current
  at140 tables. Default sandbox blocked tsx IPC; the same ERD command passed
  with narrowly approved local execution. Initial ambient Node26/pnpm automatic
  install attempt was refused before module removal; subsequent commands use
  explicit Node24.15.0 and disable pnpm's automatic pre-run install.
- Disposable development image `maister-s53a-dev:local`, image ID
  `sha256:6e7cdc9c9cb7a0270022a55df6d7e9b464eb71790e50f38508954e306360c207`,
  Ubuntu24.04/aarch64, Node24.19.0, UID/GID1001, host kernel6.12.76-linuxkit.
  Authenticated Ubuntu package `bubblewrap=0.9.0-1ubuntu0.3`; ARM binary SHA256
  `cd6b143283b464baf078ab09ca19dadc5bcc2423b833c4f9dd7e83f9ba1b640b`.
  No host mounts/network, cap-dropALL and no-new-privileges were used for probes.
  Default Docker seccomp denied unshare; container-scoped seccomp allowance
  admitted unshare but required private proc still failed. Adding only the
  container-scoped `systempaths=unconfined` allowance made the full required
  Bubblewrap option/proc probe exit0. This is ARM64 development capability only,
  not an application boundary, amd64 or hosted qualification. No host AppArmor,
  sysctl, production service or CI change was made.
- API/data/deployment source hashes were audited directly; ordinary receipt
  lookup is `supervisor/src/http-api.ts` GET `/commands/:commandId`, backed by
  `command-receipts.ts` and host state. Namespace status metadata stays private
  test IPC, not a new product endpoint or persisted identifier.

### Phase 1 — current receipts and open gates (2026-10-03)

Checkpoint C1 is `728502267` (`docs(test): specify Linux isolation and ownership contracts`). The current driver tree is uncommitted and unqualified; A4–A7 remain unchecked. No workflow, push, hosted rerun or production deployment change has occurred.

- ARM64/Node24.19 development RED controls reached readable private sentinel/live SQLite bytes without enforcement, incompatible host-PID watchdog inside private proc, raw Bubblewrap's indistinguishable exit137/SIGKILL outcomes, lost graceful drain under group TERM and live detached descendants after removing the outer watchdog. Restored launcher controls preserved graceful drain, distinguished actual code/signal and observed no parent-death survivors **before** sweep containment. Logs are retained under `/private/tmp/maister-s53a/`; these are development controls, not G-LINUX.
- The owning Linux boundary control uses real SQLite, RO/RW files, fork/exec, symlink/traversal/proc aliases, a deliberately inherited private descriptor and compiled namespace escape syscalls. The kernel denies nested user namespaces with ENOSPC or EPERM; remount and re-entry require EPERM. A later real ARM control exposed successful bridge `ptrace` and `pidfd_getfd` authority: the earlier ARM GREEN is superseded. The driver now requires existing Yama scope1–3, with no sysctl modification; LinuxKit's missing Yama correctly refuses. Ubuntu amd64's actual scope1 denies both operations. Trusted outer/bridge Node launches disable SIGUSR1 inspector activation, and the bridge handles that signal without terminating. These prerequisites were added to the normative contracts before implementation.
- The Ubuntu amd64 two-case owning run passed with validator success and zero leaks (`amd64-vm/linux-bridge-green.log`, invocation `ca3cabe9-d770-46f5-b0cb-fafb7e9b3ad4`, 58.055s). LI-refusal includes actual malformed/output-overflow/signal/deadline/spawn-failure probes and the real Docker TCP authority control. Only two of the five final Linux cases exist; later policy-size/deadline changes still require restored owning qualification. Removing only one debugger flag survived because redundant guards remained; that attempt is an invalid falsification. Removing all three debugger guards made the boundary assertion fail on `inspectorAfter: SUCCESS` (`red-bridge-debugger-controls.log`, invocation `e8f3e919-26bc-40a9-af10-752d171fb51c`); exact file bytes were restored and the failed run had zero leaks.
- A caller-forged private RO bind bypassed preparation-only topology checks: `red-forged-policy.log` failed with “expected function to throw an error, but it didn't”. Launch-time topology validation corrected it; `green-forged-policy.log` passed, and `refactor-policy.log` passed after removing duplicate preparation logic. The restored policy source SHA256 at that cycle was `3bd9f3c4b0d8b724b7c8178b6ff781af319abf9bac02533c435542de31078b80`; complete per-cycle restoration hashes remain an open qualification obligation.
- Real dumpability-denial O-identity passed on ARM Linux with actual `/proc/<pid>/environ` EACCES and refused registration/signaling; its original title and Darwin branch remain. Real supervisor sentinel witness removal failed despite healthy registered supervisor; restoration passed on Darwin ARM64/Node24.15 with zero leaks (`red-supervisor-witness.log`, `green-supervisor-witness.log`). The subsequent Darwin I2/I4 execution is recorded below; Linux production I1–I4 remains unqualified.
- Actual Ubuntu24.04 amd64 VM, kernel6.8.0-142-generic, fixture UID/GID1001, own Docker29.1.3, exact official Node24.15.0/24.19.0 and frozen pnpm11.3.0 are provisioned. Bubblewrap revision `0.9.0-1ubuntu0.3`, binary SHA256 `e318903862396f96de3df57264e0158682b952fd3fb53ac23d876413e7b30f71`; scoped AppArmor profile SHA256 `5f2d66d12f657af45a4763b23a0cf5d0135fcf6f5a466ea0a22f48b3fe3f7efc`. Initial real user-namespace setup refused with AppArmor uid_map denial; installing only the versioned test binary profile restored capability. Setup passed again without changing host-wide policy. This guest has no host Docker socket, host mounts or host network.
- Independent amd64 Node24.19 I-CI passed with real migrated/queryable PostgreSQL and `validateLaneReport` success, 92.184s, zero leaks (`preflight-24.19-green.log`, invocation `c830f3d8-82f2-4f5a-8bc2-93899154671d`). Independent Darwin ARM64/Node24.15 preflight passed in5.480s with zero leaks, invocation `85b89588-3bd1-41ca-87ae-9debc051a77a`. Neither supplies a full owning report.
- The TCP authority guard was falsified against the **real guest Docker daemon**, exposed only through an owned loopback test proxy: guard removal made its rejection assertion fail, restoration rejected the endpoint and accepted the Unix-only daemon after closure (`amd64-vm/{red,green}-network-authority.log`). Restored helper SHA256 `5afaff66481efd5f92d69306a8eb7ea3749d86a0822813a26c337bd5d8f3031b`. This subcontrol now belongs to LI-refusal.
- Production I1–I4 remain unqualified. On QEMU8.2.2 TCG CPU `max` (4vCPU/8GiB), the fresh default Turbopack build failed before web launch. A native V8 diagnostic stack implicated the generated CSS parser, while ten direct evaluations passed; the root cause remains uncertain. With `Nehalem-v1` and unchanged resources/deadlines, one fresh default build completed in509.199s, BuildID `pUi5eCdLaIAPyAHUaJoUp`, then setup refused the actually absent optional `web/public` tree. The policy now omits only that optional absent input and still requires all executable traces/runtime inputs. Trace closure was measured at7094 inputs; reading each distinct path's metadata once and binding only explicitly approved traced application trees reduced the policy from2428 to445 mounts. The100–101KiB policy exceeded the initial uncommitted64KiB decoder limit; normative policy/command/status bounds are now112/32/64KiB respectively, with policy decoding GREEN (`green-policy-bounds.log`). These diagnostics do not qualify a production launch.
- The current-source Ubuntu amd64 Node24.19 separate preflight passed1/1 with validator success, real main+Brain PostgreSQL migrations/queries and zero leaks in63.937s (`preflight-bounded-policy-24.19.log`, invocation `0a89af87-8ac8-4568-969a-4ce42e580322`). The subsequent combined production/two-case attempt terminated its Vitest parent with SIGSEGV before production setup; no reporter was produced and final containment reaped one process (`production-bounded-policy-24.19.log`, invocation `79db3ce1-26e1-4a1e-928d-986c4c8160ce`). Existing kernel/journal/crash records contain no explanatory core report. This is failed evidence, not a zero-leak or production qualification. A focused I1–I4 attempt subsequently hit the existing600s setup deadline, four skipped cases and zero leaks. Its fresh build remained active for8m51s before timeout (`production-only-bounds-24.19.log`, invocation `0499c9c4-1362-40f3-b4ef-b59b69fe417b`). A later Node24.15 Haswell run also timed out before build. These failed/diagnostic attempts are not qualification; no bundler switch, Node substitute or timeout increase was made.
- Darwin ARM64 Node24.15 phase checks passed: full web unit878files/9204cases, supervisor unit50files/495cases, web/supervisor typechecking and lint, contracts and all documentation/generated-ERD checks. Supervisor lint retains four unrelated baseline warnings. Existing lane/workflow controls passed14/14. The full supervisor integration suite also passed36files/310cases in21.85s (`supervisor-integration-phase1.log`). The subsequent complete Darwin50 and ordinary web receipts are recorded below; Linux qualification remains open. These checks alone cannot close C2.

- The frozen Darwin integration discovery contains592files, partitioned without omission/duplication into581 ordinary files, seven isolation owners, independent preflight, one production scheduler-clock owner and two explicit load owners. An initial direct package invocation lacked the baseline-required ownership ledger and was interrupted after that invalid-environment failure; it supplies no gate. The owned581-file run (`web-integration-owned-phase1.log`, invocation `e1cbbd4c-a0cc-43c2-ad00-d1d9445d188a`) passed579files/5166cases, failed the Librarian round trip and continuation yield, and had zero leaks in1515.989s. The Librarian failure reproduced because ignored `mcp/dist/main.js` lacked current `project_list`; rebuilding the existing MCP package restored it. Both failed owners then passed2/2 with zero leaks (`web-integration-failures-fresh-mcp.log`, invocation `09150a0c-6951-47bc-ac78-775e9c4bb3de`). This diagnostic recovery does not supply a complete GREEN aggregate; the later complete ordinary receipt is recorded below.
- The disposable amd64 VM now uses authenticated QEMU11.1.2 with the same4vCPU/8GiB resources and Haswell-noTSX CPU. The official release signature verified fingerprint `CEACC9E15534EBABB82D3FA03353C9CEF108B584`; emulator binary SHA256 `6274946d829756a3429e77109b795492b01bd2505e6d9cd1ac391b0fb29c3608`. Only the container-local emulator/library bundle changed; no host-wide security policy, CI runner or production infrastructure changed. This does not prove a speed improvement or explain the earlier SIGSEGV. Exact Node24.15 separate preflight passed1/1 with validator success and zero leaks in75.078s (`preflight-qemu11-24.15.log`, invocation `b28fec95-3410-4ddb-9d6e-1a4d8742d67c`).
- The first QEMU11 Node24.15 production retry timed out before build, four skipped cases and zero leaks in625.029s (`production-qemu11-24.15.log`, invocation `ce4a32fa-3343-4741-8190-4bcef711122f`). Real PostgreSQL row counts showed all seed operations completed. The actual `.next.build-lock` targeted the previous XPzbab invocation's now-absent `/tmp` identity, explaining that acquisition stall. The added O-build-lock subcontrol failed within its20s bound with zero leaks before the fix (`red-build-lock-missing-identity.log`, invocation `dec9cfd4-a209-49c4-8285-45d3354df2b7`). Explicit missing-identity refusal passed against that exact Linux lock and retained it (`green-actual-stale-build-lock.log`, invocation `8bbf395e-07f8-42ce-af7f-7c68e577205d`). After the prior run completed, exact target/device/inode/UID checks preserved the symlink in its evidence directory as explicit environment reconciliation. The next frozen-source Linux run reached a registered fresh build; qualification is still pending.
- A Darwin build found that generated dependency links/virtual-store metadata pointed to another worktree outside the configured Turbopack root. A frozen-lockfile install restored this checkout's own virtual store; package/config/lockfile sources remain unchanged. The offline attempt could not restore missing cached tarballs, then the normal frozen registry install completed. The updated O-build-lock case passed with a fresh default build and dead-owner artifact reuse (`green-build-lock-local-deps.log`, invocation `6c8db88b-33cc-4aec-9645-e14799cdddb4`). After refactoring the fixture to preserve the actual typed error cause, the same diagnostic case passed in18.448s (`refactor-build-lock.log`, invocation `d357dfa2-5fad-4dad-8e9a-f685e8e203ce`). Both deliberately filtered1/13 reporters were correctly rejected by full inventory validation and had zero leaks. These cannot replace complete owning13/50 regression. The changed-file lint check, full web typechecking, contracts and full documentation/generated-ERD validation passed after this correction.
- The next Ubuntu amd64 Node24.15 I1–I4 attempt reached a registered fresh default build but exceeded the unchanged600s setup deadline, four skipped cases, in626.399s (`production-clean-lock-qemu11-24.15.log`, invocation `ef1cb108-58ef-4318-b48f-7337ee6e0069`). Original finalization refused an unverifiable registered build identity for PID23707; its cause is unproven and exact ownership checks remain strict. Two subsequent PID queries found that process gone. A separate invocation-targeted terminal recheck found zero remaining owned processes (`failed-production-terminal-recheck.log`). The original timeout and cleanup refusal remain failed evidence; the later recheck does not relabel that run as GREEN.
- The next complete phase-1 Linux run uses the frozen28-file runtime manifest and archive SHA256 `6c7d677ebd82632df18720adb6f6705d19e9f04d5c2666d3fde0bc79309392fb`. Every transferred runtime file was hash-verified (`phase1-source-sync.log`). Prior Vitest results and generated Apple resource-fork artifacts were preserved outside checkout discovery, reproducing cold CI default sequencing without a custom order, skipped case or changed deadline (`phase1-cold-inputs.log`). The disposable VM was gracefully shut down to keep the intervening complete Darwin regression quiet. Qualification remains pending.
- Frozen-source Darwin ARM64 Node24.15 regression passed the complete original7files/50cases, full validator and zero leaks in793.071s (`darwin-full-isolation-current.log`, invocation `76418872-48d1-4d98-9f34-2c679613fe28`, reporter `/var/folders/p3/lj5f1_ys6650hwvry91_qr2c0000gn/T/maister-ab-isolation-eihtU4/vitest.json`). This includes all13 ownership controls and production I1–I4. Its independent preflight passed1/1, full validator and zero leaks in4.937s (`darwin-preflight-current.log`, invocation `b019b92a-5bbe-4943-a403-53618c06ee93`, reporter `/var/folders/p3/lj5f1_ys6650hwvry91_qr2c0000gn/T/maister-ab-isolation-3b0OGV/vitest.json`). All28 runtime source hashes remained unchanged. These are Darwin ARM64 receipts, not hosted Intel or Linux qualification.


- A second quiet owned ordinary run (`web-integration-quiet-current.log`, invocation `f4c06b38-71f3-4625-9b35-48d330ba6522`, reporter `/var/folders/p3/lj5f1_ys6650hwvry91_qr2c0000gn/T/maister-ab-web-mF01Zm/vitest.json`) passed580files/5167cases and failed the unchanged A2 prompt-admission continuation case, with zero leaks in1492.024s. The Librarian owner passed after its generated MCP rebuild. A2 repeatedly yielded at an ownership fence after incarnation activation; its cause was unresolved at that attempt and is established by the ownership receipts below. No assertion/deadline was weakened, and the aggregate is not GREEN. The logged ordinary-lane concurrency is4.
- The separate production scheduler-clock owner passed1file/6cases, full validator and zero leaks in36.633s (`darwin-clock-current.log`, invocation `caa98218-bf24-4a74-8542-b0aa3b508e0f`, reporter `/var/folders/p3/lj5f1_ys6650hwvry91_qr2c0000gn/T/maister-ab-isolation-M2G4Hk/vitest.json`). Its fresh default build took15.246s. The subsequent separate load-owner receipt is recorded below; it is not inferred from ordinary integration.


- The ordinary A2 blocker has a proved harness cause. The preserved supervisor log (`supervisor-5119241b.log` in invocation `f4c06b38-71f3-4625-9b35-48d330ba6522`) records its adapter SIGKILL at `1790997036441`, concurrently with the crash-injection owner using global `pgrep -f` over the shared fixture path. Extend phase-1 Qualification ownership narrowly to `web/lib/flows/graph/__tests__/prompt-owners.integration.test.ts`: scope adapter crash injection to the actual supervisor's direct children/group, signal only captured UID/start/tag identities through the existing verified helper, and add a live sibling ACP-response witness inside existing N1 (no extra case or product behavior). RED N1 observed the sibling's SIGKILL (`red-adapter-signal-ownership.log`, invocation `c069f0a5-1632-4601-bf1e-511e8bceff84`); scoped GREEN N1 passed (`green-adapter-signal-ownership.log`, invocation `aabaf771-b0d8-4f30-b8c4-6abaac42d107`); cleanup REFACTOR N1 passed (`refactor-adapter-signal-ownership.log`, invocation `98b2380a-47ef-4143-adc5-bb69807fe60d`). These filtered reporters correctly fail complete63-case validation and have zero leaks; none qualifies C2. Temporary Flow error/state instrumentation was restored byte-for-byte; no Flow product/API/data change was needed. The subsequent complete581-file ordinary inventory passed all5168cases, full validator and zero leaks in1517.810s (`web-integration-scoped-crash-current.log`, invocation `0dba2020-f729-4cad-93fe-15da4180760d`, reporter `/var/folders/p3/lj5f1_ys6650hwvry91_qr2c0000gn/T/maister-ab-web-ra5l19/vitest.json`). The ordinary concurrency remains4; all63 prompt-owner cases and the original A2 executed.
- Current generated dependencies/source passed the complete Darwin Node24.15 web unit878files/9204cases in29.26s and full web typechecking. Linux's rebooted independent preflight passed1/1, full validator and zero leaks in74.184s (`preflight-before-full52-24.15.log`, invocation `08bc20e9-80ee-42ca-bfdb-7033ede4eb02`). The8file/52case phase attempt reached a fresh default build in456.592s, BuildID `2y9c4U17lW0bDjwzgbEcD` (`phase1-full52-qemu11-24.15.log`, invocation `cf67d10c-7f0c-4660-ad60-10b6a44a347a`). Its first completed owner, partitions, passed4/6cases in1637.538s: P3-replay never reached its hold-events barrier; P4 reported a PostgreSQL deadlock. P3's preserved web log repeatedly reports EXECUTOR_UNAVAILABLE during startup. The exact causes require baseline/reached-barrier diagnosis; neither is attributed to namespace enforcement because these ordinary fault fixtures are unisolated. The local observational helper had no slice timer; after confirming it had exceeded2340s, only the runner's saved UID/PID/start/parent/group and exact command were verified and SIGTERM sent at3001.9s. This is an interrupted over-budget diagnostic attempt, not a GNU-timeout exit124 or hosted run. Terminal failure retained the interruption and original errors, reaped2processes and removed1container; lane duration3007.501s, cleanup6.485s. No full vitest.json exists, so the incomplete owner cannot supply a complete case count or validateLaneReport success. Evidence is preserved under `/private/tmp/maister-s53a/amd64-vm/phase1-evidence/`. Do not relabel containment as zero-leak acceptance or combine partial owners into GREEN.
- Node24.15 runtime/preflight contracts passed4/4 and lane/workflow controls passed14/14 after ordinary regression. Contract validation and all docs/generated-ERD checks passed; main0192/Brain0006 migrations and supervisor SQLite schema14 remain unchanged. No API/schema, production deployment, workflow, runner timeout or acceptance inventory delta was introduced to address the emulated failure.
- The remaining A4 DEBUG requirement now has bounded structured policy digest, mount-access counts, private-file/root and dependency-link counts, plus option names under LOG_LEVEL=debug/trace. Paths, environment values and private bytes are omitted. The trusted outer receives this existing logging control independently of the inner environment allowlist. Full web typechecking, changed-file lint and formatting passed. The running failed Linux checkout was never edited; after its exit only these two Linux files were transferred for the existing two-case driver check. Its separate28-file manifest SHA256 is `e83c57061c8e5f88afad95339e37306207ad6ba5db28a0a51eed9e4d25381608`; the earlier full/Darwin receipts retain their original source manifest. This logging check cannot qualify the full phase or G-LINUX.
- The current-source Ubuntu amd64 Node24.15 driver owner passed both existing cases, its complete two-case manifest/validator and zero leaks in60.402s (`linux-driver-diagnostics-current-24.15.log`, invocation `b38739d5-e5f5-4ad9-8c7b-ab914a00309e`). The original reporter is preserved locally at `/private/tmp/maister-s53a/amd64-vm/phase1-evidence/linux-driver-diagnostics-current-24.15/maister-ab-isolation-BEAPoK/vitest.json`; no future three lifecycle cases are present or inferred. A separate recheck through existing invocation inspectors found no surviving recorded UID/start identities, exact-tag processes or registered roots for failed invocation `cf67d10c-7f0c-4660-ad60-10b6a44a347a`; the guest daemon's exact invocation-label container listing was empty. This recheck preserves the original failed outcome and2process/1container leak findings. The disposable VM's evidence and persistent disk are retained for diagnosis; shutdown does not supply a qualification gate.
- Both opt-in load owners passed in one serial Darwin ARM64 Node24.15 invocation: 2files/2cases, full validator and zero leaks in507.794s (`darwin-load-current.log`, invocation `25a121fa-fb8b-4c80-9063-dbfcc8274de3`, reporter `/var/folders/p3/lj5f1_ys6650hwvry91_qr2c0000gn/T/maister-ab-isolation-rOMhYJ/vitest.json`). The VM was confirmed exited, the host used AC power and the one-minute load average was5.73 at launch; no other test lane ran. R20 retained its300s window and achieved394rows/s, maximum lag62, zero pauses/pressure/refusals/server-ended closes, four retention prunes and all nine canonical settlements. T5.3 retained its120s ingestion hold and confirmed all six runs without conflict, settlement p95=5551ms below10000ms. Together with the ordinary581, isolation7, independent preflight1 and scheduler-clock1 receipts, all592files/5227cases of the frozen Darwin discovery are accounted for without skips or overlap. The source/platform labels and Linux-only logging delta remain explicit; this inventory reconciliation cannot qualify Linux.

Remaining A5/A9 measurements must include the bridge's current close-based application-outcome emission when a detached descendant holds stdio open, the outer frame-processing backlog during asynchronous inspection, readiness arriving across separate Bubblewrap/child status pipes, and forced containment after a descendant clears its tag. These are source-review concerns, not established runtime failures. Capture discriminating real RED controls under the existing LI-term/LI-kill/LI-parent owners before changing those seams; preserve exact foreign-process refusal and do not add duplicate lifecycle cases. A8 also retains its unimplemented nested-mount and invalid-policy restart subcontrols. No later-phase acceptance is inferred from the two-case driver receipt.

At the transfer checkpoint, the blocking prerequisite was a suitable Ubuntu24.04 amd64 environment in which the complete production/ownership inventory can reach its barriers and finish under the unchanged budgets. That accessible amd64 VM used TCG emulation on an ARM64 host; the native Ubuntu evidence below supersedes this environment blocker. Preserve this environment distinction rather than claiming emulation explains every failure. Resume at A4–A7 with exact runtime/source provenance, RED-first diagnosis of the real failures, separate preflight and the complete original50 plus every active Linux control. Obtain full validator/zero-leak evidence and full applicable phase gates before C2; do not advance A8–A15, amend S5.2 hosting or migrate CI from partial Linux controls.

Required before C2: production I1–I4 GREEN, complete original50 regression plus every active new control, separate preflight, probe failure/deadline controls and source restoration receipts, full applicable suites/static/spec gates and Darwin50 regression. A8–A15 and all hosted gates remain open. Failed/diagnostic/filtered attempts cannot be borrowed as complete qualification.

Phase-1 build-lock correction is required by the real Ubuntu run: reboot
removed a previous invocation's `/tmp` identity file while its published
`.next.build-lock` symlink remained. Seed row counts proved setup completed;
acquisition retried the dangling link instead of reaching a fresh build.
Extend the existing O-build-lock case with a bounded real child and a missing
identity cut before changing acquisition. Refuse immediately and preserve the
symlink; only an actual saved identity can authorize dead-owner reclamation.
This narrow A5/Ownership correction changes no case title or manifest count,
does not reclaim unknown locks, and requires RED/GREEN/refactor plus complete
owning regression before C2.

### Native Ubuntu evidence (2026-10-05)

The transfer checkpoint `8e0d85a3a2741d88f502cc76390819c9bb755f77` is checked out
in `codex/s53a-linux-isolation`. Native Ubuntu24.04.4 amd64, kernel
`6.8.0-134-generic`, ordinary UID1002, Bubblewrap `0.9.0-1ubuntu0.3`, scoped
AppArmor profile and rootless Docker29.5.3 now pass the real namespace and
Postgres preflight without sudo during test execution. Administrative package
and profile provisioning is already complete; this receipt does not claim the
setup script itself is sudo-free.

Two reproduced defects required narrow corrections: the long worktree's
production mount policy was144827bytes, exceeding the unchanged112KiB bound;
and LI-refusal assumed `/var/run/docker.sock` instead of the runtime-selected
rootless endpoint. The policy codec uses an explicit null marker for identical
source/destination paths on both launch hops, reconstructing the exact policy.
The refusal control uses Testcontainers' selected host Unix socket. No mount
authority, frame limit, timeout or test inventory was relaxed.

- RED: invocation `84dca0fe-4604-4708-a709-d57e7503d5f1`, reporter
  `/tmp/maister-ab-isolation-Q8Xkmz/vitest.json`: LI-boundary passed,
  LI-refusal failed and production setup refused the oversized policy before
  I1–I4 ran. Cleanup reported zero leaks; subsequent diagnostic log retrieval
  also failed. The new long-path codec regression failed before the fix and
  all3 codec cases passed afterward.
- Node24.19.0 complete current inventory: original50 plus active Linux2,
  8files/52cases, no skips, report validator passed, final sweep zero leaks,
  1452.939s including cleanup under the unchanged2340s allowance. Invocation
  `4f4cd199-202e-4872-9ac3-31d3db8760ea`; reporter
  `/tmp/maister-s53a-native-24.19/maister-ab-isolation-rjCNDw/vitest.json`;
  log `/tmp/maister-s53a-native-24.19/full.log`.
- Node24.19.0 separate final-code preflight: 1/1, validator passed, zero leaks,
  11.570s, invocation `407af545-d808-462a-a959-87e65a5caf08`; reporter
  `/tmp/maister-s53a-native-24.19/maister-ab-isolation-doTgeM/vitest.json`.
- Node24.15.0 separate preflight: 1/1, zero leaks, 12.405s, invocation
  `0ade3761-ce4a-4814-b091-002c5e378999`; reporter
  `/tmp/maister-s53a-native-24.15/maister-ab-isolation-A0JZY6/vitest.json`.
  Focused LI-boundary/LI-refusal and production I1–I4: 2files/6cases,
  validator passed, zero leaks, 186.128s, invocation
  `da7d5c73-86c4-4916-8b0b-11b18f63c9fd`; reporter
  `/tmp/maister-s53a-native-24.15/maister-ab-isolation-D6k2C7/vitest.json`.
  This focused receipt is not the complete52 inventory at the minimum Node.
- Static/spec checks passed: changed-code lint, web/supervisor/MCP typechecks,
  MCP build, full docs validation, contract validation and adapter mirrors.
  The tested uncommitted source is identified in
  `/tmp/maister-s53a-native-24.19/source.json`: tracked diff SHA256
  `8345963fc06c2a9a2db80a27a190ce463eb32a5faeb0a6904a859e57bed87947`
  and untracked codec-test SHA256
  `bdf06bdc65a285276188eb828bca8dced17b1003a727c218b6b8ccabae15e49c`.
  Subsequent changes only record this evidence and the fix learning note.

The environment blocker is resolved and current Linux production controls are
GREEN. The C2 receipts below complete the remaining phase gates and final-source
Darwin regression. A8–A15, future lifecycle controls, complete minimum-Node
inventory and hosted acceptance remain open. No CI migration or hosted Linux
qualification is inferred from this local evidence.

### C2 — final-source Phase-1 qualification (2026-10-05)

The owner-pushed Ubuntu correction was pulled by fast-forward to
`73da16895d84029ec92686308ec950cae201dc89`. The tracked four-file diff from
the transfer checkpoint hashes to the native receipt's
`8345963fc06c2a9a2db80a27a190ce463eb32a5faeb0a6904a859e57bed87947`;
the committed codec test bytes match
`bdf06bdc65a285276188eb828bca8dced17b1003a727c218b6b8ccabae15e49c`.
This independently verifies source correspondence. The native JSON reporters
remain on the owner's Ubuntu host and were not reopened from Darwin; their
recorded provenance above is retained rather than represented as a new run.

All following checks used the clean, frozen 73da16895 source on Darwin ARM64,
Node 24.15.0, with no concurrent test lane or running emulation VM. Independent
report revalidation passed for every complete integration group, with no
failed/skipped/todo cases or runtime errors and zero terminal leaks before
containment:

| Group | Full inventory / duration including cleanup | Invocation / reporter |
|---|---|---|
| Supervisor integration | 36 files/310 cases; 31.900s | `52c15464-20d8-408e-ace7-f614a0ef2af6`; `maister-ab-supervisor-lMMoVg/vitest.json` |
| Separate Darwin I-CI | 1 file/1 case; 4.164s | `a40a2d10-d2aa-489f-961e-93275dec5acc`; `maister-ab-isolation-w6W28P/vitest.json` |
| Complete Darwin isolation | 7 files/50 cases; 820.063s | `79472a5a-8434-4c9d-a471-9e6fdeb2cfdd`; `maister-ab-isolation-fekNCf/vitest.json` |
| Ordinary web integration | 581 files/5168 cases; 1512.051s | `160e9a47-1244-4524-9eca-2010a2234504`; `maister-ab-web-mTeDQH/vitest.json` |
| Scheduler clock | 1 file/6 cases; 39.187s | `bc7354a6-720d-40ed-b8c7-34809e75a2e6`; `maister-ab-isolation-KFsVlD/vitest.json` |
| Both opt-in load owners | 2 files/2 cases; 508.781s | `5b31112b-cfe9-4a88-9d21-ce94cb3dda42`; `maister-ab-isolation-XUGOYc/vitest.json` |

Reporter directories are under
`/var/folders/p3/lj5f1_ys6650hwvry91_qr2c0000gn/T/`; complete logs and
source-freeze/verification receipts are in
`/private/tmp/maister-s53a/phase1-oct05/resume/`.
The frozen `vitest list --project=integration --filesOnly` inventory contains
592 unique files. The five disjoint web groups cover exactly those 592 files and
5227 cases, including both unchanged 300s/120s load windows. T5.3 settlement
p95 was 5593ms below 10000ms. Isolation remained serial/unsharded; ordinary and
supervisor groups used the existing concurrency-four owning lane.
The fresh default production build took 17.387s, BuildID
`xh7HixDRHaJnuZU6FCowB`, revision 73da16895.

Full web unit 879 files/9207 cases and supervisor unit 50 files/495 cases passed.
Both typechecks, full read-only lint, lane 14/14, runtime 4/4/runtime pin,
contract validation and all documentation/generated-ERD gates passed.
`git diff --check` passed. The initial unbounded supervisor aggregate retained
one handshake failure: the 500ms initialize deadline expired before the intended
newSession-hang assertion. Its unchanged focused diagnostic passed; the full
36-file/310-case owning lane then passed at existing concurrency four. Preserve
the initial failure log in `phase1-oct05/supervisor-integration.log`; the
focused result is not borrowed as a complete gate. No timeout, case, source or
quarantine change resolved that load-dependent aggregate failure.

**C2 is accepted for A4–A7 only.** A8's nested-mount/invalid-restart controls and
A9's three wrapped lifecycle owners remain required; the source-review concerns
listed above still require discriminating real controls. This acceptance does
not claim the final 55, complete minimum-Node Linux lane, G-LINUX or hosting.
No API/event/auth/data/production-deployment contract changed; no migration was
created. S5.2/S5.3/S5.4 remain open and 42/45 remains unchanged.

The already owner-pushed [run 37316106190](https://github.com/maister-dev/maister/actions/runs/37316106190)
at 73da16895 was inspected read-only, including its downloaded isolation
artifacts. All four web shards, both runtime/supervisor jobs, browser, static
and production-image jobs passed. Intel isolation failed with exit 124 after
53m25s: separate preflight 1/1 in 208.317s; three completed owners/29 cases in
1922.202s; no complete seven-suite reporter; terminal cleanup removed one
surviving container. Recorded setup 616s, preflight end 828s, slice budget 2340s,
slice end 3177s and runtime cleanup end 3188s preserve the fixed-budget failure.
Nested cleanup-control reporters are not substitutes for the absent full
report. No workflow was dispatched or rerun, and this remains failed macOS
hosted evidence rather than Linux qualification.

### A8 — nested-mount control (2026-10-05, in progress)

On the existing disposable Ubuntu24.04.5 amd64 VM (kernel6.8.0-142,
Node24.15.0, ordinary UID1001, pinned bwrap0.9.0-1ubuntu0.3), LI-refusal now
creates a real tmpfs submount in a trusted validator namespace. The application
driver's exact bind policy is not widened. The control reaches `/proc/self/mountinfo`,
then calls the actual pre-exec validator and checks an execution witness.
It remains a subcontrol of the existing LI-refusal title; the inventory is
still two active Linux cases, not the future five.

- Valid RED: only the nested-host-mount guard was removed, preserving valid
  source syntax. Invocation `edc6b865-e5ae-46f6-be4f-6cdc7c57ccb2`,
  `red-nested-mount-2/maister-ab-isolation-teFP4k/vitest.json`, 25.660s:
  LI-boundary passed; LI-refusal failed with `nested:true`, `refused:false`
  and `execWitness:true`. Cleanup observed zero leaks. Earlier compiler and
  missing-ledger setup failures are retained but do not count as RED proof.
- Exact restoration: validator source SHA256
  `e78a13864e15e0ea6b5dbc6b356421b142a67f1fb71669003bb89b14b343c199`;
  mutant SHA256 `a7701a303940d32ddb50dee28ae10e709a095f2f5d4a83f0784cdf845b8c666a`.
- GREEN: invocation `c74a59dc-f938-4f0d-9818-80a3ec2987c0`,
  `green-nested-mount/maister-ab-isolation-Zjt5ah/vitest.json`, 62.557s:
  both active cases passed, validator passed, zero leaks, witness absent.
- REFACTOR: one typed input object and existing structured `logInvocation`;
  invocation `02e33d4d-4d6b-4319-9d82-07fb477f3e85`,
  `refactor-nested-mount/maister-ab-isolation-qciLve/vitest.json`, 61.642s:
  both cases, validator and zero-leak cleanup passed again. Web typecheck,
  changed-file lint and formatting checks passed.

Guest reports are under `/home/fixture/evidence/phase2-oct05/`; the exact
reports, source restoration receipt and both-stream logs are retained locally
under `/private/tmp/maister-s53a/amd64-vm/`. This is real kernel behavior in
emulated amd64 development, not a full native or hosted budget qualification.
A8 still requires the actual production invalid-policy restart control; A9–A15
and all full-inventory/hosting gates remain open.

### A8 — production restart checkpoint and environment limit (2026-10-06)

The current LI-refusal subcontrol also uses real migrated PostgreSQL and the
production supervisor/web entrypoints. Clearing isolation or changing the
runtime root refuses before a launch attempt and leaves the original `/login`
serving. Replacing the frozen web-root inode kills the original web, causes
one typed policy refusal and leaves no serving replacement. This adds no case
title and does not duplicate I3's successful domain-continuity scenario.

- Passing development receipt: invocation
  `17f55eea-7d9b-48d6-9b0c-325e42e8825a`, reporter
  `restart-fixture-ready-built/maister-ab-isolation-MwN72L/vitest.json`:
  current owner 2/2, report validator passed, no skips/runtime errors,
  `overrideLaunches:0`, `invalidPolicyAttempts:1`, no replacement and zero
  terminal leaks. The reported 296.277s is guest timing, not budget acceptance.
- The explicit existing `MAISTER_TEST_BUILT_WEB` handoff carried a verified
  default production build: revision
  `2720fcfb129158e49b8a4579e33d1c6be0297017`, BuildID
  `5kWhY8ukjoLmcMQK64fI-`, artifact `/home/fixture/repo/web/.next`, build
  invocation `b4cdb732-2973-4172-afab-cc48949e4071`. The separately owned
  diagnostic builder reported 599.798s and zero leaks. This is a diagnostic
  handoff, not a fresh build inside the current owning lane and not G-LINUX.
- The preceding default attempt, invocation
  `cc4fd663-8593-4660-8cbc-038be46c9697`, reporter
  `restart-fixture-ready/maister-ab-isolation-9kA9ma/vitest.json`, hit the
  unchanged 600000ms setup limit before production readiness: both cases were
  skipped and terminal cleanup removed one PostgreSQL container. It is failed
  setup evidence, not RED for restart behavior. The new fixture exposes
  build-stage cleanup before awaiting the build; timeout/startup cancellation
  qualification remains open rather than inferred from a normal cleanup pass.
- Restart retry falsification was attempted with a syntactically valid
  substitution of the existing retry helper. Invocation
  `208edc89-97dc-435e-b881-36033e384422` did not reach the restart assertion.
  At host UTC `2026-10-05 22:48:10`, the guest reported
  `2026-10-05 15:50:02`. The host/guest clock divergence invalidates budget
  conclusions. The exact registered/tagged Vitest PID31666 received SIGTERM;
  the owning runner failed with no complete reporter, reaped eight surviving
  processes and removed one container. Those discoveries remain failures.
  Mutant source SHA256
  `fa445a02d73bd001d602d76c1f9c9d902cb0a0c024b3889af2050b6a2f9a7164`
  was restored exactly to
  `4fee19922fb14bf6de28a3e93addc598da89336be0995123c228aac75a63d2dd`.
  This attempt does not satisfy the required RED/GREEN/REFACTOR cycle.
- The existing ARM64 LinuxKit development kernel has no
  `/proc/sys/kernel/yama/ptrace_scope`, so it cannot satisfy the current
  bridge-authority prerequisite. No host sysctl/profile change, privileged
  fallback, timeout/resource increase, CI edit or infrastructure migration
  was made to obtain a pass.

Checkpoint source identities: Linux owning test SHA256
`b51aaee397aa9c20491b231a5d8079f87c421f79603c6ac6ce808fa7eaf0291e`,
lifecycle fixture SHA256
`2d7a67b0693833e4fed6995569f13aedf2137ddde8268bb40a61db60d8e480ff`,
nested-mount fixture SHA256
`67f5dd056d35930f1d4d252db51c24b636002c3dc34fb993b55447819e40a423`.
Exact guest evidence directories and both-stream logs were copied under
`/private/tmp/maister-s53a/amd64-vm/`; failed attempts and restoration metadata
are retained. No final-source native qualification is inferred from these
receipts. Web typecheck, changed-file lint/formatting, runner controls,
contracts/docs/unchanged ERD and diff validation are the checkpoint's static gates.

A8 remains unchecked: reproduce the real retry RED on native Ubuntu, restore
and rerun the complete current owner through GREEN/REFACTOR, then qualify the
remaining cancellation controls. A9's three wrapped lifecycle cases and A10's
mandatory 55-case inventory are still required before A11's complete both-Node
Linux/Darwin phase gates. C3/G-LINUX, all prospective hosting work, S5.2/S5.3/
S5.4 and 42/45 remain unchanged. This checkpoint is prepared for native work;
it is not the qualified C3 or owner-push hosting candidate.

## PR #9 harness-repair checkpoint — 2026-10-06

The owner requested refresh and build repair on the same
`codex/s53a-linux-isolation` branch. Explicit ff-only pull and later refetch
confirmed owner source `73da16895d84029ec92686308ec950cae201dc89`, master
`f43ac1570380d2be19f7c59a70cd993f24ace440`, and retained local checkpoint
`33165ce635e69d901cab0a83394c2e708a5e6530`. PR #9 remains open. No agent
push, hosted rerun, merge or infrastructure change was performed.

[Run 37445755131](https://github.com/maister-dev/maister/actions/runs/37445755131)
tested merge `2d5a947fddcd73d0801855dbcb9e12c3e7df7008`. Node24.15 web
shard1 failed one gate-permission-resume case with a retained proxy `write EPIPE`;
the equivalent Node24.19 shard passed. Intel isolation exited124 after54m29s:
separate preflight1/1 passed249.746s; three completed suites reported26/29,
and no complete50-case reporter exists. Its cleanup failures were an unverifiable
group member and subsequent real database starts unable to connect to reused
Ryuk. Missing native errno and reaper socket/container retirement evidence
leave the exact hosted interleavings uncertain.

The bounded repair corrects common SSE/upload cancellation handling while
preserving parser/barrier refusal, publishes the second revalidated Darwin
kernel status/group/parent with bounded numeric environment diagnostics, and
retains the public reaper in the web/isolation runner until actual process exit.
Acquisition has the existing deadline and owner interruption; supervisor-only
execution remains Docker-free. Direct entry uses a parent-minted private
invocation before allocation and releases only that capability after runner death.
Real TCP/kernel/Docker/PostgreSQL RED/GREEN/refactor and valid removal controls,
source hashes, all sibling classifications and review findings are recorded in
[the owning patch](../patches/2026-10-06-14.05.md).

The two appended web owners add three proxy cases and one reaper case; the
web inventory is46 files,23/23, with all original44 shard assignments intact.
Darwin isolation remains the original seven suites/50 cases plus separate1
preflight. The native transition assertions remain inside O-identity; fixture
scheduling only places its actual target first to keep its bounded diagnostic
receipt independent of unrelated process omissions. No acceptance case was
removed, skipped or weakened. Product HTTP/SSE/ACP/OpenAPI, PostgreSQL/SQLite
schema and migrations, configuration, dependencies, deployment and CI recipe
remain unchanged; no ADR/migration allocation is needed.

Final local receipts are Darwin ARM64 development evidence. Owning reports
must pass `validateLaneReport`, contain no failed/skipped/todo/runtime errors,
and pair with an exact invocation terminal sweep reporting zero leaks.

| Gate | Node | Exact invocation / complete receipt | Duration |
|---|---|---|---|
| Separate final preflight |24.19.0|`e0229797-a442-4f25-95ae-22a99bca63e4`,1/1|4.947s|
| Final serial isolation |24.19.0|`73467b75-ff34-46ae-a6e0-8b7d431beda5`,7 suites/50/50|817.219s|
| Complete web shard1/2 |24.15.0|`72ede667-c925-46d8-a71f-c514e9a77e39`,23 suites/332/332|749.177s|
| Complete web shard2/2 |24.15.0|`61a960bd-e021-4a84-9a14-b2c4666d5982`,23 suites/308/308|1398.810s|
| Complete web inventory, both shard file sets in one bounded pool |24.19.0|`44ab5ab5-914f-4f5d-b7d8-b2fb6b3e5216`,46 suites/640/640|1401.489s|
| Docker-free supervisor, absent endpoint/Ryuk disabled |24.15.0|`df5dfbfc-c0c7-40a1-8d39-2a3997df8d54`,10 suites/111/111|17.247s|
| Docker-free supervisor, absent endpoint/Ryuk disabled |24.19.0|`637ca17f-d81d-4827-9530-441ea3e617e1`,10 suites/111/111|16.035s|
| Remaining direct proxy consumers, each complete owner serially |24.15.0|11 exact invocation reports,68/68; `proxy-consumers/qualified-owners.json`|382.308s summed|
| Enabled standalone host-span load owner |24.15.0|`090903a3-8055-4078-85c2-3b5deadd21ac`,1/1; six runs,120s ingest lag|127.389s; P95=5583ms<10000ms|

Evidence root: `/private/tmp/maister-s53a/pr9-fixes/`. Final preflight/full
reporters: `final-node24.19/maister-ab-isolation-OzdwkX/vitest.json` and
`final-node24.19/maister-ab-isolation-smBrsh/vitest.json`. The50-case reporter
contains partitions6, cleanup13, dispatch10, process-death6, production-boot8,
isolation4 and concurrency3. Its native O-identity passed1.044s; all three
previously failed cleanup owners passed. The intermediate full50 invocation
`e990086e-2e4e-4421-b46a-9dba4e0d440e`789.804s predates the final acquisition
and direct-entry refinements and is not borrowed as their final qualification.

Production web build passed on official Darwin ARM64 Node24.19.0; all-document
and unchanged ERD validation, API/event/adapter contracts, web/supervisor/MCP
typechecks, MCP build, changed-file lint/format and runner/workflow controls
passed. `final-qualified-reports.json` independently revalidates all seven main
receipts above, exact case-name equality across Node versions, and preservation
of all636 original hosted web cases plus the four harness cases. Node24.19's
local aggregate uses the existing four-worker pool and validates all46 files;
it does not supply the four separate mandatory hosted shard artifacts. The CI
matrix still runs both shards on each Node. All11 additional proxy owners passed
their complete68-case inventory with independent validators/zero-leak receipts.
The separate opt-in load control ran enabled and alone: all six flows settled
through host spans without conflicts; P95=5583ms under the unchanged10000ms
limit while ingest lag remained120000ms. Its owning reporter is
`proxy-load/maister-ab-web-kBoIoh/vitest.json`, with validator success and zero leaks.
The12 source-file SHA256 identities are retained in `final-source-identity.json`;
runner source SHA256 is
`ad69a0db59247cd3b6592f959665e5bb46b9fd2388849d0ffb84ee738312125f`.

- [x] Repair cancellation, native inspection and runner-owned cleanup lifetimes
  through discriminating RED/GREEN/refactor and valid restored falsifications.
- [x] Complete local owning/consumer inventories, production build, spec/static
  gates and adversarial review; preserve exact authority and zero-leak acceptance.
- [x] Owner pushed64ca10b8; exact-source/merge-parent hosted artifact audit
  completed in the second audit below. Both isolation attempts failed, so this
  verifies the attempted delivery and failure, not hosted acceptance.
  Local ARM64 receipts do not close the hosted budget or Linux qualification gates.

This corrective checkpoint does not complete A8–A15/C3/G-LINUX or establish
hosted Intel budget success. S5.2/S5.3/S5.4 and42/45 remain unchanged. After
local repair commit, the owner alone pushes; verify the exact pushed source
SHA, PR merge parents, every mandatory hosted job and its independent complete
report/timing/zero-leak artifacts before claiming hosted repair. Continue native
Ubuntu A8–A11 qualification before any hosting amendment or Linux CI migration.

### PR #9 second hosted audit and CI correction (2026-10-07)

Owner-pushed `64ca10b8f61c8c3365898f330703c5ac0b53574b` reached both
[PR37501035415](https://github.com/maister-dev/maister/actions/runs/37501035415)
and [push37501030544](https://github.com/maister-dev/maister/actions/runs/37501030544).
PR merge4551ab9d has parentsf43ac157/64ca10b8; its tree537230d4 matches the
pushed source. Four web shards, both runtime/supervisor jobs, static and image
checks passed in both; PR Librarian13/13 passed. Intel isolation failed exit124
in47m07s/53m10s, with no complete50-case reporter. PR completed42/43 cases:
missing-reporter cleanup's watchdog could not inspect a live owner. Push
Librarian failed before browser startup because actual25ms daemon contact was
combined with5.130s SDK/Compose discovery under the3s absent-Docker guard.
These are failed hosted attempts; no deployment migration is required.

The bounded correction separates actual daemon contact from bounded SDK
construction, inspects explicitly selected Darwin PIDs without global catalogue
reliance, preserves synchronous refusal causes, and batches only fresh test
main+Brain migration transport through public Drizzle transaction/ledger APIs.
No production SQL/schema/journal, API/auth/event, product configuration,
dependency, deployment, CI recipe, job/slice budget or acceptance case changed.
Full repair, discriminating RED/GREEN/refactor/removal receipts, exact sibling
searches and adversarial invariants are in
[the owning patch](../patches/2026-10-07-13.38.md).

Final local development proof is Darwin ARM64. Separate Node24.19 preflight1/1
passed4.699s; complete7/50 isolation passed820.588s with fresh production build,
validator success, unchanged exact owning titles and zero leaks. Both exact Node
versions passed every full main+Brain DB consumer:21ordinary owners/155cases plus
serial clock6; total90.401s on24.15,90.849s on24.19. The generic pg owner is7
cases (original4 plus three distinct controls); the default browser lane passed
13/13 in163.213s with zero process leaks and its exact DB container removed.
Local main submission count1511→383 (779→521ms), Brain79→17 (60→43ms), with
full catalog/ledger/seed/idempotence and rollback parity. This proves transport
reduction, not hosted Intel/Linux wall time. Complete reports, source hashes and
independent name-set/validator/sweep proof live in
`/private/tmp/maister-s53a/ci-oct07/final-qualified-reports.json`.

- [x] Repair explicit PID/inspector observation and durable watchdog diagnostics
  with real native/process RED/GREEN/refactor controls and preserved authority.
- [x] Repair daemon/SDK phase attribution and reduce test-only migration transport;
  full semantic parity, actual timeout/refusal/removal controls and cleanup pass.
- [x] Complete original50 plus independent preflight, both-Node full affected
  consumer inventories, default browser13, spec/static gates and adversarial review.
- [x] Owner delivered the preceding three-phase correction as
  `c9e37308791d88bf8c4f72afbc01fe0f86f7f2a5`; exact PR/push source trees verified.
  This records delivery only; hosted isolation qualification failed below.
- [ ] Hosted acceptance: verify
  the exact pushed SHA and PR merge parents/tree, all four web and two runtime/
  supervisor reports, static/image/browser jobs, independent preflight and complete
  seven-suite/50-case isolation report via `validateLaneReport`. Inspect saved
  diagnostics for setup/build/suite/slice/upload/cleanup/total durations and zero
  leaks under the unchanged60-minute job and existing dynamic2340s-max slice.
  Partial reporter, timeout or contained survivor remains failed qualification.

A8–A15/C3/G-LINUX and S5.2/S5.3/S5.4 remain open at42/45. The52-case native
Linux Phase-1 proof is not the required final55 at both Nodes; current common
harness changes also need final-source Linux qualification before hosting work.
Browser lifecycle expansion and separate-user deployment remain separate S5.3
work. If hosted timing still fails, preserve these bounded receipts and measure
remaining setup/build/boot costs; do not change budgets, cases or runner size.
Push and all hosted visibility remain the owner's action.

### PR #9 third hosted audit and bounded correction (2026-10-07)

The owner-pushed source is `c9e37308791d88bf8c4f72afbc01fe0f86f7f2a5`.
[PR37610010758](https://github.com/maister-dev/maister/actions/runs/37610010758)
tested merge `a0cbdc875910e644350b85d0334c335e098a4bdf`, with parents
`f43ac157`/`c9e373087` and tree `fb2fb6bb13311f1de9cfafb9ddda8e5545dae2f5`
equal to the pushed source. Its four web reports pass `validateLaneReport`:
23 suites/332 cases and23/308 at each Node; both runtime reports pass10/111.
Static, production-image and Librarian jobs passed. Only Intel isolation failed.

PR preflight never entered Vitest: the retained reaper's real Ryuk0.11.0 pull
failed Docker500, guest DNS `registry-1.docker.io` through192.168.5.1:53 timed
out. No actual report exists; report upload correctly failed. Diagnostic upload
then exhausted its five host-side request attempts after successful runtime
deletion. These are separate observed failures; a common network cause is
unproved. The script's absent `COLIMA_HOME` directory made the pinned Colima
ignore that setting and use `~/.colima`, as its source and actual CLI control
confirm. The corrected recipe must create both private runtime homes before
Colima, refuse a foreign/symlinked profile socket, declare its VM resolver and
capture guest DNS configuration, preserving the same pins/resources/start count.
Use the separate owned `runtime_dir/lima` home: the nested Colima home makes
the pinned SSH socket108 bytes on GitHub, versus100 with the shorter path.
The canonical UTF-8 path must be strictly shorter than104 bytes, checked before
downloads/start. Real-shell103-byte positive and104-byte refusal controls pass
7/7 at both exact Nodes; removing the early guard falsifies the refusal control.
The task-private native VZ smoke on Darwin ARM64 captured actual dnsmasq
upstream1.1.1.1, pulled Ryuk0.11.0 and ran real Postgres16.15 SELECT53 at both
Nodes. Containers, profiles and VZ processes were absent after cleanup. These
are development receipts, not hosted Intel or Linux-driver qualification.

[Push37610004437](https://github.com/maister-dev/maister/actions/runs/37610004437)
passed independent preflight1/1 (224.37s test;255.427s lane). Runtime was ready
at764s; preflight finished at1028s; the dynamic suite allowance was2212s.
Cleanup completed13 cases,12passed/1failed in1242.262s: SIGINT failed on process-group
`kill EPERM` while the parent-death watchdog terminated fixtures. Partitions
passed6/6 in693.852s. Dispatch began, but no complete owning report exists.
The outer lane exited124 after2215.123s, reaping one remaining web process and
an owned PostgreSQL container; runtime deletion finished at3251s. This is
contained failure, never zero-leak qualification.

Apple's kernel rejects a signal to an existing zombie-only group with `EPERM`.
The correction may acknowledge concurrent retirement only after a complete
fresh kernel group catalogue, including every UID and inspector helper, proves
no live member. Existing invocation snapshots intentionally omit those entries
and cannot prove that condition. Real permission denial, incomplete inspection
and a live/foreign member retain the original failure; signal authority is never
widened. The existing O-identity owner must cover the actual syscall race and
refusal, preserving all original50 owning cases and separate preflight.

Measured push costs: one reused production build249.717s; nine independent
cleanup databases549.686s total startup/main/Brain; two suite templates95.547s;
22 web births-to-listening410.917s; ten DB clones5.792s. These are overlapping
phase costs, not additive extra suite overhead. Already-completed suites use
1936.114s; even instantaneous setup can restore only128s before the fixed2340s
slice cap. DNS repair alone cannot qualify the remaining31 cases. Do not claim
the budget fixed, share cleanup resources across invocations, or weaken cases.

Final corrective worktree qualification is bound to23 frozen source hashes
and the unchanged lockfile in
`/private/tmp/maister-s53a/ci-run-37610010758/final-qualified-reports.json`.
Darwin ARM64/Node24.19 passed original7/50 in812.562s, separate preflight1/1
in4.643s and ordinary browser13 in165.941s, all with clean terminal receipts.
Both exact Nodes passed all22 shared-consumer owners/161 original cases;
Node24.15 additionally passed the full cleanup13 owner in93.643s. Independent
`validateLaneReport` and exact original name-set comparisons passed. All
source hashes remained unchanged through execution. Docs/contracts, web and
supervisor/MCP types, MCP build, changed-source lint, formatting, native strict
compilation and runner/recipe19 controls passed; adversarial review found no
material code or acceptance defect. This qualifies the local correction only.
The earlier local4/13 attempt failed because its command omitted the Docker
CLI from PATH; it is retained as environment failure, not behavioral RED.

- [x] Audit both exact-source attempts, complete green reports and failed
      preflight/cleanup/budget/upload evidence before choosing the correction.
- [x] Complete real RED → GREEN → REFACTOR group-retirement controls, full Darwin
      owning regression/preflight, both-Node affected controls and adversarial review.
- [x] Complete private-home/socket/DNS setup controls and platform-labelled real
      CLI/VM evidence; hosted Intel resolver reachability remains unqualified.
- [ ] Owner-push checkpoint: push only the verified focused phase commits; verify
      that exact SHA/merge tree and all hosted reports/timing/cleanup artifacts.
      Preserve the existing macOS S5.2 contract until A8–A15/C3/G-LINUX legitimately
      qualify and prospectively amend Linux hosting. S5.2/S5.3/S5.4 remain open42/45.

### CI-R4 — macOS fixed-budget database setup (2026-10-09)

The owner pushed R3 through `6bdb8970130c40e7b6f813ad5d97de98be7a370c`.
[PR37643544568](https://github.com/maister-dev/maister/actions/runs/37643544568)
tested merge `20b91d4194c6d1928efc519df9d31fd6aa19fc7e`; its parents are
`f43ac157` and `6bdb897`, and tree `d75471572df214bad9a4c0aacfc1a918d0e1c904`
equals the owner-pushed tree. Runtime was ready at 311s, independent preflight
finished at 454s and passed 1/1 with zero leaks. Four web and two supervisor
reporters pass `validateLaneReport`; other mandatory jobs passed. All 13 cleanup
cases, including SIGINT, passed. The full isolation slice still exited 124 at
its unchanged 2340s cap: four completed suites passed 35/35 in 2313.109s,
leaving 26.891s before collection/runner overhead for three owners/15 cases.
The full reporter is absent. Terminal containment removed one owned PostgreSQL
container; this remains failed qualification. The matching owner-push run
37643538064 also failed only the Intel job; no rerun was dispatched.

Deduplicated phase evidence shows nine independent cleanup databases consumed
375.327s (174.440s startup and 200.887s main/Brain migrations), and three suite
templates consumed 109.400s. These costs overlap suite durations. Existing
`container-create-start.durationMs` measured preparation before SDK `.start()`,
not actual container creation; correct that field and record actual startup.
Build reuse already works and shutdown deadlines have no measured defect.
No process-inspection optimization or compile-cache assumption is needed.

Owner authorized fixing the macOS job. The correction preserves fresh labelled
real PostgreSQL containers and unchanged durability settings, with bounded 512 MiB
disposable data tmpfs. It batches pending main/Brain SQL and ledger insertions
inside Drizzle's transaction, preserving installed migrator parity while
reducing fresh-lineage submissions 383/17→6/6. Existing database owners gain
actual filesystem/capacity/settings, incremental/reapply and runtime rollback
controls; no new isolation case or manifest change is required. SQL/journals,
production API/config/deployment and both drivers remain unchanged. Linux must
requalify this changed harness before its future hosting gate.

The first full minimum-Node web pass exposed a capacity regression: 6 of 640
cases failed in the scheduler owner after PostgreSQL exhausted tmpfs while
allocating WAL. The original 16-case owner retains two 24,000-row cardinality
controls and updates accumulated history. Its isolated run reproduced the
failure. Retain the 512 MiB hard cap and qualify 64/32 MiB max/min WAL recycling
targets with all durability settings enabled. These targets are soft; actual
capacity, fix-disabled falsification and complete owners must pass. Preserve
the first failed reporter and requalify all affected sources after correction.

- [x] Reconcile exact pushed/merge source, uploaded reports, fixed-budget timing
      and the measured repeat-cost envelope; preserve failed hosted evidence.
- [x] Amend the canonical test contract and reproduce real RED: disk filesystem
      instead of tmpfs, and 383 instead of 6 main-lineage submissions.
- [x] Complete GREEN → REFACTOR for both exact Nodes, full database/template
      owners, original name sets, runtime-failure rollback and measured capacity.
- [x] Freeze final sources; qualify separate Darwin preflight/full 7/50,
      minimum-Node cleanup 13, applicable web/browser consumers, zero leaks and
      all spec/static/format gates; perform adversarial review before commit.
- [ ] Owner-push checkpoint: owner publishes the locally verified R4 phase
      commits; verify that exact SHA/merge tree, actual preflight/full reporter,
      `validateLaneReport`, slice/job headroom, cleanup and all mandatory jobs.
      Leave S5.2/S5.3/S5.4 unchecked at 42/45 until their real gates pass. If setup
      savings still do not fit the budget, retain the failure and measure the
      next bottleneck; never increase timeout/resources, shard, or drop cases.

Local post-refactor Darwin ARM64 qualification preserves all 105 frozen source
hashes: both exact Nodes pass database/template/scheduler 27/27 and full web
640/640; Node24.19 separate preflight 1/1, complete serial isolation 7/50 in
782.510s, and original browser 13/13 pass; Node24.15 cleanup 13/13 passes. All
actual exits, original name sets, strict reporters, zero leaks, capacity receipts
and 13 static/compile gates pass. The [R4 fix record](../patches/2026-10-09-12.23.md)
contains timings, falsifications and exact-source receipts. This closes the local
R4 correction, while its owner-push/hosted and Linux gates remain open.
CI-R4a implementation commit `47d5a5a80ec760bb8e62218d92b8fa4693c4a1aa`
matches all 105 frozen source hashes; CI-R4b records its receipts and remaining gates.

### CI-R5 — measured macOS module compilation reuse (2026-10-09)

[PR37925546122](https://github.com/maister-dev/maister/actions/runs/37925546122/job/113803484976)
tested owner-pushed `5c33875449efbf37857d36a50c289f6a4da04aed` through merge
`75f82adc86099892afa1b9bb336b925ae193ce6f`. Its parents are `f43ac157` and
`5c338754`; tree `e73a1b49f781c56d87f5010ef642e807a197c677` matches the pushed
tree. All four web reports validate at 640 cases per Node and both supervisor
reports validate at 111 cases. Independent preflight passes 1/1 with zero leaks
in 187.219s. The Intel job still fails: the unchanged 2340s slice exits 124,
with four completed owners/35 cases in 2144.263s and no complete outer reporter.
The three remaining owners/15 cases do not qualify. Terminal containment reaps
one adapter and one PostgreSQL container; the job takes 52m42s.

R4 reduces the same completed-owner total by 168.846s; its fresh main/Brain
transport remains 6/6 and suite templates already clone per case. The one
production build takes 244.737s, with subsequent reuse taking 30–134ms.
Deduplicated physical and embedded application logs show 43 real web boots,
median 12.833s and total 590.843s from kernel start to listening. Native-reader
latency/counts are absent, so a native redesign has no measured justification.
The retry-exhaustion and independent process-death resources retain their
owning contracts; neither is a removable wait or a reusable shared stack.

A bounded Darwin ARM64 experiment uses the same freshly verified build,
real PostgreSQL clones, real supervisor, production web, sandbox boundary and
HTTP readiness on both exact Nodes. Alternating disabled/cold/warm boots
measure warm startup savings of about 15%; first OS/process warmup is separate.
Actual child cache status/path witnesses, enabled-oracle failure with caching
disabled, restored enabled HTTP readiness and zero leaks precede adoption.
The experiment's final SIGKILL/restart runs with caching disabled and proves
ordinary restart continuity; the final cache-enabled owning suite must prove
its restart controls separately. This local measurement does not predict
Intel's final budget.

The correction owns only the macOS CI recipe, its setup script and executable
workflow control. A fresh private job-temporary cache is inherited by the
build/preflight/fixtures; an actual selected-Node child must prove activation,
exact containment and persisted file-module entries before environment export.
Unavailable/disabled caching fails explicitly. No cross-job artifact/cache is
restored. Kernel isolation, native process identity/foreign-signal refusal,
production API, SQL/migrations, configuration and deployment stay unchanged.
The default serial inventory remains seven suites/50 cases plus independent
preflight; both Nodes/two web shards, 60-minute job and original slice budget
remain binding. The new setup control explicitly advances the runner/workflow
owning inventory from 19 to 20 cases, including existing nested controls.

- [x] Bind the actual pushed/merge tree, strict uploaded reports, incomplete
      isolation inventory, fixed timing and failed containment receipts.
- [x] Measure cold/warm versus disabled production boots and cache witnesses
      on both exact Nodes; retain genuine falsification and restart evidence.
- [x] Specify private cache lifetime, capability refusal, source/Node
      invalidation, artifact exclusion and unchanged product/kernel contracts.
- [x] Complete setup/workflow RED → GREEN → REFACTOR on both exact Nodes;
      retain failed activation oracle and complete owning name sets.
- [x] Freeze the final executable sources and recipe; run independent Darwin
      preflight/full 7/50, minimum-Node cleanup 13, strict reporters, timings
      and zero leaks with the actual fresh cache setup.
- [x] Complete all required static/format/spec gates and adversarial review;
      commit implementation and qualification records as focused phases.
- [ ] Owner pushes the qualified phases; verify exact SHA/merge tree and
      hosted preflight/full reporter, all mandatory jobs, headroom and zero
      leaks. An incomplete reporter, overrun or containment still fails.
      S5.2/S5.3/S5.4 remain open at 42/45; Linux qualification/hosting, expanded
      browser lifecycle and separate-user deployment retain their own gates.

Local R5 qualification freezes 111 executable/config hashes at base
`5c338754`. The actual fresh-cache setup and all outer commands exit 0:
Darwin ARM64 separate preflight 1/1 in 5.166s (181ms cleanup), full seven/50
in 785.294s (370ms), and minimum-Node cleanup 13/13 in 93.189s (149ms).
Strict reporters and all original names validate with zero leaks. Two job
caches are removed; 33 read-only exact invocation/session/reaper queries find
no remaining containers. Both Nodes pass the original 19 controls plus one
new setup control; all 11 static gates pass. Adversarial source review finds
no material defect. The whole local lane does not improve on R4's 782.510s;
only the alternating boot experiment demonstrates the cache benefit.
Implementation phase `c5a3ddbddc4ea77f8000cd7e1cda2c11064b0965`
matches every frozen hash; the qualification phase changes only its records.
[The R5 fix record](../patches/2026-10-09-16.42.md) binds commands, hashes,
falsification, timings and remaining owner-push/hosted qualification.

### CI-R6 — fresh batched watchdog reads and measured hosted cost (2026-10-12)

[Run 37942262522](https://github.com/maister-dev/maister/actions/runs/37942262522)
tests owner-pushed `4c2917aee0d93c7b39dcadacc96d095ae056dd9b` through merge
`fd904426a0f3bfcc9abf9cdc99828146e5373726`, whose parents are master
`f43ac157` and that pushed commit. Tree
`a8bce5b47a714a149ffe40bbbd12e222ea9d1d74` matches the pushed tree. All four
web reports and both supervisor reports pass strict original-name validation;
Librarian browser, static and image jobs pass. Cache activation succeeds and
the production build falls from 244.737s to 153.768s. This does not qualify
the Intel lane: independent preflight passes 1/1 in 176.209s with zero leaks,
but the 2340s slice exits 124 without the complete outer `fSnGbw` reporter.
The same four owners/35 cases take 2183.691s, 39.428s longer than R5's prior
hosted audit. Three remaining owners/15 cases remain incomplete. Final sweep
records three leaked processes and removes one PostgreSQL container; the
52m56s job is failed qualification despite successful containment/uploads.

The remaining bottleneck is not established by these logs. Matched 33
case/boot-count web starts take 478.400s versus 453.401s; no startup win is
demonstrated. Sequential in-slice database setup takes 253.020s versus
230.230s; SDK discovery is contained within startup, migrations remain six
submissions per lineage, and 22 clones take 5.325s. Ingest wall timings
overlap transactions, event-loop work and deliberate barriers. They cannot
establish individual SQL latency or be added to the lane duration. No further
database, seeding or retry-budget change follows from those measurements.

A bounded real-process experiment measures the existing two native reader
executions per owner/parent check against one explicit-PID-list execution.
It preserves each PID's before/environment/after kernel proof, observable
foreign/inspector identities, transitions, missing identities, helper failure,
actual Seatbelt kernel denial and parent/owner death. Both exact Nodes pass
20 controls, 16 alternating ABBA blocks and zero-remnant checks. For 80
distinct-target checks, actual executions fall from 160 to 80. Per-check
local Darwin ARM64 wall time falls from 3.107ms to 1.529ms on 24.15.0 and
2.637ms to 1.293ms on 24.19.0; measured parent/reaped-child CPU also falls.
The absolute saving is small. Hosted reader CPU share and sufficient budget
recovery remain unknown; this is a verified overhead reduction, not a claim
that the Intel gate is solved.

The correction owns `process-environment.c`, the internal selected-list API
in `process-invocation.ts`, `fixture-parent-watchdog.mjs`, and the existing
O-identity/native fixture controls. Root owns the plan, canonical analytics
contract and dated fix record. A nonempty explicit list must never fall into
the global catalogue; duplicates share one fresh observation while both
expected identities still compare separately. Preserve request order,
missing results, every ownership/inspection flag and native diagnostics.
Known kernel identity with unreadable environment remains observable for
liveness with `owned:false`/`inspected:false`; it grants no signal authority.
Do not add a stricter watchdog precondition. Snapshot discovery, group
retirement and single-PID registration/signaling keep their existing contracts.

Watchdog checks retain the 500ms cadence and existing ancestry/death rules.
Record bounded lookup wall timings on the first successful check and every
120 successful checks using the existing loop: observed check count, selected
PIDs, cumulative/maximum lookup time, elapsed span and platform/invocation
identity. These are overlapping, right-censored observations, not CPU-share
or whole-lifetime totals. No additional polling loop, cached authority,
product configuration, dependency or infrastructure change is introduced.
The existing diagnostics artifact retains these records. Product APIs,
database schema/migrations, deployment and Linux hosting remain unchanged.
Linux uses the existing per-PID `/proc` reader in the new plural watchdog
call. Deduplication and collection-before-classification therefore need a
separate Linux O-identity, parent-death and runner regression before claiming
that platform qualified; Darwin GREEN cannot satisfy that gate.

- [x] Verify the exact pushed/merge tree, complete other reports, independent
      preflight and the failed full owning/timing/containment gates.
- [x] Measure current versus proposed real native reads on both exact Nodes;
      retain actual two-PID CLI RED exit 64, kernel-denial/death controls,
      execution/CPU/wall receipts and zero remnants; classify limits honestly.
- [x] Augment O-identity before implementation; RED → GREEN → REFACTOR for
      real selected-list behavior, missing/failed-peer handling, exact kernel
      proofs and the reached watchdog timing receipt on both exact Nodes.
      Preserve all owning titles; add no overlapping coverage-only case.
- [x] Freeze the final source and run quiet Darwin independent preflight,
      complete serial seven/50 and minimum-Node cleanup 13. Require actual
      exits, original name sets, validateLaneReport, timings and zero leaks;
      verify exact invocation/session/reaper resources read-only afterward.
- [x] Complete required static/types/MCP build/format/docs/contract gates and
      adversarial source/evidence review; commit implementation and records
      separately. If a shared precondition changes, requalify its full consumers.
- [ ] Owner pushes; verify the exact pushed/merge tree and hosted preflight,
      complete original reporter, budget/headroom, all mandatory jobs and zero
      leaks. Use actual watchdog timing records to assess hosted relevance;
      incomplete reports, overruns and containment still fail. Revert the
      focused correction if it introduces a behavior regression; retain failed
      receipts and measure the next cost if the budget remains unmet.
      S5.2/S5.3/S5.4 stay unchecked at 42/45; Linux qualification/hosting,
      browser expansion and separate-user deployment remain independent.

CI-R6 local qualification freezes 112 executable/recipe/dependency files on
base `4c2917a`. All hashes match implementation commit
`fcc9676db075cafdde51c9dad198deae6b7e741f`; the record phase changes no executable
source. Actual focused O-identity RED/refactor reports and fix-removal failures
on both exact Nodes remain distinct from complete owning qualification.

| Quiet Darwin ARM64 owner | Node | Suites/cases | Lane (s) | Cleanup (ms) | Leaks |
|---|---|---|---|---|---|
| Separate preflight | 24.19.0 | 1/1 | 5.123 | 174 | 0 |
| Full isolation | 24.19.0 | 7/50 | 782.647 | 332 | 0 |
| Cleanup owner | 24.15.0 | 1/13 | 88.935 | 124 | 0 |

Every original full-name set matches the prior qualified reports and strict
validateLaneReport succeeds. The unchanged 2340s wrapper exits 0 in 783.011s.
The prior local full lane was 785.294s; this difference does not establish a
whole-lane speedup. All five outer setup/owning commands and 12 static gates
exit 0. The two fresh private qualification caches are removed. Independent
read-only checks find no container across 33 invocation/session/reaper queries
and no owned live process across 31 fresh exact-tag kernel snapshots.
Telemetry reconstructs 91 records/71 windows/22 periodic records, bound to
the final log invocations; 89 rows match scanned ledger identities and two
lack a scanned match without an inferred ancestry classification. Adversarial
source and evidence review passes. The [dated fix record](../patches/2026-10-12-17.30.md)
binds commands, original inventories, hashes, actual exits, limits and the
still-unchecked owner-push/hosted Intel/Linux gates.

### CI-R7 — object-read admission, terminal callback settlement and sampler identity (2026-10-15)

Owner-pushed `65d86534d2d1bd8f5cc3bf5f5a91b0853494b7fd` is tested by
[PR run 38264874681](https://github.com/maister-dev/maister/actions/runs/38264874681)
and [push run 38264867590](https://github.com/maister-dev/maister/actions/runs/38264867590).
PR merge `6e0ea6b5954e4673347ebdc8ecf972a6b17f4538` has the same tree
`47608a3060ee0169bd41fbdabd92cddeab9a3cd4` as that pushed source. Both runs
retain original web 640/Node and supervisor 111 inventories. Both supervisor
jobs and both Node 24.19 web shards pass in each run. Node 24.15 fails one
different web assertion per run: S2.8 draft preparation
receives an object-content `409 command_in_progress` before its expected
unsupported-adapter decision; pending-permission child death loses the locked
`required_output_incomplete`/`producer_permission_failed` receipt details.
These are separate from the fixed-budget Intel overruns: PR completes 29 cases,
push 43; neither has the outer 7/50 reporter and both slices exit 124. Separate
preflight passes/cleans on both. PR final process sweep is 0 with one remaining
PostgreSQL container reaped; push reaps one process and one container.

The correction follows existing OpenAPI and ADR-177 contracts; it does not
change wire schemas, error enums, main/Brain migrations, product configuration,
runner sizes, job/slice limits or hosting. No new ADR or migration is needed.
Object GET admission is retryable; the same reason on POST prompt admission
must never cause generic command retry. Share the existing content-read budget
of five attempts with 100/200/300/400ms abortable backoff, structured warnings
and the last typed error. Remove only redundant whole-span wrapping so one
GET never receives 25 attempts; preserve exhausted host-span busy verdicts.
Keep integrity, authorization, cancellation and other refusals unchanged.

A closed ACP transport can reject its prompt before the child terminal purges
pending permissions. Terminal completion must await the actual bounded
permission continuations after purge, then classify the settled producer
failure. Preserve initial and post-terminal fence/pressure/output/intentional
shutdown precedence, the existing kill grace and crash-before-prompt-terminal
ordering. A fixed sleep or assumed microtask delay is not causal evidence.

Next's Turbopack build also loads the watchdog in worker threads sharing one
PID/kernel birth. Conflicting cumulative counters are different sampler
streams, not duplicate file copies. Add threadId/isMainThread to identify
streams; retain every existing watcher, fresh proof and 500ms cadence. Do not
sum overlapping/right-censored windows into CPU share or lane savings. Intel's
remaining budget bottleneck is not established by the captured timings.

Failed-run attribution does identify serial production boot as the next
measurement target: PR 40 web startups total 562.225s and push 45 total 527.646s
from kernel birth to `web-listening`; those particular windows do not overlap.
Each full lane also includes one fresh build, 193.631s/252.967s. These costs
are already inside the owning suite durations. P2's 176.093s/175.844s receipt
partition exhausts the required real budgets and cannot be shortened. Both
jobs received the full 2340s slice, so reducing provisioning/preflight restores
no slice allowance. Supervisor health, seed completion, `app.prepare`,
instrumentation stages and first successful `/login` need distinct bounded
timing before changing startup behavior. Existing artifacts justify neither
weaker recovery ordering nor shared cleanup-owned containers, a bundler switch
or a Linux speed claim.

Ownership and executable gates:

- [x] Audit both exact-source hosted runs, original names, preflights, failing
      assertions, incomplete isolation/report/timing and containment evidence.
- [x] Object reader owns `events/session-content.ts`, `prompt-output.ts`, a
      minimal shared content opener and proven duplicate wrapping in
      `prompt-reconciliation.ts`; extend existing S2.8 title with real two-slot
      HTTP saturation, transient recovery, exhausted/cancel paths and unchanged
      multibyte/exact-once/adapter assertions. RED → GREEN → REFACTOR on both
      exact Nodes; no mock, new owning case or leaked response/barrier.
- [x] Producer lifecycle owns `bounded-acp-stream.ts`, `acp-client.ts`,
      `types.ts`, `heartbeat.ts`, `http-api.ts` and existing N1 receipt control.
      Use real pending permission/stdout close/SIGKILL and a held drain barrier;
      require actual failure before the fix, then exact rejection details,
      bounded callback settlement and canonical event order on both Nodes.
      Keep web G0iii-b/G1 assertions and intentional lifecycle controls intact.
- [x] Diagnostic owner changes only watchdog records and existing O-identity;
      real main/worker records must share kernel identity while distinct thread
      identifiers prevent stream conflation. RED → GREEN → REFACTOR on both
      Nodes, unchanged 13/50 names, cadence, proof and fail-closed behavior.
- [x] Freeze final executable sources; run complete affected supervisor
      unit/integration consumers and web A/B 640 plus missing direct prompt-span/
      content consumers on both Nodes, with original-name validation. Run quiet
      independent preflight, full serial isolation 7/50 and minimum-Node cleanup 13;
      require actual exits, strict validateLaneReport, timings and zero leaks.
      Extend resource/telemetry audits with thread-aware stream keys and retain
      ambiguous old records without an invented identity or additive cost.
- [x] Complete docs/contracts, types/MCP build, scoped lint/format, actual
      classified call-site sweeps, source/resource/report audit and adversarial
      review. Root owns canonical analytics/plan/dated fix record and separate
      local phase commits; change no infrastructure or remote state.
- [ ] Owner pushes; verify the exact SHA/merge tree and hosted mandatory jobs,
      complete original reporter, fixed timing budget and zero leaks. Retain
      failed evidence if Intel still overruns; do not claim these correctness
      fixes solve its budget. S5.2/S5.3/S5.4 stay unchecked at 42/45; separate
      Linux qualification/hosting, browser expansion and production users remain
      independent. Revert the focused source phase if it regresses contracts.

CI-R7 final local qualification binds **2393** frozen source,
recipe and dependency files on base `65d86534d2d1bd8f5cc3bf5f5a91b0853494b7fd` to composed code
commit `74599ca46adf5e7e09f55736e3b2d8967381386b`. Every committed blob and tested working byte
matches; the record phase changes only Markdown. On **each exact Node
24.15.0/24.19.0**, the original web 640 across both shards and supervisor 111
pass, plus complete direct web consumers 41, supervisor consumers 32 and
checkpoint/shutdown unit consumers 9. Original full-name inventories match;
strict validation rejects skipped, missing, duplicate and partial collection.

| Quiet local Darwin ARM64 owner | Node | Suites/cases | Lane wall (s) | Cleanup (ms) | Leaks |
| --- | --- | --- | --- | --- | --- |
| preflight-node2419 | 24.19.0 | 1/1 | 5.021 | 169 | 0 |
| isolation-node2419 | 24.19.0 | 7/50 | 777.025 | 278 | 0 |
| cleanup-node2415 | 24.15.0 | 1/13 | 88.146 | 124 | 0 |

The unchanged 2340s full-lane wrapper actually exits 0 in
777.381s measured with
`time.perf_counter`. Consumer wall deltas are functional evidence only.
Both fresh private workflow compile caches are removed. All 15 named static
gates pass. Independent read-only verification finds no qualified container
across 47 invocation/session/reaper queries
and no owned live or unverifiable registered process across
41 fresh invocation snapshots /
293 recorded PID/kernel checks, using the four
original O-identity ledgers retained under macOS temporary directories too.
Two passed ephemeral root-only controls have separate removal-receipt/fresh-
snapshot proof; no registered PID is asserted for them. The initial audit
discovery refusal is retained.
Sampler audit validates 93 records across
73 thread windows; overlapping,
right-censored observations imply no CPU-share or additive speedup.
Source, script and final-evidence adversarial reviews pass. The
[dated fix record](../patches/2026-10-15-16.16.md) preserves
actual RED/GREEN/refactor distinctions, commands, hashes, original inventories,
clock/environment limits, measured costs and rollback/owner-push criteria.
No source changes qualify hosted Intel or Linux by substitution. The owner
push/exact-SHA hosted reporter, timing and zero-leak gate remains open;
S5.2/S5.3/S5.4 stay unchecked at 42/45.

### CI-R8 — production browser build and causal fixture publication (2026-10-16)

The owner pushed `a60dc6ea43fa9e9ce74d1b2b2976c99ca7e9332c`.
[PR run 38752060002](https://github.com/maister-dev/maister/actions/runs/38752060002)
checks merge `43ee3cf813367d88e59c46ba0eef7ea8a8e67b02`, whose tree
`e110d7bff8317c8291692fa9caea5266322b69e2` equals that source.
[Push run 38752051464](https://github.com/maister-dev/maister/actions/runs/38752051464)
checks the same source directly. Actual reporters preserve all 640 web cases
and 111 supervisor cases per Node. PR web/supervisor reports all validate;
push minimum-Node shard 1 has one failed original permission-checkpoint case.
Its JSON parse fails before checkpoint execution: the real resumable adapter
truncates its public journal while the test reads it. Waiting for manager input
acknowledgement does not prove the adapter has published its selected state or
installed its held-turn completion callback.

PR Librarian startup expires its unchanged 180-second readiness gate before
tests begin. Its harness still forces webpack inside that gate, unlike the
package, image and production fixture's default bundler. The matching push
passes all 13 browser cases. Hidden build stdout limits exact failed-phase
attribution; the obsolete bundler selection is source-confirmed.

Both Intel isolation slices still exit 124 without the outer seven-suite,
50-case report. PR provisioning/preflight consume 1000 seconds, leaving 2240
seconds under the existing formula; P4's original held checkpoint response
expires after 30 seconds, before successor creation arrives. Push receives
2340 seconds, passes P4 and completes six owners/47 cases before the remaining
concurrency owner is interrupted. Do not treat containment as zero-leak
qualification: PR reaps one PostgreSQL container; push reaps three processes
and one container. Independent preflights pass.

No public API, error enum, database migration, host SQLite schema, product
configuration, dependency, deployment or infrastructure change is required by
the confirmed fixture defects. Keep all Node/shard/job/slice contracts. Root
owns the canonical test-infrastructure analytics, this plan, dated fix record,
final source/evidence audit and phase commits. Implementation owners below
must preserve other workers' edits and all original owning names.

- [x] Audit both exact-source hosted runs and compare original reporter names;
      retain the failed P4 response window and incomplete isolation evidence.
- [x] Browser owner changes only `e2e/librarian-web-server.mjs` and
      `playwright.librarian.config.ts`: use the production default bundler and
      expose startup stdout. Keep clean/build/boot inside 180 seconds and the
      existing restart protocol. Actual old-build bundler contract RED, then
      full 13-case GREEN with real PostgreSQL/supervisor/browser, original
      names, timings and zero leaks. Local ARM evidence does not qualify Linux.
- [x] Journal owner changes the resumable ACP fixture and its four parent
      journal publishers. Prove the actual public-file truncation with a
      controlled real-child pause before replacing it with same-directory
      atomic publication. Require exact child identity, guaranteed cleanup,
      complete old/current JSON visibility, selected/held readiness before
      parent mutation, and explicit publication failures. Keep existing case
      titles; run focused RED/GREEN on both exact Nodes.
- [x] Re-derive P4's causal successor barrier before editing. A Running-row
      poll alone is insufficient because later legitimate successor writes
      would contaminate the stale-write audit. Any correction must freeze
      those writes explicitly, retain a committed successor assignment and
      Running attempt with no incarnation, and deliver the original ACK to its
      original handler before the unchanged deadline. Preserve 409, snapshot,
      zero stale writes and successor exactly-once completion; prove the
      ordering with a real delayed-successor RED control.
      The selected frontier is both epoch-2 capability reservations: protected
      metadata is committed and publication holds no database transaction.
      Focused GREEN passes on both Nodes; complete owning suites remain below.
- [x] Audit the four artificial 60-second terminal delays in worker boot/death
      controls. Replace only scheduling assumptions that can be expressed as
      witnessed real-ACP hold/release barriers, with exact session/process
      identity and completed web death before release. Preserve every original
      owner, terminal evidence, single application, restart and shutdown
      assertion. Do not shorten production deadlines, P2 retry exhaustion or
      worker lease evidence. Require causal RED/GREEN and full owner suites.
- [x] Resolve the independently verified E shutdown gap exposed by final
      qualification. The observed clean exit leaves E's fresh command
      `applying`; direct `applyPromptOwner` callers can run outside worker
      slots. First retain exact command/run/claim-token and real output-barrier
      evidence in the existing E case, and classify the actual process code
      and shutdown record. Prove a causal direct-waiter RED using a temporary
      isolated worker-disable control, restoring exact source bytes and a
      fresh build afterward. Then track direct claim-to-cleanup lifetimes in
      `web/lib/execution-host/prompt-owner-application.ts` with a shared process
      symbol, refuse admission during quiesce, combine caller/process abort,
      and join active work immediately in `web/instrumentation-node.ts`'s
      existing saved shutdown result. Preserve token predicates, confirmed
      cancellation as deferred work, release failures and the 5/25-second
      HTTP/whole-process deadlines. The canonical prompt-lifecycle contract
      describes this boundary separately from qualification. No API or database
      migration is required. Run controlled E on both Nodes, its complete concurrency/boot
      owners and all classified direct application consumers before the
      restored serial lane. No production edit before the causal RED.
- [x] Resolve the final local macOS cleanup inspection race without widening
      signal authority. V3 completes all 50 assertions but its isolation owner
      fails teardown when a same-group process returns `EINVAL` for both
      environment reads; containment reaps two processes and one database.
      The child executable and eventual lifecycle are unproven. Retry only
      `EINVAL` read/parse failures at most three times with 1 ms separation;
      retain exact PID/UID/start checks before publishing or excluding helpers.
      A successful ownership read followed by a failed inspector-tag read
      must also remain uninspectable; add that asymmetric causal RED before
      correcting the current positive ownership row.
      Extend existing O-identity with real-PID transient and persistent error
      controls before implementation; preserve foreign/unreadable refusal.
      No new case names, Linux behavior or timeout changes. Qualify fresh
      complete Darwin owners at both Nodes, separate preflight and browser.
- [x] After executable sources freeze, run complete affected fixture consumers
      on both exact Nodes, independent preflight and complete serial isolation
      with strict `validateLaneReport`, original name sets, measured fixed
      budget and zero leaks. Run docs/contracts, package types/MCP build,
      scoped syntax/lint/format and diff checks; complete independent
      adversarial source/evidence review before local phase commits.
- [ ] Owner pushes the reviewed commits; verify that exact pushed SHA/merge
      tree and all hosted reports, timing and cleanup artifacts. Retain failure
      evidence and keep qualification open if Intel still exceeds the budget.
      Revert the affected fixture phase if it weakens a control or introduces
      a regression. No push/rerun/hosting migration is part of local work;
      S5.2/S5.3/S5.4 remain unchecked at 42/45.

Local CI-R8 qualification is complete on Darwin ARM64. V3 retains the actual
63-suite/759-case web and six-suite/52-case supervisor executions on each exact
Node, plus the six-case instrumentation and clock owners. V4 changes exactly
the three native-inspection/control files; every other frozen executable byte
matches V3. Fresh V4 serial isolation passes all seven suites/50 cases on
Node 24.15.0/24.19.0 in 559.151/546.219 seconds, with separate preflights,
clean initial sweeps and removed private compile caches. The original 13-case
browser owner passes with 22.577-second clean-to-HTTP readiness; all 16 static
checks pass. The read-only audit verifies original name sets, source hashes,
reports, timings and current resource absence. Its versioned browser collector
repair retains the original collection error and successful test execution
separately; it does not rerun the browser. The
[dated fix record](../patches/2026-10-16-14.17.md) binds the receipts and failed
attempts. These local results leave the owner-push and hosted Intel gates open.

### CI-R9 — two macOS jobs and explicit object fault frontiers (2026-10-20)

The owner authorizes this amendment after run `39290649010`. Its PR head is
`ad6e88c492c74914d10c85650acc503a9307a4d6`; the executed merge
`1a256af174a1e31ff0bdf8c466028b8b9459c644` has the same source tree.
The Intel lane exits 124 after four completed suites/35 cases, with B4 and D3
failed. Separate preflight passes. Final containment reaps three processes and
one container; no complete outer reporter exists. Other mandatory jobs pass.

B4's launch loses its PostgreSQL connection before any upload reaches the
proxy. Suppressed launch rejection conceals the HTTP failure behind an unreached
barrier. Retained evidence does not identify what closed that connection; do not
claim a database/network fix without a reproduction. D3 holds all three upload
ACKs until their existing ten-second wire deadlines expire, then incorrectly
expects POST 202. The reducer already permits only event evidence to promote
pending to available: ACK metadata can complete before the projection fault.

- [x] **CI-R9a — Object controls and failure provenance.** Root owns the existing
      B4/D3 suites and only directly needed fixture diagnostics. Add a causal
      upload-command frontier while the exact seal event is held; require
      successful HTTP delivery, manager pending/no source event and positive
      host seal metadata before releasing projection. Preserve B4's scoped
      catalogue block/readback and all D3 backend/cursor rollback, successor
      identity, exactly-once and final HTTP assertions. Surface launch rejection
      immediately instead of hiding it behind a barrier timeout. RED uses real
      exhausted ACK attempts against the old D3 ordering and an ACK-promotion
      mutation against the new pending-state control; restore and run both full
      owning suites. Do not change production HTTP/retry/transaction deadlines.
- [x] **CI-R9b — Partition and fail-closed evidence.** CI owner:
      `scripts/run-stage-ab-tests.mjs`, its test, workflow/control tests and the
      minimal outer-receipt/aggregate entrypoint. Explicit part 1 contains
      cleanup13 + partitions6; part 2 contains death6 + isolation4 + boot8 +
      concurrency3 + dispatch10, preserving canonical order. Each separate
      `macos-15-intel` VM uses Node24.19.0, serial Vitest, independent real
      preflight/build/Colima/cache and unique artifacts. Keep 60-minute job and
      `min(2340, 3240-elapsed)` suite budget and all existing step deadlines.
      Matrix fail-fast is disabled. Preserve full local isolation invocation.
      Receipts identify the actual outer reports after validated cleanup;
      nested intentional failure reports cannot substitute. Preserve failed
      direct outer reports in a separate upload before runtime teardown. A mandatory
      combined gate rejects missing/duplicate parts, different source/run or
      platform, tampered reports, missing preflight, skips/failures/leaks, or
      anything other than the original seven-suite/50-case name set. RED then
      GREEN actual workflow/CLI/receipt corruption controls.
- [x] **CI-R9c — Qualification and contracts.** Root owns canonical analytics,
      this plan and S5.2 contract reconciliation. Run both parts serially on
      local ARM64 with separate preflight on each exact Node version; validate
      disjoint union, exact original names, cleanup and timing from final
      sources. Run required docs/contracts/types/build and focused lint checks,
      then adversarial review. API/event payloads, PostgreSQL/SQLite schema,
      migrations, deployed configuration and production isolation are unchanged;
      no migration or ADR allocation is needed. Record uncertainties and
      measured durations; local evidence is not hosted qualification.
- [x] **CI-R9d — Owner-push/hosted checkpoint.** After phase commits the owner
      pushes. Read-only verification must bind the exact pushed SHA (and PR
      merge tree), both macOS jobs, both separate preflights, combined 50 cases,
      four web shards, both supervisor jobs and remaining mandatory artifacts.
      Each macOS job must fit its unchanged budget and have zero leaks. Until
      then S5.2/S5.3/S5.4 remain open at 42/45. If either job still fails, preserve
      its receipts and diagnose that failure; no case removal, timeout increase
      or Linux substitution. A local revert of the CI-only phase is available
      if the split recipe fails; the owner controls publication.

The split is a budget hypothesis, not a performance claim: the four measured
Intel owners account for 1199.118s in part 1 and 919.787s in part 2; three part 2
owners were not completed in that run. Each VM also pays cold setup/build cost.
Browser lifecycle expansion and separate-user deployment remain separate.

Local qualification passes on the frozen combined candidate: both exact Nodes
run all original 50 cases as 19/31 parts, each with its own successful preflight,
fresh production build and clean terminal sweep. Independent resource checks,
original full-name comparison and all 17 static/runtime/contract checks pass.
The hosted verifier correctly rejects local ARM64 receipts. The
[dated fix record](../patches/2026-10-20-15.06.md) binds source hashes, real
RED/falsification controls, actual reporters, timings, review corrections and
the unproved original B4 socket cause. Phase commits organize the same tested
combined source; they are not separate complete-lane qualification runs.
CI-R9d is closed by the independently verified hosted checkpoint below. Earlier local receipts retain their original scope.

### CI-R9d / T15 — accepted macOS hosted checkpoint (2026-10-20)

Read-only verification closes CI-R9d, S5.2 closeout T03/T13/T15 and R9
T5/T13b/T13. S5.2 is complete: **43/45** parent tasks; S5.3, S5.4 and C11
remain open. No push, dispatch, rerun, production change or Linux qualification
was performed for this audit.

- Owner push: [run 39423192590](https://github.com/maister-dev/maister/actions/runs/39423192590),
  exact source `b8e72adfe4e7e6088b845a65adb0c91310515184`.
  PR validation: [run 39423199759](https://github.com/maister-dev/maister/actions/runs/39423199759),
  executed merge `a4ee231d33d8f20e99457931f1757aa2a89667ac`; GitHub commit metadata
  and checkout log bind it to the same tree
  `255d6b5d7d1bcd6f007ceb013fefbbe1012742ee` as the pushed source.
  The later working baseline `8237993223fa5a7c3aafe9db42d9438612990938` is a
  different candidate; these receipts are not relabeled as its qualification.
- Both downloaded push and PR part pairs pass `aggregateIsolationEvidence`;
  recomputed aggregates equal their published `combined.json` exactly.
  Each preserves all original seven suite/name sets, 19 + 31 cases, two
  independent successful preflights, four distinct invocation identities,
  serial concurrency, Intel macOS 15 image `20260824.0482.1`, Node 24.19.0,
  matching SHA/run/report hashes and clean cleanup with zero errors/leaks.
- Push part durations: **835.805 / 1424.798 seconds**, each within 2340 seconds
  (headroom **1504.195 / 915.202 seconds**). Preflights: 111.462 / 178.666
  seconds within 600. Whole jobs: **1305 / 2155 seconds**, leaving
  **2295 / 1445 seconds** below the unchanged 3600-second job limit.
  Runtime ready: 328 / 526 seconds; preflight complete: 442 / 709; suite
  start: 442 / 710; isolation complete: 1278 / 2135; cleanup complete:
  1290 / 2142. Both report uploads and runtime cleanup exit statuses pass.
  PR slices independently pass in 1100.561 / 996.792 seconds.
- Push artifacts: part reports **12265427685 / 12265814410**, diagnostics
  **12266765206 / 12265684966**, combined **12266772276**. Downloaded original
  reports/diagnostics, API job metadata and artifact digests are retained under
  `/private/tmp/maister-ci-close-39423192590` and
  `/private/tmp/maister-ci-close-39423199759`; metadata/audit script use the
  sibling `maister-ci-close-*` paths. Nested intentional failure reports are
  not substituted for the outer accepted reports.
- All four web shards independently pass `validateLaneReport`: 23 files / 332
  cases and 23 files / 308 cases on each exact Node 24.15.0 and 24.19.0.
  Both supervisor reports pass: 10 files / 111 cases per Node. Artifacts:
  web **12265808171 / 12266876764 / 12266306676 / 12265724480**;
  supervisor **12264468144 / 12265335583**. All mandatory runtime, static,
  browser and production-image jobs succeed. The optional label-gated broad
  integration job is skipped by existing policy and supplies no evidence.

The existing parent acceptance rows map P1–P4/B4, D1–D4, I1–I4, cleanup,
boot/concurrency and scratch dispatch to these exact outer reporters. Earlier
web-lane ADR-177 supervisor-restart evidence and S4.1's five named fake-host
suites retain their lane/source identity. This closes the non-browser S5.2
contract; Linux55, browser lifecycle and separate-user deployment remain
separate acceptance work. One accepted attempt does not prove a flake rate.

## Commit Plan

Implementation commits preserve focused boundaries; qualification binds each
recorded source candidate. The current owner instruction authorizes local phase commits only; no push,
shared-branch merge or hosted dispatch is permitted. Historical handoff
publication is not a current instruction.

For CI-R8, phase commits separate the fixes and their focused RED/GREEN controls.
Complete regression receipts qualify their recorded source candidates and the
final combined implementation; they do not claim every intermediate phase
commit independently passed the complete lane. Retained V3 consumer executions
and fresh V4 native/serial/browser executions keep distinct source identities.

The second hosted-audit correction uses disjoint local phase groups:

| Group | Owned files / acceptance | Commit |
|---|---|---|
| CI-R2a | Native inspector/fixture, invocation reader, watchdog and existing O-identity owner; real RED/GREEN/refactor, exact authority and full Darwin50 | `fix(test): inspect selected processes and retain watchdog causes` |
| CI-R2b | Docker probe, full test migration adapter, shared pg helper, owning pg controls/fixtures;7-case real owner, complete affected consumers on both Nodes, browser13 | `fix(test): bound Docker discovery and batch test migrations` |
| CI-R2c | Canonical test-infrastructure contract, owning plan/checkpoint and fix patch; spec/static/source/case audit and owner-push gate remain truthful | `docs(test): record CI correction contracts and qualification` |
| CI-R3a | Invocation group signaling, kernel retirement probe and real native controls under O-identity; full Darwin50/preflight and minimum-Node owning controls | `fix(test): verify Darwin group retirement after signal races` |
| CI-R3b | Existing Intel runtime setup and executable workflow controls; private homes, exact socket, explicit VM resolver and platform-labelled evidence | `fix(ci): own Colima state and declare its VM resolver` |
| CI-R3c | Canonical analytics contract, exact-source failed audit and corrective receipts; fixed-budget/LINUX/owner-push gates remain truthful | `docs(test): record remaining hosted isolation failures` |
| CI-R4a | Shared PostgreSQL storage/migration adapter, existing owner controls and canonical setup contract; full local qualification | `perf(test): bound PostgreSQL storage and batch lineage transport` |
| CI-R4b | Owning plan and timestamped fix patch; exact-source receipts, remaining hosted qualification and owner-push gate | `docs(test): record macOS isolation setup qualification` |
| CI-R5a | Private compile-cache setup, actual workflow wiring/control and canonical lifetime contract; full local owner qualification | `perf(ci): reuse verified Node compilation in macOS isolation` |
| CI-R5b | Owning plan and timestamped fix patch; measured disabled/cold/warm evidence, exact-source reporters and remaining hosted gate | `docs(test): record measured macOS compile-cache qualification` |
| CI-R6a | Fresh selected-list native reader, existing watchdog/API/control and canonical inspection contract; exact identity and full local owning qualification | `perf(test): batch fresh watchdog identity reads` |
| CI-R6b | Owning plan and dated fix record; exact-source measured reader/hosted failure receipts, completed local qualification and remaining hosted gate | `docs(test): record watchdog inspection qualification` |
| CI-R7a | Shared object-content GET retry policy and existing S2.8 controls; both-Node affected consumer qualification, canonical clarification recorded with R7d | `fix(execution-host): retry bounded object content admission` |
| CI-R7b | Bounded permission callback settlement and terminal failure precedence, existing N1 control and affected lifecycle consumers | `fix(supervisor): settle permission failures before prompt rejection` |
| CI-R7c | Thread-aware watchdog timing provenance and existing real O-identity control, full Darwin owning qualification | `fix(test): identify watchdog timing streams by thread` |
| CI-R7d | Exact-source failed audit, canonical analytics, plan/dated fix receipts and truthful owner-push/hosted gates | `docs(test): record CI race correction qualification` |
| CI-R8a | Librarian default production bundler and visible startup output; original browser13 and180-second readiness contract | `fix(test): align Librarian browser production builds` |
| CI-R8b | Atomic resumable-adapter/parent journal publication, real stopped-publisher control and causal held readiness; complete fixture consumers both Nodes | `fix(test): publish resumable adapter journals atomically` |
| CI-R8c | P4 transaction-free capability publication barrier; real original-ordering RED and unchanged stale-handler/successor acceptance | `fix(test): audit stale checkpoint ACK before successor setup` |
| CI-R8d | Real post-output terminal holds in four death windows, exact identity/cleanup and worker falsification; complete serial owners | `fix(test): release worker terminals after verified web death` |
| CI-R8d2 | Direct application admission/abort/join at shutdown, existing E's exact actor/outcome control and canonical lifecycle contract; both-Node causal RED/GREEN and complete consumers | `fix(execution-host): drain direct prompt applications on shutdown` |
| CI-R8d3 | Bounded native EINVAL retry, final kernel identity guard and existing O-identity real-process controls; persistent denial/foreign refusal and full Darwin owning qualification | `fix(test): retry transient Darwin process inspection` |
| CI-R8e | Canonical analytics, owning plans and dated exact-source evidence; local checks and truthful owner-push/hosted gates | `docs(test): record causal fixture qualification` |
| CI-R9a | Existing B4/D3 fault windows, shared PostgreSQL diagnostics and guaranteed cleanup in all three consumers; real RED/GREEN and complete original owners | `fix(test): separate upload and projection fault windows` |
| CI-R9b | Explicit 19/31 macOS parts, actual outer receipts, failed-report preservation and strict combined gate; unchanged cases, seriality and deadlines | `ci: split macOS isolation into two serial jobs` |
| CI-R9c | Canonical acceptance contract, owning plans and exact-source local receipts; hosted checkpoint remains open | `docs(test): record isolation split qualification` |


| Checkpoint | Tasks / required green gate | Suggested conventional commit |
|---|---|---|
| C1 | A1–A3, complete docs-first contracts/allocation/environment specs | `docs(test): specify Linux isolation and ownership contracts` |
| C2 | A4–A7, real driver/launcher/probes/portability and phase regression green | `feat(test): add Linux namespace isolation driver` |
| C3 | A8–A11, mandatory controls/manifests/falsification and local qualification | `test(isolation): qualify Linux boundaries and process cleanup` |
| C4a | A12–A13, driver audit and explicit retain/adopt decision; prospective amendment only for adoption | `docs(ci): record qualified isolation hosting decision` |
| C4b (adoption only) | A14, final source Linux55/both Nodes + Darwin50/preflight and actual recipe/budget/artifacts/finalizer gates green | `ci(isolation): host the qualified serial lane on Linux` |
| C5 | A15 final driver/hosting disposition; exact owner-pushed Linux evidence mandatory only for adoption | `docs(test): record isolation qualification disposition` |

For adoption, C4a precedes C4b so CI cannot outrun its normative amendment. Splitting that checkpoint is required by the qualification boundary even though most checkpoints group3–4 tasks. If a commit changes only evidence text, preserve the actual tested source SHA and do not relabel it as tested at the later docs-only SHA. Any further code/recipe change creates a new candidate and returns to the relevant RED/local/owner-push gate.

## Failure handling, rollback and remaining uncertainties

| Failure | Required response / retry or rollback |
|---|---|
| Namespace/Bubblewrap/AppArmor capability unavailable | `IsolationUnavailableError` with platform/binary/required capability and safe cause; no production web launched. Complete independent specs, obtain the smallest scoped prerequisite or choose a future separately planned mechanism. No unisolated/root/privileged fallback. |
| Policy overlap, proc/FD/private access or privilege escape | Fail kernel boundary gate, contain only verified resources, keep RED evidence. Fix source/policy with adversarial review and restore/falsify again; no hosting amendment/migration while unqualified. |
| Process identity/inspection mismatch or mixed group | Refuse unsafe signal/delete, preserve anomaly as lane failure, contain only separately verified children. Never kill foreign siblings or discard the leak evidence. |
| Docker client/daemon/container/migration failure | Record exact phase and original cause; bounded retry only for an identified transient external operation with WARN and final original error. Do not retry an unknown delivery/capability error or expand probe budgets without evidence/spec work. |
| Linux full lane or hosted job exceeds fixed budget | Record all durations and missing suites/cases, leave Linux qualification/hosting open without erasing accepted macOS S5.2 evidence; investigate measured setup/build/test bottleneck with correctness-preserving RED-first changes. No sharding isolation, fewer cases, timeout/larger-runner change or assumption that another Linux architecture is faster. |
| CI recipe cannot qualify | Revert only Linux CI recipe to preceding macOS recipe in a focused local corrective commit, preserving both drivers/qualified source/tests and truthful failed hosting status. Owner must push rollback. Prospectively amend canonical hosting state to reflect rollback; preserve failed artifacts. The accepted CI-R9d macOS checkpoint remains attributed to its own source; a changed rollback candidate needs fresh applicable verification. No production-data rollback/migration involved. |
| Complete candidate is superseded/rebased or remote SHA differs | Do not borrow artifacts; re-freeze/requalify changed source and ask owner to push the concrete replacement. Metadata-only changes retain explicit original tested identities. |

Native environment, namespace policy, lifecycle and both-Node portability are qualified by A3–A11 evidence above. Hosted Linux capability/image, provisioning, finalization and total-budget headroom remain unqualified. They become required only for a future adoption decision; accepted macOS hosting is retained.

Separate S5.3 dependencies: browser lifecycle can reuse a qualified `RealWeb`/supervisor fixture but needs its own production Playwright configuration/scenarios/runtime/image evidence; separate-user deployment needs credential/account/group/materialization/mount contracts beyond this same-host-UID test driver. S5.4 audits final API/data/deployment/lineage/spec consistency after both are delivered. This plan does not silently include or close them.

## Acceptance and finished-plan audit

| Gate | Measurable acceptance / enforcing task |
|---|---|
| SDD completeness | Normative R5/R5a analytics and LNX-01–12 traceability/refusal/cancellation/lifecycle/escape/environment/contracts complete before code; actual ADR allocation, docs/spec gates green (A1–A3). |
| Kernel boundary | Existing private sentinel and live SQLite denied through same policy as production web; real supervisor retains access; RO/RW, descendants and escapes observed; enforcement removal makes I1 fail (A4/A7/A8/A11). |
| Process safety | Host identities and exact tags retained; TERM drain and exit preserved; runner/worker/KILL cleanup includes detached descendants; foreign sibling untouched; leaks fail before containment (A5/A6/A9/A11). |
| No fallback / portability | Real capability failure refuses; Linux O-identity is real proc denial; original Darwin driver/preflight50 controls green and labeled by platform (A6/A10/A11). |
| Complete local qualification | Local Ubuntu 24.04 amd64 Linux55+separate1 at exact Node24.15.0/24.19.0; reports pass validator and exact title reconciliation, no skips/runtime errors/leaks, full phase suites GREEN (A10–A12). |
| Gated CI change | A13 explicitly chooses retention or adoption after G-LINUX; only adoption requires the prospective contract amendment and Linux recipe; push Node/shard/serial/job-budget requirements unchanged; final runner/recipe edit is followed by complete final-source local requalification and real shell failure controls (A13/A14). |
| Hosting decision | Retain accepted macOS with explicit local-only Linux qualification, or adopt only after exact owner-pushed Linux SHA, complete artifacts/inventory, all mandatory jobs, measured headroom and zero leaks; failures stay open (A13–A15). |
| Scope/impact truth | No product API/DB/DSL migration, no invented allocation, no production-user/browser expansion; only evidence-supported status changes (A12/A15). |

Audit performed at planning and this refinement: checked source against the supplied SHA; traced real probe registration/output/timeout gaps, generic restart retries, numeric-only exit outcomes, immediate cross-platform test discovery, worker-versus-runner cleanup ownership and post-A11 candidate drift; assigned each a primary control and phase gate; traced all requested contracts to owners/tasks and canonical files; identified both private-proc watchdog incompatibility and Darwin-only O-identity; separated host/namespace identity and local/hosted proof; retained original50 and separate preflight; limited new coverage to five distinct Linux controls; placed qualification before hosting amendment/CI; preserved budget, owner push and open completion markers. Before presenting implementation as complete, re-audit the actual diff and evidence against every row above. A checklist mark, source link or successful cleanup alone is not acceptance evidence.
