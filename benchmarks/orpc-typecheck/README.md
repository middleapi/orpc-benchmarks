# oRPC Type-Check Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates TypeScript type-checking performance on a project with 3,000 procedures and 1,501 routers.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect oRPC's performance without external influences.

## System Details

- **Platform:** Linux
- **Architecture:** x64
- **Kernel Version:** #19~24.04.1-Ubuntu SMP PREEMPT_DYNAMIC Mon Feb 17 11:51:52 UTC 2
- **Memory:** 7,755 MB
- **CPU Cores:** 8

## Benchmark Results

### oRPC 1.0.0-beta.2 - 2025-03-20T10:18:33.021Z

```bash
Time (mean ± σ):      6.384 s ±  0.168 s    [User: 12.308 s, System: 0.393 s]
Range (min … max):    6.161 s …  6.608 s    10 runs
```

### oRPC 1.0.0-beta.2 - 2025-03-20T10:19:57.563Z

```bash
Time (mean ± σ):      6.526 s ±  0.129 s    [User: 12.663 s, System: 0.405 s]
Range (min … max):    6.377 s …  6.854 s    10 runs
```
