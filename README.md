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

Use an idle Linux machine (WSL works) for stable numbers: pinning needs `taskset`, and the server CPU and memory columns come from `/proc`. On macOS the benchmarks run unpinned and noisier, and those columns show n/a.

## Methodology

The runner ([scripts/bench.ts](./scripts/bench.ts)):

- **Pinned toolchain.** `devEngines` in [package.json](./package.json) pins pnpm and Node.js (downloaded if needed) and the runner refuses any other Node.js, so every run uses the same V8.
- **Isolated CPUs.** On Linux, `taskset` gives the server one dedicated CPU and the load generator up to two others, leaving the first CPU to the OS when there are at least 3; results are single-core server throughput. With SMT, the server's sibling thread stays idle and the load generator uses other physical cores; if it has to share the server's core, the runner warns and saves the warning with the results. CPU steal time is recorded, but a busy host can slow the server without showing any.
- **Fresh process, warm-up, measurement.** Each round starts a new server, warms it up under full load, then measures for 10 s without stopping the load. Over HTTP, oRPC and Hono reach full speed within about 3 s, so `openapi` warms up for 10 s; tRPC can keep speeding up past 10 s, so `rpc` and `ws` warm up for 30 s. The runner warns when throughput rose from the first to the second half of the window (Drift in each benchmark's per-round table) by more than 3% at the median, in at least 3 of 4 rounds.
- **Interleaved rounds.** 10 rounds per server benchmark and 30 per type-check (short rounds that vary by about 10%), in alternating order (A B, B A, …) so machine drift affects every library alike. Results are medians with the min – max range; overlapping ranges are marked "within noise".
- **Real client payloads.** For `rpc` and `ws`, each run first captures the payload from the library's official client (`scripts/client.ts` in each benchmark); that call also checks the end-to-end result, revived `Date`s included. `ws` replays the captured frames over plain WebSocket connections rather than through the clients: tRPC's client waits a timer tick (at least 1 ms) before sending each batch, which left its server mostly idle. `openapi` sends the same REST request to both libraries.
- **Strict checks.** Every request must be answered and every response is checked (status, framing, content); a run with any invalid response, unanswered request or connection error fails instead of being reported.
- **Precise latency.** Each connection keeps one request in flight (a closed loop, like autocannon), timed with sub-microsecond resolution instead of autocannon's whole milliseconds.
- **Server cost.** CPU time per request and RSS are read from `/proc`, without instrumenting the server. The runner warns when the server is not saturated or the load generator nears its own limit.
- **Separate profiling.** [Clinic.js Doctor](https://clinicjs.org/doctor/) reports come from `pnpm bench:profile` under the same load; measured runs have no profiler attached.
- **Type-checking.** Both generated projects declare inputs with the same vendored [Standard Schema](https://github.com/standard-schema/standard-schema) interface ([schema.ts](./benchmarks/typecheck-orpc/src/schema.ts), copied from `@standard-schema/spec` as Zod and ArkType do): neither library gets its own declaration, which TypeScript would match faster, and no schema library's types dilute the result. A guard file ([checks.ts](./benchmarks/typecheck-orpc/src/checks.ts)) must produce type errors, so inferring `any` fails the check. `tsc --singleThreaded` runs on the server's CPU: TypeScript 7's default 4 parallel checkers each rebuild the shared types, so time, counts and memory would depend on that setting. An untimed first run warms the file cache. Times come from `--extendedDiagnostics`; type and instantiation counts are deterministic and comparable across machines.

## Latest results

Produced with `pnpm bench` and `pnpm bench:profile` (default settings) on a 4-vCPU cloud VM, with every other process, the unbound kernel workqueues and movable IRQs moved to CPU 0. Over that day, throughput on this VM varied by up to 37% at about 1% steal, and the `rpc` ratio ranged from 3.6× to 4.4×: only compare results from the same run.

<details>
<summary>CPU isolation commands (optional, Linux; all but the last line as root)</summary>

```bash
# Move every process to CPU 0 (per-CPU kernel threads refuse; that is fine).
for pid in $(ps -eo pid=); do taskset -a -p -c 0 "$pid" > /dev/null 2>&1; done
# Unbound kernel work and IRQs too (irqbalance would move the IRQs back).
echo 1 > /sys/devices/virtual/workqueue/cpumask
systemctl stop irqbalance 2> /dev/null
for irq in /proc/irq/[0-9]*; do echo 1 > "$irq/smp_affinity" 2> /dev/null; done
# Every shell is now on CPU 0. As your usual user, give the run all CPUs back:
taskset -c 0-3 pnpm bench
```

To undo, reboot, or set the masks back to all CPUs (`taskset -a -p -c 0-3 <pid>`, `echo f > ...`) and restart irqbalance if it was running.

</details>

<!-- results:start -->

### `rpc` — RPC over HTTP

Workload: `GET nested.procedure_1("hello world")` as encoded by the official client; the response carries a `Date`, so the RPC serializer runs on every request.

| Library                       | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](./benchmarks/rpc-orpc) | 2.0.0-beta.50 | **25,745 req/s** | fastest      |   23,942 – 28,298 |     0.35 ms |     0.90 ms |          38.4 µs |   87 MiB |
| [tRPC](./benchmarks/rpc-trpc) | 11.28.0       |  **6,153 req/s** | 4.18× slower |     5,436 – 7,545 |     1.29 ms |     7.45 ms |         160.9 µs |  205 MiB |

<sub>2026-11-11 · Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

### `ws` — RPC over WebSocket

Workload: `nested.procedure_1("hello world")` frames as encoded by the official client, one in flight per connection.

| Library                      | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](./benchmarks/ws-orpc) | 2.0.0-beta.50 | **23,050 req/s** | fastest      |   20,660 – 27,315 |     0.39 ms |     1.05 ms |          42.9 µs |  109 MiB |
| [tRPC](./benchmarks/ws-trpc) | 11.28.0       | **17,801 req/s** | 1.29× slower |   15,250 – 20,013 |     0.53 ms |     1.26 ms |          55.5 µs |   80 MiB |

<sub>2026-11-11 · Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

### `openapi` — OpenAPI (REST) over HTTP

Workload: `GET /nested/procedure_1?who=hello%20world`; the JSON response carries a `Date`.

| Library                           | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](./benchmarks/openapi-orpc) | 2.0.0-beta.50 | **27,009 req/s** | fastest                     |   21,983 – 29,990 |     0.31 ms |     0.88 ms |          36.6 µs |   88 MiB |
| [Hono](./benchmarks/openapi-hono) | 4.13.18       | **24,543 req/s** | 1.10× slower (within noise) |   19,715 – 27,871 |     0.36 ms |     0.93 ms |          40.3 µs |   91 MiB |

<sub>2026-11-11 · Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

### `typecheck` — Type-checking

Workload: 3,000 procedures in 1,501 routers, plus a typed client call for every procedure; every input uses the same Standard Schema interface.

| Library                             | Version       |  Check time | Relative                    | Range (min – max) | Total time |   Types | Instantiations | Memory used |
| :---------------------------------- | :------------ | ----------: | :-------------------------- | ----------------: | ---------: | ------: | -------------: | ----------: |
| [oRPC](./benchmarks/typecheck-orpc) | 2.0.0-beta.50 | **2.322 s** | fastest                     | 1.825 s – 3.011 s |    2.616 s | 247,841 |      1,040,001 |     268 MiB |
| [tRPC](./benchmarks/typecheck-trpc) | 11.28.0       | **2.499 s** | 1.08× slower (within noise) | 1.873 s – 3.040 s |    2.722 s | 223,766 |      1,043,234 |     224 MiB |

<sub>2026-11-11 · TypeScript 7.0.2, `tsc --singleThreaded` on CPU 3 · median of 30 rounds (order alternated).</sub>

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MiB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- results:end -->
