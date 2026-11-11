# tRPC RPC Runtime Benchmark

- Evaluates the performance of tRPC's RPC runtime over HTTP on a project with **6 procedures** and **3 routers**, served by tRPC's standalone adapter (`createHTTPServer`) with the SuperJSON transformer.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect tRPC's performance without external influences.
- The load generator sends exactly the `GET` request the official client (`httpLink`) produces for `nested.procedure_1.query("hello world")`, captured by [scripts/client.ts](./scripts/client.ts) at the start of each run.
- Comparable to the other benchmarks in the `rpc` group: [rpc-orpc](../rpc-orpc), [rpc-trpc](../rpc-trpc).

## How to run

```bash
pnpm bench          # this benchmark only; the numbers are printed, not saved
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

The committed results come from running the whole `rpc` group in one session from the repository root (`pnpm bench rpc`), so every library in the group is measured under the same conditions. See the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

tRPC 11.28.0 — 2026-11-11 (@trpc/server@11.28.0, @trpc/client@11.28.0)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **8,213 req/s** (median; rounds range 7,500 – 8,945, CV 6.8%)          |
| Latency       | p50 0.93 ms · p90 1.73 ms · p99 5.22 ms · p99.9 9.15 ms · mean 1.22 ms |
| Server CPU    | 120.8 µs per request (99% of one core used)                            |
| Server memory | 212 MiB peak RSS (196 MiB average while under load)                    |

<details>
<summary>Per-round results, request and response</summary>

| Round | Req/s |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | ----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 8,945 | 0.93 ms | 3.34 ms | 13.5 ms |        99% |  110.7 µs |  206 MiB |  1.0% |          14% |
|     2 | 7,930 | 0.93 ms | 6.98 ms | 20.6 ms |        99% |  125.3 µs |  218 MiB |  0.5% |          12% |
|     3 | 7,862 | 0.94 ms | 6.83 ms | 23.1 ms |        99% |  126.4 µs |  223 MiB |  0.6% |          12% |
|     4 | 8,495 | 0.95 ms | 3.62 ms | 8.92 ms |        99% |  116.2 µs |  202 MiB |  1.3% |          14% |
|     5 | 7,880 | 0.94 ms | 7.17 ms | 22.6 ms |        99% |  125.9 µs |  214 MiB |  0.4% |          12% |
|     6 | 8,932 | 0.89 ms | 3.33 ms | 16.9 ms |        99% |  110.8 µs |  205 MiB |  0.9% |          13% |
|     7 | 7,500 | 1.00 ms | 7.38 ms | 24.0 ms |        99% |  132.5 µs |  222 MiB |  0.6% |          11% |
|     8 | 7,782 | 0.94 ms | 7.04 ms | 44.8 ms |        99% |  127.3 µs |  216 MiB |  0.9% |          12% |
|     9 | 8,928 | 0.92 ms | 3.47 ms | 21.4 ms |        99% |  110.8 µs |  210 MiB |  0.9% |          14% |
|    10 | 8,791 | 0.93 ms | 3.43 ms | 18.4 ms |        99% |  112.7 µs |  208 MiB |  0.9% |          13% |

Request sent by the load generator (plus a `Host` header):

```http
GET /nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%7D HTTP/1.1
User-Agent: orpc-benchmarks
Accept: */*
```

Response:

```
{"result":{"data":{"json":{"name":"nested/procedure_1","date":"2026-11-11T03:10:03.663Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

Compared with the rest of the `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../rpc-orpc)     | 2.0.0-beta.50 | **30,249** req/s | fastest      |   29,214 – 31,559 |     0.28 ms |     0.75 ms |          32.5 µs |   95 MiB |
| [**tRPC**](../rpc-trpc) | 11.28.0       |  **8,213** req/s | 3.68× slower |     7,500 – 8,945 |     0.93 ms |     5.22 ms |         120.8 µs |  212 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-trpc/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 99% on average (max 115%)
- Memory (RSS): 84 MiB – 223 MiB
- Event loop delay: 1.07 ms on average (max 25.3 ms)
- Detected issues: memory heapUsed (performance), event loop utilization (performance) — high event loop utilization is expected here, since the load keeps the server saturated

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 cores, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
