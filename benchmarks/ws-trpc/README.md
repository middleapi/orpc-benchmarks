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
| Throughput    | **23,598 req/s** (median; rounds range 22,520 – 24,734, CV 3.3%)       |
| Latency       | p50 0.36 ms · p90 0.66 ms · p99 1.00 ms · p99.9 1.86 ms · mean 0.42 ms |
| Server CPU    | 41.8 µs per request (99% of one core used)                             |
| Server memory | 91 MiB peak RSS (90 MiB average while under load)                      |

<details>
<summary>Per-round results, request and response</summary>

| Round |  Req/s |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 22,586 | 0.37 ms | 1.07 ms | 7.10 ms |        98% |   43.4 µs |   91 MiB |  1.2% |          34% |
|     2 | 22,520 | 0.37 ms | 1.07 ms | 5.69 ms |        99% |   43.8 µs |   91 MiB |  0.9% |          36% |
|     3 | 23,004 | 0.37 ms | 1.06 ms | 7.28 ms |        98% |   42.8 µs |   91 MiB |  0.8% |          34% |
|     4 | 23,664 | 0.36 ms | 0.99 ms | 6.57 ms |        99% |   41.7 µs |   89 MiB |  0.8% |          37% |
|     5 | 23,533 | 0.36 ms | 1.02 ms | 6.98 ms |        98% |   41.8 µs |   90 MiB |  1.1% |          36% |
|     6 | 24,174 | 0.35 ms | 0.98 ms | 4.94 ms |        99% |   40.9 µs |   92 MiB |  0.8% |          35% |
|     7 | 24,734 | 0.35 ms | 0.89 ms | 9.09 ms |        99% |   39.9 µs |   91 MiB |  0.6% |          35% |
|     8 | 24,610 | 0.35 ms | 0.96 ms | 5.17 ms |        99% |   40.2 µs |   91 MiB |  0.5% |          35% |
|     9 | 23,225 | 0.37 ms | 1.01 ms | 6.74 ms |        99% |   42.5 µs |   91 MiB |  0.7% |          34% |
|    10 | 23,862 | 0.36 ms | 0.97 ms | 8.57 ms |        98% |   41.2 µs |   90 MiB |  0.9% |          37% |

Frame sent by the load generator (the id is incremented for every request on a connection):

```
{"id":1,"method":"query","params":{"input":{"json":"hello world"},"path":"nested.procedure_1"}}
```

Response:

```
{"id":1,"result":{"type":"data","data":{"json":{"name":"nested/procedure_1","date":"2026-11-11T03:33:03.811Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

Compared with the rest of the `ws` group, measured in the same session:

| Library                | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../ws-orpc)     | 2.0.0-beta.50 | **30,681** req/s | fastest      |   28,716 – 31,771 |     0.27 ms |     0.82 ms |          32.0 µs |  122 MiB |
| [**tRPC**](../ws-trpc) | 11.28.0       | **23,598** req/s | 1.30× slower |   22,520 – 24,734 |     0.36 ms |     1.00 ms |          41.8 µs |   91 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 30 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/ws-trpc/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 98% on average (max 104%)
- Memory (RSS): 76 MiB – 96 MiB
- Event loop delay: 0.07 ms on average (max 5.99 ms)
- Detected issues: event loop utilization (performance) — high event loop utilization is expected here, since the load keeps the server saturated

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 cores, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
