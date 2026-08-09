# oRPC Type-Check Benchmark

- Evaluates TypeScript type-checking performance on a project with **3,000 procedures** and **1,501 routers**.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect oRPC's performance without external influences.
- Comparable to the other benchmarks in the `typecheck` group: [typecheck-orpc](../typecheck-orpc), [typecheck-trpc](../typecheck-trpc).

## How to run

```bash
pnpm bench
```

## Latest Result

oRPC 2.0.0-beta.26, TypeScript 7.0.2 - 2026-08-09

```bash
Files:             1316
Lines:            46472
Identifiers:      86527
Symbols:         774643
Types:           475166
Instantiations: 2470731
Memory used:    486854K
Memory allocs:  5340338
Config time:     0.014s
Parse time:      0.108s
Bind time:       0.033s
Check time:      1.794s
Emit time:       0.009s
Total time:      1.964s
```

Run on:

```bash
CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 cores)
Memory: 7238 MB
OS: Linux 7.0.0-29-generic x64
Node: 24.18.1
pnpm: 11.17.0
```
