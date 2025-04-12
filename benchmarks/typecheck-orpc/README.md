# oRPC Type-Check Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates TypeScript type-checking performance on a project with 3,000 procedures and 1,501 routers.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect oRPC's performance without external influences.

## Benchmark Results

### oRPC 1.0.0-beta.2 - 2025-03-20T10:18:33.021Z

```bash
Time (mean ± σ):      6.384 s ±  0.168 s    [User: 12.308 s, System: 0.393 s]
Range (min … max):    6.161 s …  6.608 s    10 runs
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

### oRPC 1.0.0-beta.2 - 2025-03-20T10:19:57.563Z

```bash
Time (mean ± σ):      6.526 s ±  0.129 s    [User: 12.663 s, System: 0.405 s]
Range (min … max):    6.377 s …  6.854 s    10 runs
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

### oRPC 1.0.0-beta.4 - 2025-03-26T01:32:32.749Z

```bash
Time (mean ± σ):      6.001 s ±  0.119 s    [User: 11.656 s, System: 0.396 s]
Range (min … max):    5.817 s …  6.199 s    10 runs
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

### oRPC 0.0.0-next.66d4d3b - 2025-04-12T03:41:10.162Z

```bash
Time (mean ± σ):      5.937 s ±  0.079 s    [User: 11.446 s, System: 0.373 s]
Range (min … max):    5.839 s …  6.099 s    10 runs
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
