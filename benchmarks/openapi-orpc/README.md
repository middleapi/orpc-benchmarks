# oRPC OpenAPI Runtime Benchmark

- Evaluates the performance of oRPC's OpenAPI runtime on a project with **6 procedures** and **3 routers**; every procedure is exposed as a RESTful `GET` endpoint that reads its input from query parameters.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect oRPC's performance without external influences.
- Comparable to the other benchmarks in the `openapi` group: [openapi-orpc](../openapi-orpc), [openapi-hono](../openapi-hono).
- Every run profiles the server with [Clinic.js Doctor](https://clinicjs.org/doctor/) and overwrites the committed report at [.clinic/report.clinic-doctor.html](./.clinic/report.clinic-doctor.html).

## How to run

```bash
pnpm bench
```

## Latest Result

oRPC 2.0.0-beta.26 - 2026-08-09

```bash
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?who=hello%20world
10 connections


┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 1 ms  │ 1 ms │ 0.04 ms │ 0.22 ms │ 19 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┤
│ Req/Sec   │ 10,135  │ 10,135  │ 18,319  │ 19,023  │ 17,871  │ 1,852.45 │ 10,128  │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┤
│ Bytes/Sec │ 2.51 MB │ 2.51 MB │ 4.54 MB │ 4.72 MB │ 4.43 MB │ 460 kB   │ 2.51 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴─────────┴──────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

357k requests in 20.01s, 88.6 MB read
```

Clinic Doctor summary ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-orpc/.clinic/report.clinic-doctor.html)):

- CPU usage: ~104% on average (max 473%)
- Memory (RSS): 71 MB - 92 MB
- Event loop delay: 0.05 ms on average (max 1.32 ms)
- Detected issues: none

Run on:

```bash
CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 cores)
Memory: 7238 MB
OS: Linux 7.0.0-29-generic x64
Node: 24.18.1
pnpm: 11.17.0
```
