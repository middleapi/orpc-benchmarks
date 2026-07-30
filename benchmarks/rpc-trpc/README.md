# tRPC RPC Runtime Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates the performance of tRPC's RPC runtime on a project with **6 procedures** and **3 routers**.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect tRPC's performance without external influences.

Benchmarks in the `rpc` group are comparable to each other: [rpc-orpc](../rpc-orpc), [rpc-trpc](../rpc-trpc).

Each run profiles the server with [Clinic.js Doctor](https://clinicjs.org/doctor/) and overwrites the report at [public/clinic-doctor.html](./public/clinic-doctor.html).

## Benchmark Results

### tRPC 11.18.0 - 2026-07-30

```bash
Running 20s test @ http://127.0.0.1:3000/nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 1 ms │ 2 ms │ 7 ms  │ 9 ms │ 2.66 ms │ 1.83 ms │ 81 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬────────┬────────┬─────────┬─────────┬─────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%     │ 97.5%   │ Avg     │ Stdev  │ Min    │
├───────────┼────────┼────────┼─────────┼─────────┼─────────┼────────┼────────┤
│ Req/Sec   │ 1,423  │ 1,423  │ 3,067   │ 3,995   │ 3,155.5 │ 643.2  │ 1,423  │
├───────────┼────────┼────────┼─────────┼─────────┼─────────┼────────┼────────┤
│ Bytes/Sec │ 508 kB │ 508 kB │ 1.09 MB │ 1.43 MB │ 1.13 MB │ 230 kB │ 508 kB │
└───────────┴────────┴────────┴─────────┴─────────┴─────────┴────────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

63k requests in 20.01s, 22.5 MB read
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
