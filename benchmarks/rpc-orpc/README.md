# oRPC RPC Runtime Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates the performance of oRPC's RPC runtime on a project with **6 procedures** and **3 routers**.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect oRPC's performance without external influences.

## Benchmark Results

### oRPC 1.0.0-beta.2 - 2025-03-21T09:18:05.843Z

```bash
Listening on http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 1 ms  │ 1 ms │ 0.16 ms │ 0.42 ms │ 22 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
│ Req/Sec   │ 7,415   │ 7,415   │ 13,719  │ 14,111  │ 13,366.5 │ 1,420.26 │ 7,414   │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
│ Bytes/Sec │ 2.14 MB │ 2.14 MB │ 3.95 MB │ 4.06 MB │ 3.85 MB  │ 409 kB   │ 2.14 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴──────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

267k requests in 20.01s, 77 MB read
```

**Clinic Doctor Report**:

Summary:
Note: The following summary is manually created and may not be fully accurate.

- CPU Usage: 100% - 101%
- Memory Usage: 100MB - 102MB

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

### oRPC 1.0.0-beta.4 - 2025-03-26T01:21:20.656Z

```bash
Listening on http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 1 ms  │ 1 ms │ 0.14 ms │ 0.41 ms │ 17 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
│ Req/Sec   │ 9,127   │ 9,127   │ 15,031  │ 15,663  │ 14,720.4 │ 1,391.72 │ 9,122   │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
│ Bytes/Sec │ 2.63 MB │ 2.63 MB │ 4.33 MB │ 4.51 MB │ 4.24 MB  │ 401 kB   │ 2.63 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴──────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

294k requests in 20.01s, 84.8 MB read
```

**Clinic Doctor Report**:

Summary:
Note: The following summary is manually created and may not be fully accurate.

- CPU Usage: 101% - 102%
- Memory Usage: 100MB - 103MB

[Detail report here](./public/2025-03-26T01:21:20.656Z.clinic-doctor.html)

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

### oRPC 0.0.0-next.66d4d3b - 2025-04-12T07:11:20.387Z

```bash
Listening on http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev  │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 1 ms  │ 1 ms │ 0.14 ms │ 0.4 ms │ 17 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
│ Req/Sec   │ 8,759   │ 8,759   │ 15,159  │ 15,775  │ 14,728.4 │ 1,488.61 │ 8,757   │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
│ Bytes/Sec │ 2.52 MB │ 2.52 MB │ 4.37 MB │ 4.55 MB │ 4.24 MB  │ 429 kB   │ 2.52 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴──────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

295k requests in 20.01s, 84.8 MB read
```

**Clinic Doctor Report**:

Summary:
Note: The following summary is manually created and may not be fully accurate.

- CPU Usage: 100% - 102%
- Memory Usage: 100MB - 103MB

[Detail report here](./public/2025-04-12T07:11:20.387Z.clinic-doctor.html)

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
