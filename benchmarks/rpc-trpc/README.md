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

### tRPC 11.0.0 - 2025-03-26T01:25:14.655Z

```bash
Listening on http://127.0.0.1:3000/nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
Running 20s test @ http://127.0.0.1:3000/nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 1 ms │ 1 ms │ 4 ms  │ 5 ms │ 1.34 ms │ 0.94 ms │ 60 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬────────┬────────┬───────┬─────────┬─────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%   │ 97.5%   │ Avg     │ Stdev  │ Min    │
├───────────┼────────┼────────┼───────┼─────────┼─────────┼────────┼────────┤
│ Req/Sec   │ 2,291  │ 2,291  │ 5,843 │ 6,147   │ 5,466.9 │ 974.76 │ 2,291  │
├───────────┼────────┼────────┼───────┼─────────┼─────────┼────────┼────────┤
│ Bytes/Sec │ 786 kB │ 786 kB │ 2 MB  │ 2.11 MB │ 1.88 MB │ 334 kB │ 786 kB │
└───────────┴────────┴────────┴───────┴─────────┴─────────┴────────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

109k requests in 20.01s, 37.5 MB read
```

**Clinic Doctor Report**:

Summary:
Note: The following summary is manually created and may not be fully accurate.

- CPU Usage: 100% - 128%
- Memory Usage: 177MB - 272MB

[Detail report here](./public/2025-03-26T01:25:14.655Z.clinic-doctor.html)

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

### tRPC 11.1.0 - 2025-04-12T03:41:10.162Z

```bash
Listening on http://127.0.0.1:3000/nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
Running 20s test @ http://127.0.0.1:3000/nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 1 ms │ 1 ms │ 4 ms  │ 5 ms │ 1.38 ms │ 0.97 ms │ 44 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬────────┬────────┬────────┬─────────┬──────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%   │ Avg      │ Stdev  │ Min    │
├───────────┼────────┼────────┼────────┼─────────┼──────────┼────────┼────────┤
│ Req/Sec   │ 2,153  │ 2,153  │ 5,527  │ 5,811   │ 5,221.11 │ 885.42 │ 2,153  │
├───────────┼────────┼────────┼────────┼─────────┼──────────┼────────┼────────┤
│ Bytes/Sec │ 739 kB │ 739 kB │ 1.9 MB │ 1.99 MB │ 1.79 MB  │ 304 kB │ 738 kB │
└───────────┴────────┴────────┴────────┴─────────┴──────────┴────────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

104k requests in 20.01s, 35.8 MB read
```

**Clinic Doctor Report**:

Summary:
Note: The following summary is manually created and may not be fully accurate.

- CPU Usage: 100% - 129%
- Memory Usage: 182MB - 268MB

[Detail report here](./public/2025-04-12T03:41:10.162Z.clinic-doctor.html)

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
