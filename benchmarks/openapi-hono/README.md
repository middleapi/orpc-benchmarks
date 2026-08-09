# Hono OpenAPI Runtime Benchmark

- Evaluates the performance of Hono's runtime on a project with **6 routes** matching the procedures in [openapi-orpc](../openapi-orpc); every route is exposed as a RESTful `GET` endpoint that reads its input from query parameters.
- Each route uses a pass-through `hono/validator`, mirroring the no-op Standard Schema used in the oRPC benchmark, so the results reflect Hono's performance without external influences.
- Comparable to the other benchmarks in the `openapi` group: [openapi-orpc](../openapi-orpc), [openapi-hono](../openapi-hono).
- Every run profiles the server with [Clinic.js Doctor](https://clinicjs.org/doctor/) and overwrites the committed report at [.clinic/report.clinic-doctor.html](./.clinic/report.clinic-doctor.html).

## How to run

```bash
pnpm bench
```

## Latest Result

Hono 4.13.1 - 2026-08-09

```bash
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?who=hello%20world
10 connections


┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 1 ms  │ 1 ms │ 0.06 ms │ 0.28 ms │ 29 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬────────┬─────────┬──────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%    │ 97.5%   │ Avg      │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼────────┼─────────┼──────────┼──────────┼─────────┤
│ Req/Sec   │ 10,735  │ 10,735  │ 17,343 │ 17,567  │ 16,932.2 │ 1,446.56 │ 10,734  │
├───────────┼─────────┼─────────┼────────┼─────────┼──────────┼──────────┼─────────┤
│ Bytes/Sec │ 2.66 MB │ 2.66 MB │ 4.3 MB │ 4.36 MB │ 4.2 MB   │ 359 kB   │ 2.66 MB │
└───────────┴─────────┴─────────┴────────┴─────────┴──────────┴──────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

339k requests in 20.01s, 84 MB read
```

Clinic Doctor summary ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-hono/.clinic/report.clinic-doctor.html)):

- CPU usage: ~103% on average (max 457%)
- Memory (RSS): 71 MB - 95 MB
- Event loop delay: 0.07 ms on average (max 3.41 ms)
- Detected issues: none

Run on:

```bash
CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 cores)
Memory: 7238 MB
OS: Linux 7.0.0-29-generic x64
Node: 24.18.1
pnpm: 11.17.0
```
