# oRPC WebSocket Runtime Benchmark

- Evaluates the performance of oRPC's RPC runtime over **WebSocket** on a project with **6 procedures** and **3 routers**, served by `RPCHandler` from `@orpc/server/websocket` on a [`ws`](https://github.com/websockets/ws) server.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect oRPC's performance without external influences.
- At the start of each run, [scripts/client.ts](./scripts/client.ts) calls `nested.procedure_1("hello world")` twice through the official oRPC WebSocket client and records the frames it sends. The load generator then replays that frame (with a fresh id per request) over 10 plain WebSocket connections, one request in flight each, so the numbers reflect the server rather than client-side scheduling — mirroring how the HTTP benchmarks send raw requests.
- Comparable to the other benchmarks in the `ws` group: [ws-orpc](../ws-orpc), [ws-trpc](../ws-trpc).

## How to run

```bash
pnpm bench          # this benchmark only; the numbers are printed, not saved
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

The committed results come from running the whole `ws` group in one session from the repository root (`pnpm bench ws`), so every library in the group is measured under the same conditions. See the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

oRPC 2.0.0-beta.50 — 2026-11-11 (@orpc/server@2.0.0-beta.50, @orpc/client@2.0.0-beta.50)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **30,681 req/s** (median; rounds range 28,716 – 31,771, CV 3.0%)       |
| Latency       | p50 0.27 ms · p90 0.51 ms · p99 0.82 ms · p99.9 3.15 ms · mean 0.33 ms |
| Server CPU    | 32.0 µs per request (98% of one core used)                             |
| Server memory | 122 MiB peak RSS (121 MiB average while under load)                    |

<details>
<summary>Per-round results, request and response</summary>

| Round |  Req/s |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 30,742 | 0.28 ms | 0.81 ms | 14.1 ms |        98% |   32.0 µs |  121 MiB |  0.9% |          43% |
|     2 | 30,536 | 0.27 ms | 0.84 ms | 24.0 ms |        98% |   32.1 µs |  124 MiB |  1.0% |          44% |
|     3 | 30,620 | 0.27 ms | 0.83 ms | 10.2 ms |        98% |   32.1 µs |  119 MiB |  1.0% |          44% |
|     4 | 31,064 | 0.27 ms | 0.81 ms | 21.5 ms |        98% |   31.5 µs |  123 MiB |  0.8% |          44% |
|     5 | 28,716 | 0.28 ms | 1.11 ms | 41.8 ms |        97% |   33.8 µs |  123 MiB |  0.7% |          42% |
|     6 | 31,771 | 0.27 ms | 0.75 ms | 9.55 ms |        99% |   31.0 µs |  122 MiB |  0.8% |          43% |
|     7 | 31,771 | 0.27 ms | 0.77 ms | 9.79 ms |        99% |   31.2 µs |  121 MiB |  0.3% |          45% |
|     8 | 31,402 | 0.27 ms | 0.74 ms | 36.8 ms |        98% |   31.3 µs |  123 MiB |  1.1% |          43% |
|     9 | 30,366 | 0.27 ms | 0.84 ms | 17.2 ms |        98% |   32.1 µs |  124 MiB |  1.3% |          42% |
|    10 | 30,013 | 0.28 ms | 0.86 ms | 15.6 ms |        98% |   32.6 µs |  118 MiB |  1.2% |          45% |

Frame sent by the load generator (the id is incremented for every request on a connection):

```
{"id":"1","kind":"request","json":{"url":"/nested/procedure_1","body":{"json":"hello world"}}}
```

Response:

```
{"id":"1","kind":"response","json":{"body":{"json":{"name":"nested/procedure_1","date":"2026-11-11T03:33:03.348Z","input":"hello world"},"meta":[["date","date"]]}}}
```

</details>

Compared with the rest of the `ws` group, measured in the same session:

| Library                | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../ws-orpc) | 2.0.0-beta.50 | **30,681** req/s | fastest      |   28,716 – 31,771 |     0.27 ms |     0.82 ms |          32.0 µs |  122 MiB |
| [tRPC](../ws-trpc)     | 11.28.0       | **23,598** req/s | 1.30× slower |   22,520 – 24,734 |     0.36 ms |     1.00 ms |          41.8 µs |   91 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 30 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/ws-orpc/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 98% on average (max 106%)
- Memory (RSS): 89 MiB – 122 MiB
- Event loop delay: 0.07 ms on average (max 10.3 ms)
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
