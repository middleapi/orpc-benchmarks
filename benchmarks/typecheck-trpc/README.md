# tRPC Type-Check Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates TypeScript type-checking performance on a project with 3,000 procedures and 1,501 routers.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect tRPC's performance without external influences.

## Benchmark Results

### tRPC 11.0.0-rc.840 - 2025-03-20T10:27:05.931Z

```bash
Time (mean ± σ):      9.976 s ±  0.263 s    [User: 15.735 s, System: 0.453 s]
Range (min … max):    9.620 s … 10.605 s    10 runs
```

Environment:

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

### tRPC 11.0.0-rc.840 - 2025-03-20T10:29:40.223Z

```bash
Time (mean ± σ):      9.956 s ±  0.173 s    [User: 15.743 s, System: 0.435 s]
Range (min … max):    9.609 s … 10.247 s    10 runs
```

Environment:

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

### tRPC 11.0.0 - 2025-03-26T01:30:22.864Z

```bash
Time (mean ± σ):      9.167 s ±  0.174 s    [User: 14.627 s, System: 0.406 s]
Range (min … max):    8.934 s …  9.472 s    10 runs
```

Environment:

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
Time (mean ± σ):      9.339 s ±  0.283 s    [User: 14.906 s, System: 0.413 s]
Range (min … max):    9.057 s … 10.025 s    10 runs
```

Environment:

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
