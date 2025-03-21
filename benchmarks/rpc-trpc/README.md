# tRPC RPC Runtime Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates the performance of tRPC's RPC runtime on a project with **6 procedures** and **3 routers**.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect tRPC's performance without external influences.

## Benchmark Results

### tRPC 11.0.0-rc.840 - 2025-03-21T09:07:35.265Z

```bash
Listening on http://127.0.0.1:3000/nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
Running 20s test @ http://127.0.0.1:3000/nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 1 ms │ 1 ms │ 3 ms  │ 5 ms │ 1.31 ms │ 0.92 ms │ 64 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬────────┬────────┬───────┬─────────┬─────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%   │ 97.5%   │ Avg     │ Stdev  │ Min    │
├───────────┼────────┼────────┼───────┼─────────┼─────────┼────────┼────────┤
│ Req/Sec   │ 2,177  │ 2,177  │ 5,843 │ 6,059   │ 5,467.2 │ 960.92 │ 2,176  │
├───────────┼────────┼────────┼───────┼─────────┼─────────┼────────┼────────┤
│ Bytes/Sec │ 746 kB │ 746 kB │ 2 MB  │ 2.08 MB │ 1.88 MB │ 330 kB │ 746 kB │
└───────────┴────────┴────────┴───────┴─────────┴─────────┴────────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

109k requests in 20.01s, 37.5 MB read
```

**Clinic Doctor Report**:

Summary:
Note: The following summary is manually created and may not be fully accurate.

- CPU Usage: 100% - 128%
- Memory Usage: 209MB - 262MB

[Detail report here](./public/2025-03-21T09:07:35.265Z.clinic-doctor.html)

**Environment**:

```bash
Operating System:
  Platform: linux
  Arch: x64
  Version: #19~24.04.1-Ubuntu SMP PREEMPT_DYNAMIC
  Available memory (MB): 7755
  Available CPU cores: 8
Binaries:
  Node: 22.12.0
  npm: 10.9.0
  Yarn: N/A
  pnpm: 10.6.5
```
