# tRPC WebSocket Runtime Benchmark

- Evaluates the performance of tRPC's RPC runtime over **WebSocket** on a project with **6 procedures** and **3 routers**, served by `applyWSSHandler` on a [`ws`](https://github.com/websockets/ws) server with the SuperJSON transformer.
- Inputs use a no-op [Standard Schema](https://github.com/standard-schema/standard-schema) validator rather than a schema library such as Zod, so the result reflects tRPC itself.
- Load: the frame the official tRPC WebSocket client sends for `nested.procedure_1.query("hello world")`, captured by [scripts/client.ts](./scripts/client.ts) at the start of each run and replayed with a fresh id per request over 10 plain WebSocket connections, one request in flight each. Driving the official client instead would mostly measure its send delay (a timer tick, at least 1 ms, before each batch).

## How to run

```bash
pnpm bench          # this benchmark only (printed, not saved)
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

Committed results come from `pnpm bench ws` at the repository root, which measures the whole group in one session; see the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

tRPC 11.28.0 — 2026-11-11 (@trpc/server@11.28.0, @trpc/client@11.28.0)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **18,110 req/s** (median; rounds 16,297 – 21,954, CV 11%)              |
| Latency       | p50 0.53 ms · p90 0.80 ms · p99 1.26 ms · p99.9 2.34 ms · mean 0.55 ms |
| Server CPU    | 54.5 µs per request (99% of one core)                                  |
| Server memory | 81 MiB peak RSS (80 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 16,602 |  -1.0% | 0.56 ms | 1.42 ms | 10.1 ms |        99% |   59.4 µs |   81 MiB |  1.0% |          31% |
|     2 | 16,553 |  +8.0% | 0.55 ms | 1.34 ms | 7.09 ms |        98% |   59.4 µs |   82 MiB |  0.7% |          33% |
|     3 | 17,869 |  +1.5% | 0.53 ms | 1.28 ms | 7.50 ms |        99% |   55.2 µs |   81 MiB |  0.6% |          34% |
|     4 | 16,297 | +10.3% | 0.56 ms | 1.51 ms | 7.37 ms |        99% |   60.6 µs |   80 MiB |  0.9% |          33% |
|     5 | 18,350 |  +8.3% | 0.52 ms | 1.26 ms | 13.4 ms |        99% |   53.9 µs |   80 MiB |  0.5% |          32% |
|     6 | 19,878 |  +9.6% | 0.41 ms | 1.25 ms | 6.15 ms |        98% |   49.3 µs |   81 MiB |  1.3% |          34% |
|     7 | 21,954 |  +1.3% | 0.38 ms | 1.10 ms | 4.89 ms |        99% |   45.0 µs |   80 MiB |  0.5% |          36% |
|     8 | 21,345 |  -4.7% | 0.39 ms | 1.12 ms | 4.44 ms |        99% |   46.2 µs |   84 MiB |  0.9% |          35% |
|     9 | 17,800 |  -2.1% | 0.53 ms | 1.19 ms | 5.11 ms |        99% |   55.6 µs |   81 MiB |  0.7% |          34% |
|    10 | 19,233 |  +9.9% | 0.49 ms | 1.20 ms | 8.65 ms |        99% |   51.4 µs |   80 MiB |  0.7% |          35% |

Frame (the id increments with each request):

```
{"id":1,"method":"query","params":{"input":{"json":"hello world"},"path":"nested.procedure_1"}}
```

Response:

```
{"id":1,"result":{"type":"data","data":{"json":{"name":"nested/procedure_1","date":"2026-11-11T11:02:41.989Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

The whole `ws` group, measured in the same session:

| Library                | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../ws-orpc)     | 2.0.0-beta.50 | **25,056 req/s** | fastest      |   22,879 – 29,053 |     0.37 ms |     0.95 ms |          39.6 µs |  112 MiB |
| [**tRPC**](../ws-trpc) | 11.28.0       | **18,110 req/s** | 1.38× slower |   16,297 – 21,954 |     0.53 ms |     1.26 ms |          54.5 µs |   81 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/ws-trpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 98% on average
- Memory (RSS): 76 MiB – 96 MiB
- Event loop delay: 0.07 ms on average (max 5.99 ms)
- Detected issues: event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
