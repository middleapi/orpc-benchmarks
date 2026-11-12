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

tRPC 11.28.0 — 2026-11-11 (@trpc/server@11.28.0, @trpc/client@11.28.0, superjson@2.2.6, ws@8.22.2)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **17,801 req/s** (median; rounds 15,250 – 20,013, CV 8.8%)             |
| Latency       | p50 0.53 ms · p90 0.84 ms · p99 1.26 ms · p99.9 2.31 ms · mean 0.56 ms |
| Server CPU    | 55.5 µs per request (99% of one core)                                  |
| Server memory | 80 MiB peak RSS (79 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 20,013 |  +4.0% | 0.42 ms | 1.17 ms | 9.81 ms |        99% |   49.4 µs |   80 MiB |  0.6% |          35% |
|     2 | 18,579 | -19.6% | 0.53 ms | 1.24 ms | 3.66 ms |        99% |   53.2 µs |   82 MiB |  0.5% |          36% |
|     3 | 17,808 |  +5.9% | 0.54 ms | 1.25 ms | 6.75 ms |        99% |   55.5 µs |   82 MiB |  0.8% |          35% |
|     4 | 17,794 | +14.6% | 0.53 ms | 1.26 ms | 11.9 ms |        99% |   55.5 µs |   80 MiB |  0.7% |          36% |
|     5 | 17,216 |  -3.6% | 0.52 ms | 1.42 ms | 8.28 ms |        99% |   57.4 µs |   79 MiB |  0.8% |          33% |
|     6 | 15,965 |  +6.0% | 0.56 ms | 1.39 ms | 7.37 ms |        99% |   62.0 µs |   79 MiB |  0.6% |          31% |
|     7 | 15,250 |  -9.3% | 0.59 ms | 1.52 ms | 9.09 ms |        99% |   65.0 µs |   79 MiB |  0.3% |          31% |
|     8 | 15,815 |  +3.1% | 0.58 ms | 1.29 ms | 3.99 ms |        99% |   62.8 µs |   80 MiB |  0.4% |          32% |
|     9 | 19,315 |  +6.8% | 0.45 ms | 1.26 ms | 14.2 ms |        98% |   51.0 µs |   80 MiB |  1.1% |          36% |
|    10 | 17,947 | -14.3% | 0.54 ms | 1.23 ms | 12.7 ms |        99% |   55.4 µs |   80 MiB |  0.5% |          34% |

Frame (the id increments with each request):

```
{"id":1,"method":"query","params":{"input":{"json":"hello world"},"path":"nested.procedure_1"}}
```

Response:

```
{"id":1,"result":{"type":"data","data":{"json":{"name":"nested/procedure_1","date":"2026-11-11T15:17:52.810Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

The whole `ws` group, measured in the same session:

| Library                | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../ws-orpc)     | 2.0.0-beta.50 | **23,050 req/s** | fastest      |   20,660 – 27,315 |     0.39 ms |     1.05 ms |          42.9 µs |  109 MiB |
| [**tRPC**](../ws-trpc) | 11.28.0       | **17,801 req/s** | 1.29× slower |   15,250 – 20,013 |     0.53 ms |     1.26 ms |          55.5 µs |   80 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/ws-trpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 99% on average
- Memory (RSS): 69 MiB – 82 MiB
- Event loop delay: 0.09 ms on average (max 8.77 ms)
- Detected issues: event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MiB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
