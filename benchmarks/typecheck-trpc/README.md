# tRPC Type-Check Benchmark

- Evaluates TypeScript type-checking performance on a project with **3,000 procedures** and **1,501 routers**.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect tRPC's performance without external influences.
- Comparable to the other benchmarks in the `typecheck` group: [typecheck-orpc](../typecheck-orpc), [typecheck-trpc](../typecheck-trpc).

## How to run

```bash
pnpm bench
```

## Latest Result

tRPC 11.18.0, TypeScript 7.0.2 - 2026-08-09

```bash
Files:             1238
Lines:            87773
Identifiers:     123630
Symbols:         964945
Types:           748000
Instantiations: 2719560
Memory used:    676812K
Memory allocs:  7343004
Config time:     0.004s
Parse time:      0.115s
Bind time:       0.053s
Check time:      2.284s
Emit time:       0.002s
Total time:      2.470s
```

Run on:

```bash
CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 cores)
Memory: 7238 MB
OS: Linux 7.0.0-29-generic x64
Node: 24.18.1
pnpm: 11.17.0
```
