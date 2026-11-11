# tRPC RPC Runtime Benchmark

- Evaluates the performance of tRPC's RPC runtime over HTTP on a project with **6 procedures** and **3 routers**, served by tRPC's standalone adapter (`createHTTPServer`) with the SuperJSON transformer.
- Inputs use a no-op [Standard Schema](https://github.com/standard-schema/standard-schema) validator rather than a schema library such as Zod, so the result reflects tRPC itself.
- Load: the `GET` request the official client (`httpLink`) sends for `nested.procedure_1.query("hello world")`, captured by [scripts/client.ts](./scripts/client.ts) at the start of each run.

## How to run

```bash
pnpm bench          # this benchmark only (printed, not saved)
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

Committed results come from `pnpm bench rpc` at the repository root, which measures the whole group in one session; see the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

tRPC 11.28.0 — 2026-11-11 (@trpc/server@11.28.0, @trpc/client@11.28.0)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **7,106 req/s** (median; rounds range 5,880 – 8,772, CV 15%)           |
| Latency       | p50 1.13 ms · p90 2.10 ms · p99 4.68 ms · p99.9 6.45 ms · mean 1.41 ms |
| Server CPU    | 139.5 µs per request (99% of one core used)                            |
| Server memory | 197 MiB peak RSS (190 MiB average while under load)                    |

<details>
<summary>Per-round results, request and response</summary>

Drift is the throughput change from the first to the second half of the measurement window. A server still warming up shows a positive drift in nearly every round; single rounds vary with machine noise.

| Round | Req/s | Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | ----: | ----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 6,523 | -8.2% | 1.29 ms | 4.78 ms | 9.52 ms |       100% |  152.8 µs |  196 MiB |  0.4% |          12% |
|     2 | 6,077 | +8.9% | 1.21 ms | 10.0 ms | 26.7 ms |        99% |  163.4 µs |  214 MiB |  0.3% |          12% |
|     3 | 6,279 | +1.1% | 1.13 ms | 9.37 ms | 32.4 ms |        99% |  158.1 µs |  214 MiB |  0.7% |          12% |
|     4 | 7,539 | -0.8% | 1.12 ms | 4.40 ms | 7.90 ms |        99% |  132.0 µs |  199 MiB |  0.5% |          14% |
|     5 | 7,247 | -6.1% | 1.17 ms | 4.59 ms | 8.66 ms |        99% |  137.1 µs |  196 MiB |  0.6% |          14% |
|     6 | 6,965 | +7.8% | 1.14 ms | 4.89 ms | 13.9 ms |        99% |  141.9 µs |  195 MiB |  1.2% |          14% |
|     7 | 8,523 | +0.4% | 0.93 ms | 3.57 ms | 10.8 ms |        99% |  116.3 µs |  187 MiB |  0.8% |          14% |
|     8 | 8,772 | +0.5% | 0.91 ms | 3.57 ms | 9.44 ms |        98% |  112.0 µs |  192 MiB |  1.6% |          14% |
|     9 | 8,363 | -4.4% | 0.93 ms | 3.63 ms | 8.86 ms |        99% |  118.8 µs |  197 MiB |  0.6% |          14% |
|    10 | 5,880 | +7.4% | 1.31 ms | 9.69 ms | 24.3 ms |        99% |  168.0 µs |  211 MiB |  1.1% |          12% |

Request sent by the load generator (plus a `Host` header):

```http
GET /nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%7D HTTP/1.1
User-Agent: orpc-benchmarks
Accept: */*
```

Response:

```
{"result":{"data":{"json":{"name":"nested/procedure_1","date":"2026-11-11T06:34:36.112Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

Compared with the rest of the `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../rpc-orpc)     | 2.0.0-beta.50 | **25,797** req/s | fastest      |   22,255 – 30,746 |     0.34 ms |     0.90 ms |          38.2 µs |   87 MiB |
| [**tRPC**](../rpc-trpc) | 11.28.0       |  **7,106** req/s | 3.63× slower |     5,880 – 8,772 |     1.13 ms |     4.68 ms |         139.5 µs |  197 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-trpc/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 99% on average (max 115%)
- Memory (RSS): 84 MiB – 223 MiB
- Event loop delay: 1.07 ms on average (max 25.3 ms)
- Detected issues: memory heapUsed (performance), event loop utilization (performance) — high event loop utilization is expected here, since the load keeps the server saturated

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
