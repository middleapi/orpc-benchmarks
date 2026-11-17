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

tRPC 11.28.3 — 2026-11-17 (@trpc/server@11.28.3, @trpc/client@11.28.3, superjson@2.2.6, ws@8.23.0)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **21,095 req/s** (median; rounds 18,646 – 23,239, CV 7.8%)             |
| Latency       | p50 0.40 ms · p90 0.73 ms · p99 1.17 ms · p99.9 2.28 ms · mean 0.47 ms |
| Server CPU    | 46.7 µs per request (98% of one core)                                  |
| Server memory | 84 MiB peak RSS (83 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 20,190 |  -0.4% | 0.41 ms | 1.21 ms | 33.4 ms |        98% |   48.4 µs |   84 MiB |  1.2% |          39% |
|     2 | 18,765 | +31.9% | 0.43 ms | 1.45 ms | 9.95 ms |        98% |   52.4 µs |   84 MiB |  1.0% |          38% |
|     3 | 23,239 |  +6.6% | 0.38 ms | 1.05 ms | 7.49 ms |        98% |   42.3 µs |   86 MiB |  0.8% |          40% |
|     4 | 19,456 | +18.1% | 0.42 ms | 1.52 ms | 12.9 ms |        95% |   49.0 µs |   84 MiB |  1.7% |          40% |
|     5 | 20,441 |  -1.5% | 0.42 ms | 1.24 ms | 7.74 ms |        98% |   48.1 µs |   85 MiB |  1.0% |          39% |
|     6 | 21,750 |  -4.1% | 0.39 ms | 1.07 ms | 6.94 ms |        98% |   45.2 µs |   85 MiB |  0.9% |          41% |
|     7 | 22,111 |  +0.7% | 0.39 ms | 1.08 ms | 30.2 ms |        98% |   44.1 µs |   84 MiB |  1.2% |          39% |
|     8 | 18,646 | +20.8% | 0.47 ms | 1.47 ms | 8.70 ms |        98% |   52.6 µs |   84 MiB |  1.2% |          41% |
|     9 | 22,360 |  +0.7% | 0.39 ms | 1.13 ms | 12.2 ms |        98% |   43.9 µs |   80 MiB |  1.1% |          42% |
|    10 | 22,334 |  +3.1% | 0.39 ms | 1.04 ms | 5.59 ms |        98% |   44.0 µs |   85 MiB |  0.9% |          41% |

Frame (the id increments with each request):

```
{"id":1,"method":"query","params":{"input":{"json":"hello world"},"path":"nested.procedure_1"}}
```

Response:

```
{"id":1,"result":{"type":"data","data":{"json":{"name":"nested/procedure_1","date":"2026-11-17T14:46:16.473Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

The whole `ws` group, measured in the same session:

| Library                | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../ws-orpc)     | 2.0.0-beta.51 | **27,448 req/s** | fastest      |   26,558 – 29,043 |     0.31 ms |     1.01 ms |          35.4 µs |  115 MiB |
| [**tRPC**](../ws-trpc) | 11.28.3       | **21,095 req/s** | 1.30× slower |   18,646 – 23,239 |     0.40 ms |     1.17 ms |          46.7 µs |   84 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/ws-trpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 98% on average
- Memory (RSS): 75 MiB – 93 MiB
- Event loop delay: 0.07 ms on average (max 23.7 ms)
- Detected issues: event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16088 MiB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v553 x64)
Node: v26.13.1 (V8 14.6.202.34-node.40)
pnpm: 12.21.0
```

<!-- result:end -->
