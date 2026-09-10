# oRPC RPC Runtime Benchmark

- Evaluates the performance of oRPC's RPC runtime over HTTP on a project with **6 procedures** and **3 routers**.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect oRPC's performance without external influences.
- Comparable to the other benchmarks in the `rpc` group: [rpc-orpc](../rpc-orpc), [rpc-trpc](../rpc-trpc).
- Every run profiles the server with [Clinic.js Doctor](https://clinicjs.org/doctor/) and overwrites the committed report at [.clinic/report.clinic-doctor.html](./.clinic/report.clinic-doctor.html).

## How to run

```bash
pnpm bench
```

## Latest Result

oRPC 2.0.0-beta.35 - 2026-09-10

```bash
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections


┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 0 ms  │ 1 ms │ 0.03 ms │ 0.18 ms │ 20 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
│ Req/Sec   │ 13,047  │ 13,047  │ 19,215  │ 19,471  │ 18,844.6 │ 1,364.89 │ 13,041  │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
│ Bytes/Sec │ 3.59 MB │ 3.59 MB │ 5.28 MB │ 5.35 MB │ 5.18 MB  │ 375 kB   │ 3.59 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴──────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

377k requests in 20.01s, 104 MB read
```

Clinic Doctor summary ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-orpc/.clinic/report.clinic-doctor.html)):

- CPU usage: ~104% on average (max 505%)
- Memory (RSS): 73 MB - 91 MB
- Event loop delay: 0.04 ms on average (max 1.05 ms)
- Detected issues: none

Run on:

```bash
CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 cores)
Memory: 7238 MB
OS: Linux 7.0.0-29-generic x64
Node: 24.18.1
pnpm: 11.17.0
```
