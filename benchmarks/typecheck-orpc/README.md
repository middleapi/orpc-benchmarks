# oRPC Type-Check Benchmark

- Evaluates TypeScript type-checking performance on a project with **3,000 procedures** and **1,501 routers**.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect oRPC's performance without external influences.
- Comparable to the other benchmarks in the `typecheck` group: [typecheck-orpc](../typecheck-orpc), [typecheck-trpc](../typecheck-trpc).

## How to run

```bash
pnpm bench
```

## Latest Result

oRPC 2.0.0-beta.22, TypeScript 7.0.2 - 2026-07-30

```bash
Files:             1316
Lines:            45799
Identifiers:      86210
Symbols:         774604
Types:           475174
Instantiations: 2470735
Memory used:    486630K
Memory allocs:  5340649
Config time:     0.004s
Parse time:      0.086s
Bind time:       0.029s
Check time:      1.981s
Emit time:       0.002s
Total time:      2.113s
```

Run on:

```bash
CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 cores)
Memory: 7237 MB
OS: Linux 7.0.0-28-generic x64
Node: 24.18.1
pnpm: 11.17.0
```
