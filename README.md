# oRPC Benchmarks

Compares the performance of [oRPC](https://orpc.unnoq.com) with similar libraries.

Benchmarks in the same group share one workload and are compared with each other; benchmarks in different groups are not.

| Group       | Benchmarks                                                                                   | What it measures                                              |
| ----------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `rpc`       | [rpc-orpc](./benchmarks/rpc-orpc), [rpc-trpc](./benchmarks/rpc-trpc)                         | RPC runtime throughput over HTTP                              |
| `ws`        | [ws-orpc](./benchmarks/ws-orpc), [ws-trpc](./benchmarks/ws-trpc)                             | RPC runtime throughput over WebSocket                         |
| `openapi`   | [openapi-orpc](./benchmarks/openapi-orpc), [openapi-hono](./benchmarks/openapi-hono)         | OpenAPI (RESTful) runtime throughput over HTTP                |
| `typecheck` | [typecheck-orpc](./benchmarks/typecheck-orpc), [typecheck-trpc](./benchmarks/typecheck-trpc) | TypeScript type-checking time on a large, fully typed project |

## How to run

```bash
pnpm install
pnpm bench                  # every group, about 30 minutes
pnpm bench rpc ws           # selected groups
pnpm bench rpc --rounds 3   # quicker, noisier
pnpm bench:profile rpc-orpc # Clinic.js Doctor report for a benchmark or group
```

A complete group run saves `results/<group>.json` and updates every README; `pnpm bench:report` rebuilds the READMEs without measuring. A single benchmark (`pnpm bench rpc-orpc`, or `pnpm bench` in its folder) is printed, not saved: only libraries measured in the same session are compared. `pnpm bench --help` lists every option.

Use an idle Linux machine (WSL works) for stable numbers: pinning needs `taskset`, and the server CPU and memory columns come from `/proc`. On macOS the benchmarks run unpinned, noisier and without those columns.

## Methodology

The runner ([scripts/bench.ts](./scripts/bench.ts)):

- **Pinned toolchain.** `devEngines` in [package.json](./package.json) pins pnpm and Node.js (downloaded if needed), so every run uses the same V8.
- **Isolated CPUs.** On Linux, `taskset` gives the server one dedicated CPU and the load generator up to two others, leaving the first CPU to the OS when there are at least 3; results are single-core server throughput. With SMT, the server's sibling thread stays idle and the load generator uses other physical cores; if it has to share the server's core, the runner warns and saves the warning with the results. CPU steal time is recorded to expose noisy VM neighbours.
- **Fresh process, warm-up, measurement.** Each round starts a new server, warms it up under full load, then measures for 10 s without stopping the load. oRPC and Hono reach full speed within about 3 s and tRPC within 6–7 s, so the warm-up is 10 s; the `ws` group uses 30 s, since with 10 s tRPC's WebSocket server still sped up a few percent while measured. The runner warns when throughput rose from the first to the second half of the window (Drift in each benchmark's per-round table) by more than 3% at the median, in at least 3 of 4 rounds.
- **Interleaved rounds.** 10 rounds per server benchmark and 30 per type-check (short rounds that vary by about 10%), in alternating order (A B, B A, …) so machine drift affects every library alike. Results are medians with the min – max range; overlapping ranges are marked "within noise".
- **Real client payloads.** For `rpc` and `ws`, each run first captures the payload from the library's official client (`scripts/client.ts` in each benchmark); that call also checks the end-to-end result, revived `Date`s included. `ws` replays the captured frames over plain WebSocket connections rather than through the clients: tRPC's client waits a timer tick (at least 1 ms) before sending each batch, which left its server mostly idle. `openapi` sends the same REST request to both libraries.
- **Strict checks.** Every request must be answered and every response is checked (status, framing, content); a run with any invalid response, unanswered request or connection error fails instead of being reported.
- **Precise latency.** Each connection keeps one request in flight (a closed loop, like autocannon), timed with sub-microsecond resolution instead of autocannon's whole milliseconds.
- **Server cost.** CPU time per request and RSS are read from `/proc`, without instrumenting the server. The runner warns when the server is not saturated or the load generator nears its own limit.
- **Separate profiling.** [Clinic.js Doctor](https://clinicjs.org/doctor/) reports come from `pnpm bench:profile` under the same load; measured runs have no profiler attached.
- **Type-checking.** Both generated projects declare inputs with the same vendored [Standard Schema](https://github.com/standard-schema/standard-schema) interface ([schema.ts](./benchmarks/typecheck-orpc/src/schema.ts), copied from `@standard-schema/spec` as Zod and ArkType do): neither library gets its own declaration, which TypeScript would match faster, and no schema library's types dilute the result. A guard file ([checks.ts](./benchmarks/typecheck-orpc/src/checks.ts)) must produce type errors, so inferring `any` fails the check. `tsc --singleThreaded` runs on the server's CPU: TypeScript 7's default 4 parallel checkers each rebuild the shared types, so time, counts and memory would depend on that setting. An untimed first run warms the file cache. Times come from `--extendedDiagnostics`; type and instantiation counts are deterministic and comparable across machines.

## Latest results

Produced with `pnpm bench` (default settings) on a dedicated 4-vCPU cloud VM, with every other process, the unbound kernel workqueues and movable IRQs moved to CPU 0, so CPUs 1–3 ran only the benchmark:

<details>
<summary>CPU isolation commands (optional, Linux, as root)</summary>

```bash
# Move every process to CPU 0 (per-CPU kernel threads refuse; that is fine).
for pid in $(ps -eo pid=); do taskset -a -p -c 0 "$pid" > /dev/null 2>&1; done
# Unbound kernel work and IRQs too (irqbalance would move the IRQs back).
echo 1 > /sys/devices/virtual/workqueue/cpumask
systemctl stop irqbalance 2> /dev/null
for irq in /proc/irq/[0-9]*; do echo 1 > "$irq/smp_affinity" 2> /dev/null; done
# This shell is now on CPU 0 as well: give the run all CPUs back.
taskset -c 0-3 pnpm bench
```

To undo, reboot, or set the masks back to all CPUs (`taskset -a -p -c 0-3 <pid>`, `echo f > ...`) and restart irqbalance if it was running.

</details>

<!-- results:start -->

### `rpc` — RPC over HTTP

Workload: `GET nested.procedure_1("hello world")` exactly as the official client sends it; the response carries a `Date`, so the RPC serializer runs on every request.

| Library                       | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](./benchmarks/rpc-orpc) | 2.0.0-beta.50 | **24,750 req/s** | fastest      |   22,277 – 28,119 |     0.38 ms |     0.93 ms |          39.7 µs |   86 MiB |
| [tRPC](./benchmarks/rpc-trpc) | 11.28.0       |  **6,627 req/s** | 3.73× slower |     4,714 – 7,857 |     1.12 ms |     6.86 ms |         149.9 µs |  205 MiB |

<sub>2026-11-11 · Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

### `ws` — RPC over WebSocket

Workload: `nested.procedure_1("hello world")` frames exactly as the official client sends them, one in flight per connection.

| Library                      | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](./benchmarks/ws-orpc) | 2.0.0-beta.50 | **25,056 req/s** | fastest      |   22,879 – 29,053 |     0.37 ms |     0.95 ms |          39.6 µs |  112 MiB |
| [tRPC](./benchmarks/ws-trpc) | 11.28.0       | **18,110 req/s** | 1.38× slower |   16,297 – 21,954 |     0.53 ms |     1.26 ms |          54.5 µs |   81 MiB |

<sub>2026-11-11 · Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- results:end -->
