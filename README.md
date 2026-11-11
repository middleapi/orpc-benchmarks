# oRPC Benchmarks

Compares the performance of [oRPC](https://orpc.unnoq.com) with similar libraries.

Benchmarks are organized into groups. Benchmarks in the same group share the same workload and are directly comparable; benchmarks in different groups are not.

| Group       | Benchmarks                                                                                   | What it measures                                              |
| ----------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `rpc`       | [rpc-orpc](./benchmarks/rpc-orpc), [rpc-trpc](./benchmarks/rpc-trpc)                         | RPC runtime throughput over HTTP                              |
| `ws`        | [ws-orpc](./benchmarks/ws-orpc), [ws-trpc](./benchmarks/ws-trpc)                             | RPC runtime throughput over WebSocket                         |
| `openapi`   | [openapi-orpc](./benchmarks/openapi-orpc), [openapi-hono](./benchmarks/openapi-hono)         | OpenAPI (RESTful) runtime throughput over HTTP                |
| `typecheck` | [typecheck-orpc](./benchmarks/typecheck-orpc), [typecheck-trpc](./benchmarks/typecheck-trpc) | TypeScript type-checking time on a large, fully typed project |

## How to run

```bash
pnpm install
pnpm bench                  # every group, ~30 minutes with the default 10 rounds
pnpm bench rpc ws           # selected groups
pnpm bench rpc --rounds 3   # quicker, noisier
pnpm bench:profile rpc-orpc # Clinic.js Doctor report for one benchmark (or a whole group)
```

A complete group run overwrites its `results/<group>.json` and regenerates the results in this README and in the benchmark READMEs (`pnpm bench:report` regenerates them from the JSON files only). Running a single benchmark (`cd benchmarks/<benchmark> && pnpm bench`) prints its numbers without saving them, since only libraries measured in the same session are compared. `pnpm bench --help` lists every option.

For the most stable numbers, run on an otherwise idle Linux machine (CPU pinning needs `taskset`); on other systems the benchmarks still run, unpinned and noisier.

## Methodology

The runner ([scripts/bench.ts](./scripts/bench.ts)) is built to make numbers comparable within a group and reproducible across runs:

- **Pinned toolchain.** pnpm and Node.js versions are pinned through `devEngines` in [package.json](./package.json), so `pnpm bench` always runs on the same Node.js/V8 build, which is downloaded if needed.
- **Isolated CPUs.** On Linux, the server under test runs alone on a dedicated core and the load generator on two other cores (`taskset`); the first core is left to the OS. They never compete for CPU time, and the numbers are single-core server throughput. CPU steal time is recorded to expose noisy neighbours on virtual machines.
- **Fresh process, warm-up, measurement.** Every round starts a new server process, warms it up under full load, then measures for 10 s with the load still running, so there is no ramp-up or ramp-down inside the measurement window. The warm-up length comes from per-second throughput curves of fresh processes: oRPC and Hono plateau within about 3 s and tRPC's HTTP server after about 6 s, so HTTP groups warm up for 10 s; tRPC's WebSocket server keeps getting faster well past 10 s, so the `ws` group warms up for 30 s. Each round also compares the two halves of its measurement window and warns when throughput was still rising — that check is what caught the `ws` case.
- **Many interleaved rounds.** 10 rounds per benchmark, alternating the order between libraries (A B, B A, …) so slow drift of the machine affects all of them alike. Results are medians, with the min – max range across rounds; differences whose ranges overlap are flagged as within noise.
- **Real client payloads.** For the `rpc` and `ws` groups, the payload is captured at the start of each run from the library's official client (`scripts/client.ts` in each benchmark), so the load always matches what the installed client version sends; that call also checks the end-to-end result, including revived `Date`s. The `openapi` group sends the same REST request to both libraries.
- **Strict response checks.** Under load, every single response is checked for its status code and content. A run with any invalid response or connection error is rejected instead of reported, so a server answering with errors can never look fast.
- **Precise latency.** Each connection runs a closed loop with one request in flight, like autocannon, but latency is recorded with sub-microsecond resolution. autocannon records whole milliseconds, which is why earlier results showed `0 ms` latencies.
- **Server cost, not just speed.** Server CPU time per request and RSS are read from `/proc` without instrumenting the server. The runner warns when the server is not saturated or when the load generator gets close to its own limit, either of which would make the throughput number meaningless.
- **WebSocket load without client-side delays.** The `ws` group replays the official clients' frames over plain WebSocket connections. Driving the load through the official clients measured the clients instead: tRPC's WebSocket client waits a timer tick (at least 1 ms) before sending each batch, so with one request in flight per connection the tRPC server sat idle most of the time.
- **Profiling separate from measuring.** [Clinic.js Doctor](https://clinicjs.org/doctor/) reports come from `pnpm bench:profile`, under the same payload and load; benchmark numbers are always measured without a profiler attached.
- **Type-checking.** The generated projects are type-checked once to warm the file cache, then 10 times per library, interleaved and pinned to the same CPUs. Times come from `tsc --extendedDiagnostics`; type and instantiation counts are deterministic and can be compared across machines.

## Latest results

Produced with `pnpm bench` (default settings) on a dedicated 4-vCPU cloud VM. Before the run, every other process, the unbound kernel workqueues and all movable IRQs were moved to CPU 0, so CPUs 1–3 ran nothing but the benchmark:

<details>
<summary>CPU isolation commands (optional, Linux, as root)</summary>

```bash
# Move every other process and thread to CPU 0 (per-CPU kernel threads refuse, which is fine).
for pid in $(ps -eo pid=); do taskset -a -p -c 0 "$pid" > /dev/null 2>&1; done
# Run unbound kernel work and device interrupts on CPU 0 as well.
echo 1 > /sys/devices/virtual/workqueue/cpumask
for irq in /proc/irq/[0-9]*; do echo 1 > "$irq/smp_affinity" 2> /dev/null; done
# The shell is now confined to CPU 0 too: widen it again for the run (here, 4 CPUs).
taskset -c 0-3 pnpm bench
```

Undo it by setting the masks back to all CPUs (e.g. `taskset -a -p -c 0-3 <pid>`, `echo f > ...`), or reboot.

</details>

<!-- results:start -->

### `rpc` — RPC over HTTP

Workload: `GET nested.procedure_1("hello world")` exactly as the official client sends it; the response carries a `Date`, so the RPC serializer runs on every request.

| Library                       | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](./benchmarks/rpc-orpc) | 2.0.0-beta.50 | **30,249** req/s | fastest      |   29,214 – 31,559 |     0.28 ms |     0.75 ms |          32.5 µs |   95 MiB |
| [tRPC](./benchmarks/rpc-trpc) | 11.28.0       |  **8,213** req/s | 3.68× slower |     7,500 – 8,945 |     0.93 ms |     5.22 ms |         120.8 µs |  212 MiB |

<sub>2026-11-11 · Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

### `ws` — RPC over WebSocket

Workload: `nested.procedure_1("hello world")` frames exactly as the official client sends them, one in flight per connection.

| Library                      | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](./benchmarks/ws-orpc) | 2.0.0-beta.50 | **30,681** req/s | fastest      |   28,716 – 31,771 |     0.27 ms |     0.82 ms |          32.0 µs |  122 MiB |
| [tRPC](./benchmarks/ws-trpc) | 11.28.0       | **23,598** req/s | 1.30× slower |   22,520 – 24,734 |     0.36 ms |     1.00 ms |          41.8 µs |   91 MiB |

<sub>2026-11-11 · Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 30 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

### `openapi` — OpenAPI (REST) over HTTP

Workload: `GET /nested/procedure_1?who=hello%20world`; the JSON response carries a `Date`.

| Library                           | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](./benchmarks/openapi-orpc) | 2.0.0-beta.50 | **28,311** req/s | fastest                     |   20,948 – 32,252 |     0.30 ms |     0.83 ms |          34.8 µs |   95 MiB |
| [Hono](./benchmarks/openapi-hono) | 4.13.17       | **27,192** req/s | 1.04× slower (within noise) |   25,688 – 29,560 |     0.31 ms |     0.87 ms |          36.2 µs |  100 MiB |

<sub>2026-11-11 · Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

### `typecheck` — Type-checking

Workload: `tsc --noEmit` on 500 routers / 3,000 procedures plus a typed client call for each.

| Library                             | Version       |  Check time | Relative     | Range (min – max) | Total time |   Types | Instantiations | Memory used |
| :---------------------------------- | :------------ | ----------: | :----------- | ----------------: | ---------: | ------: | -------------: | ----------: |
| [oRPC](./benchmarks/typecheck-orpc) | 2.0.0-beta.50 | **1.905 s** | fastest      | 1.663 s – 2.088 s |    2.083 s | 451,042 |      2,198,304 |     459 MiB |
| [tRPC](./benchmarks/typecheck-trpc) | 11.28.0       | **2.881 s** | 1.51× slower | 2.755 s – 3.194 s |    3.071 s | 760,156 |      2,827,804 |     652 MiB |

<sub>2026-11-11 · TypeScript 7.0.2 · median of 10 rounds (run order alternated); `tsc` pinned to CPUs 1-3.</sub>

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 cores, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- results:end -->
