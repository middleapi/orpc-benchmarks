# tRPC RPC Runtime Benchmark

- Evaluates the performance of tRPC's RPC runtime over HTTP on a project with **6 procedures** and **3 routers**.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect tRPC's performance without external influences.
- Comparable to the other benchmarks in the `rpc` group: [rpc-orpc](../rpc-orpc), [rpc-trpc](../rpc-trpc).
- Every run profiles the server with [Clinic.js Doctor](https://clinicjs.org/doctor/) and overwrites the committed report at [.clinic/report.clinic-doctor.html](./.clinic/report.clinic-doctor.html).

## How to run

```bash
pnpm bench
```

## Latest Result

tRPC 11.18.0 - 2026-08-09

```bash
Running 20s test @ http://127.0.0.1:3000/nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections


┌─────────┬──────┬──────┬───────┬──────┬────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg    │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼────────┼─────────┼───────┤
│ Latency │ 1 ms │ 2 ms │ 5 ms  │ 5 ms │ 1.8 ms │ 1.05 ms │ 47 ms │
└─────────┴──────┴──────┴───────┴──────┴────────┴─────────┴───────┘
┌───────────┬────────┬────────┬─────────┬────────┬─────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%     │ 97.5%  │ Avg     │ Stdev  │ Min    │
├───────────┼────────┼────────┼─────────┼────────┼─────────┼────────┼────────┤
│ Req/Sec   │ 2,635  │ 2,635  │ 4,539   │ 4,763  │ 4,299   │ 537.76 │ 2,634  │
├───────────┼────────┼────────┼─────────┼────────┼─────────┼────────┼────────┤
│ Bytes/Sec │ 941 kB │ 941 kB │ 1.62 MB │ 1.7 MB │ 1.53 MB │ 192 kB │ 940 kB │
└───────────┴────────┴────────┴─────────┴────────┴─────────┴────────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

86k requests in 20.01s, 30.7 MB read
```

Clinic Doctor summary ([full report](./.clinic/report.clinic-doctor.html)):

- CPU usage: ~113% on average (max 508%)
- Memory (RSS): 73 MB - 247 MB
- Event loop delay: 0.70 ms on average (max 9.01 ms)
- Detected issues: none

Run on:

```bash
CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 cores)
Memory: 7238 MB
OS: Linux 7.0.0-29-generic x64
Node: 24.18.1
pnpm: 11.17.0
```
