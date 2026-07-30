# oRPC RPC Runtime Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates the performance of oRPC's RPC runtime on a project with **6 procedures** and **3 routers**.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect oRPC's performance without external influences.

Benchmarks in the `rpc` group are comparable to each other: [rpc-orpc](../rpc-orpc), [rpc-trpc](../rpc-trpc).

Each run profiles the server with [0x](https://github.com/davidmarkclements/0x) and overwrites the flamegraph at [public/flamegraph.html](./public/flamegraph.html).

## Benchmark Results

### oRPC 2.0.0-beta.22 - 2026-07-30

```bash
Running 20s test @ http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D
10 connections

┌─────────┬──────┬──────┬───────┬──────┬────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg    │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼────────┼─────────┼───────┤
│ Latency │ 0 ms │ 0 ms │ 2 ms  │ 2 ms │ 0.3 ms │ 0.98 ms │ 74 ms │
└─────────┴──────┴──────┴───────┴──────┴────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬────────┬─────────┬──────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%    │ 97.5%   │ Avg      │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼────────┼─────────┼──────────┼──────────┼─────────┤
│ Req/Sec   │ 7,127   │ 7,127   │ 11,623 │ 14,295  │ 11,357.6 │ 1,635.67 │ 7,125   │
├───────────┼─────────┼─────────┼────────┼─────────┼──────────┼──────────┼─────────┤
│ Bytes/Sec │ 1.96 MB │ 1.96 MB │ 3.2 MB │ 3.93 MB │ 3.12 MB  │ 450 kB   │ 1.96 MB │
└───────────┴─────────┴─────────┴────────┴─────────┴──────────┴──────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

227k requests in 20.02s, 62.5 MB read
```

**Flamegraph**: [public/flamegraph.html](./public/flamegraph.html)

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
