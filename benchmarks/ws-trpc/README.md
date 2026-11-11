# tRPC WebSocket Runtime Benchmark

- Evaluates the performance of tRPC's RPC runtime over **WebSocket** on a project with **6 procedures** and **3 routers**, served by `applyWSSHandler` on a [`ws`](https://github.com/websockets/ws) server with the SuperJSON transformer.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect tRPC's performance without external influences.
- At the start of each run, [scripts/client.ts](./scripts/client.ts) calls `nested.procedure_1.query("hello world")` twice through the official tRPC WebSocket client and records the frames it sends. The load generator then replays that frame (with a fresh id per request) over 10 plain WebSocket connections, one request in flight each. Driving the load through the official client would mostly measure its send delay: it waits a timer tick (at least 1 ms) before sending each batch, which left the server idle most of the time in earlier versions of this benchmark.
- Comparable to the other benchmarks in the `ws` group: [ws-orpc](../ws-orpc), [ws-trpc](../ws-trpc).

## How to run

```bash
pnpm bench          # this benchmark only; the numbers are printed, not saved
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

The committed results come from running the whole `ws` group in one session from the repository root (`pnpm bench ws`), so every library in the group is measured under the same conditions. See the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

tRPC 11.28.0 — 2026-11-11 (@trpc/server@11.28.0, @trpc/client@11.28.0)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **20,974 req/s** (median; rounds range 19,595 – 22,477, CV 5.1%)       |
| Latency       | p50 0.40 ms · p90 0.73 ms · p99 1.12 ms · p99.9 1.97 ms · mean 0.48 ms |
| Server CPU    | 47.0 µs per request (98% of one core used)                             |
| Server memory | 82 MiB peak RSS (81 MiB average while under load)                      |

<details>
<summary>Per-round results, request and response</summary>

Drift is the throughput change from the first to the second half of the measurement window; a clearly positive value means the server was still warming up.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 22,477 |  +2.9% | 0.37 ms | 1.09 ms | 20.9 ms |        98% |   43.8 µs |   82 MiB |  0.7% |          37% |
|     2 | 22,371 |  +5.8% | 0.38 ms | 1.09 ms | 19.3 ms |        98% |   43.9 µs |   82 MiB |  1.0% |          36% |
|     3 | 21,905 |  -6.6% | 0.38 ms | 1.08 ms | 9.55 ms |        99% |   45.1 µs |   82 MiB |  0.8% |          35% |
|     4 | 22,127 |  -5.6% | 0.38 ms | 1.10 ms | 6.75 ms |        98% |   44.4 µs |   82 MiB |  1.0% |          36% |
|     5 | 19,595 |  -9.1% | 0.47 ms | 1.18 ms | 34.0 ms |        98% |   50.2 µs |   79 MiB |  0.5% |          34% |
|     6 | 20,417 |  -2.9% | 0.41 ms | 1.16 ms | 14.4 ms |        97% |   47.8 µs |   83 MiB |  1.8% |          35% |
|     7 | 21,343 | +10.1% | 0.39 ms | 1.09 ms | 4.05 ms |        99% |   46.3 µs |   82 MiB |  0.6% |          35% |
|     8 | 20,606 |  +1.0% | 0.41 ms | 1.17 ms | 10.1 ms |        98% |   47.6 µs |   82 MiB |  1.2% |          38% |
|     9 | 20,206 |  +4.1% | 0.42 ms | 1.18 ms | 4.85 ms |        99% |   48.8 µs |   81 MiB |  0.9% |          36% |
|    10 | 19,917 |  -3.7% | 0.46 ms | 1.15 ms | 5.69 ms |        99% |   49.7 µs |   83 MiB |  0.6% |          35% |

Frame sent by the load generator (the id is incremented for every request on a connection):

```
{"id":1,"method":"query","params":{"input":{"json":"hello world"},"path":"nested.procedure_1"}}
```

Response:

```
{"id":1,"result":{"type":"data","data":{"json":{"name":"nested/procedure_1","date":"2026-11-11T06:41:22.130Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

Compared with the rest of the `ws` group, measured in the same session:

| Library                | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../ws-orpc)     | 2.0.0-beta.50 | **27,878** req/s | fastest      |   22,626 – 28,986 |     0.29 ms |     0.90 ms |          35.0 µs |  113 MiB |
| [**tRPC**](../ws-trpc) | 11.28.0       | **20,974** req/s | 1.33× slower |   19,595 – 22,477 |     0.40 ms |     1.12 ms |          47.0 µs |   82 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 30 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/ws-trpc/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 98% on average (max 104%)
- Memory (RSS): 76 MiB – 96 MiB
- Event loop delay: 0.07 ms on average (max 5.99 ms)
- Detected issues: event loop utilization (performance) — high event loop utilization is expected here, since the load keeps the server saturated

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
