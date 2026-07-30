# Hono OpenAPI Runtime Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates the performance of Hono's runtime on a project with **6 routes** matching the procedures in [openapi-orpc](../openapi-orpc). Every route is exposed as a RESTful `GET` endpoint that reads its input from query parameters.

Each route uses a pass-through `hono/validator`, mirroring the no-op Standard Schema used in the oRPC benchmark, so the results reflect Hono's performance without external influences.

Benchmarks in the `openapi` group are comparable to each other: [openapi-orpc](../openapi-orpc), [openapi-hono](../openapi-hono).

Each run profiles the server with [Clinic.js Doctor](https://clinicjs.org/doctor/) and overwrites the report at [public/clinic-doctor.html](./public/clinic-doctor.html).

## Benchmark Results

### Hono 4.12.32 - 2026-07-30

```bash
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?who=hello%20world
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 1 ms  │ 2 ms │ 0.22 ms │ 0.51 ms │ 19 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev  │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼────────┼─────────┤
│ Req/Sec   │ 9,047   │ 9,047   │ 12,639  │ 13,127  │ 12,366.4 │ 847.8  │ 9,044   │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼────────┼─────────┤
│ Bytes/Sec │ 2.24 MB │ 2.24 MB │ 3.13 MB │ 3.26 MB │ 3.07 MB  │ 210 kB │ 2.24 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

247k requests in 20.01s, 61.3 MB read
```

**Clinic Doctor Report**: [public/clinic-doctor.html](./public/clinic-doctor.html)

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
