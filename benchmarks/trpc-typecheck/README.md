# tRPC Type-Check Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates TypeScript type-checking performance on a project with 3,000 procedures and 1,501 routers.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect tRPC's performance without external influences.

## System Details

- **Platform:** Linux
- **Architecture:** x64
- **Kernel Version:** #19~24.04.1-Ubuntu SMP PREEMPT_DYNAMIC Mon Feb 17 11:51:52 UTC 2
- **Memory:** 7,755 MB
- **CPU Cores:** 8

## Benchmark Results

### tRPC 11.0.0-rc.840 - 2025-03-20T10:27:05.931Z

```bash
Time (mean ± σ):      9.976 s ±  0.263 s    [User: 15.735 s, System: 0.453 s]
Range (min … max):    9.620 s … 10.605 s    10 runs
```

### tRPC 11.0.0-rc.840 - 2025-03-20T10:29:40.223Z

```bash
Time (mean ± σ):      9.956 s ±  0.173 s    [User: 15.743 s, System: 0.435 s]
Range (min … max):    9.609 s … 10.247 s    10 runs
```
