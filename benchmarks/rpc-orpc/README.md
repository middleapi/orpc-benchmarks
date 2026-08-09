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

oRPC 2.0.0-beta.26 - 2026-08-09

```bash
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections


┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 0 ms  │ 1 ms │ 0.03 ms │ 0.21 ms │ 19 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg    │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼────────┼──────────┼─────────┤
│ Req/Sec   │ 12,631  │ 12,631  │ 18,943  │ 19,407  │ 18,551 │ 1,446.14 │ 12,629  │
├───────────┼─────────┼─────────┼─────────┼─────────┼────────┼──────────┼─────────┤
│ Bytes/Sec │ 3.47 MB │ 3.47 MB │ 5.21 MB │ 5.33 MB │ 5.1 MB │ 398 kB   │ 3.47 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴────────┴──────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

371k requests in 20.05s, 102 MB read
```

Clinic Doctor summary ([full report](./.clinic/report.clinic-doctor.html)):

- CPU usage: ~104% on average (max 486%)
- Memory (RSS): 71 MB - 92 MB
- Event loop delay: 0.04 ms on average (max 3.46 ms)
- Detected issues: none

Run on:

```bash
CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 cores)
Memory: 7238 MB
OS: Linux 7.0.0-29-generic x64
Node: 24.18.1
pnpm: 11.17.0
```
