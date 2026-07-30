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

oRPC 2.0.0-beta.22 - 2026-07-30

```bash
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?who=hello%20world
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 1 ms  │ 2 ms │ 0.15 ms │ 0.44 ms │ 23 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬────────┬─────────┬──────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%    │ 97.5%   │ Avg      │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼────────┼─────────┼──────────┼──────────┼─────────┤
│ Req/Sec   │ 10,383  │ 10,383  │ 14,119 │ 15,743  │ 14,053.2 │ 1,017.42 │ 10,382  │
├───────────┼─────────┼─────────┼────────┼─────────┼──────────┼──────────┼─────────┤
│ Bytes/Sec │ 2.58 MB │ 2.58 MB │ 3.5 MB │ 3.91 MB │ 3.49 MB  │ 252 kB   │ 2.57 MB │
└───────────┴─────────┴─────────┴────────┴─────────┴──────────┴──────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

281k requests in 20.01s, 69.7 MB read
```

Clinic Doctor summary ([full report](./.clinic/report.clinic-doctor.html)):

- CPU usage: ~104% on average (max 407%)
- Memory (RSS): 70 MB - 90 MB
- Event loop delay: 0.07 ms on average (max 2.97 ms)
- Detected issues: none

Run on:

```bash
CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 cores)
Memory: 7237 MB
OS: Linux 7.0.0-28-generic x64
Node: 24.18.1
pnpm: 11.17.0
```
