# Hono OpenAPI Runtime Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates the performance of Hono's runtime on a project with **6 routes** matching the procedures in [openapi-orpc](../openapi-orpc). Every route is exposed as a RESTful `GET` endpoint that reads its input from query parameters.

Each route uses a pass-through `hono/validator`, mirroring the no-op Standard Schema used in the oRPC benchmark, so the results reflect Hono's performance without external influences.

Benchmarks in the `openapi` group are comparable to each other: [openapi-orpc](../openapi-orpc), [openapi-hono](../openapi-hono).

Each run profiles the server with [Clinic.js Doctor](https://clinicjs.org/doctor/) and overwrites the report at [.clinic/report.clinic-doctor.html](./.clinic/report.clinic-doctor.html).

## Benchmark Results

### Hono 4.12.32 - 2026-07-30

```bash
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?who=hello%20world
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 1 ms  │ 2 ms │ 0.22 ms │ 0.51 ms │ 26 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev  │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼────────┼─────────┤
│ Req/Sec   │ 9,751   │ 9,751   │ 12,463  │ 13,759  │ 12,398  │ 778.12 │ 9,749   │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼────────┼─────────┤
│ Bytes/Sec │ 2.42 MB │ 2.42 MB │ 3.09 MB │ 3.41 MB │ 3.07 MB │ 193 kB │ 2.42 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴─────────┴────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

248k requests in 20.01s, 61.5 MB read
```

**Clinic Doctor Report**: [.clinic/report.clinic-doctor.html](./.clinic/report.clinic-doctor.html)

**Environment**:

```bash
Operating System:
  Platform: linux
  Arch: x64
  Version: Linux 7.0.0-28-generic
  Available memory (MB): 7237
  Available CPU cores: 8
Binaries:
  Node: 24.18.1
  pnpm: 11.17.0
```
