# tRPC RPC Runtime Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates the performance of tRPC's RPC runtime on a project with **6 procedures** and **3 routers**.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect tRPC's performance without external influences.

Benchmarks in the `rpc` group are comparable to each other: [rpc-orpc](../rpc-orpc), [rpc-trpc](../rpc-trpc).

Each run profiles the server with [Clinic.js Doctor](https://clinicjs.org/doctor/) and overwrites the report at [.clinic/report.clinic-doctor.html](./.clinic/report.clinic-doctor.html).

## Benchmark Results

### tRPC 11.18.0 - 2026-07-30

```bash
Running 20s test @ http://127.0.0.1:3000/nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev  │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼────────┼───────┤
│ Latency │ 1 ms │ 2 ms │ 7 ms  │ 8 ms │ 2.36 ms │ 1.6 ms │ 47 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴────────┴───────┘
┌───────────┬────────┬────────┬─────────┬─────────┬─────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%     │ 97.5%   │ Avg     │ Stdev  │ Min    │
├───────────┼────────┼────────┼─────────┼─────────┼─────────┼────────┼────────┤
│ Req/Sec   │ 2,115  │ 2,115  │ 3,717   │ 3,963   │ 3,483.8 │ 495.66 │ 2,114  │
├───────────┼────────┼────────┼─────────┼─────────┼─────────┼────────┼────────┤
│ Bytes/Sec │ 755 kB │ 755 kB │ 1.33 MB │ 1.42 MB │ 1.24 MB │ 177 kB │ 755 kB │
└───────────┴────────┴────────┴─────────┴─────────┴─────────┴────────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

70k requests in 20.01s, 24.9 MB read
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
