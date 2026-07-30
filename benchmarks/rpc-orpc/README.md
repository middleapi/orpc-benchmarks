# oRPC RPC Runtime Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates the performance of oRPC's RPC runtime on a project with **6 procedures** and **3 routers**.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect oRPC's performance without external influences.

Benchmarks in the `rpc` group are comparable to each other: [rpc-orpc](../rpc-orpc), [rpc-trpc](../rpc-trpc).

Each run profiles the server with [Clinic.js Doctor](https://clinicjs.org/doctor/) and overwrites the report at [.clinic/report.clinic-doctor.html](./.clinic/report.clinic-doctor.html).

## Benchmark Results

### oRPC 2.0.0-beta.22 - 2026-07-30

```bash
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 1 ms  │ 2 ms │ 0.18 ms │ 0.52 ms │ 33 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Req/Sec   │ 7,171   │ 7,171   │ 14,039  │ 15,431  │ 13,587.9 │ 1,886.7 │ 7,171   │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Bytes/Sec │ 1.97 MB │ 1.97 MB │ 3.86 MB │ 4.24 MB │ 3.74 MB  │ 519 kB  │ 1.97 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

272k requests in 20.02s, 74.7 MB read
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
