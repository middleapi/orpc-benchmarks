# oRPC Type-Check Benchmark

- Evaluates TypeScript type-checking performance on a project with **3,000 procedures** and **1,501 routers**.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect oRPC's performance without external influences.
- Comparable to the other benchmarks in the `typecheck` group: [typecheck-orpc](../typecheck-orpc), [typecheck-trpc](../typecheck-trpc).

## How to run

```bash
pnpm bench
```

## Latest Result

oRPC 2.0.0-beta.37, TypeScript 7.0.2 - 2026-09-19

```bash
Files:             1322
Lines:            46827
Identifiers:      86828
Symbols:         764165
Types:           451038
Instantiations: 2198304
Memory used:    468930K
Memory allocs:  5073891
Config time:     0.004s
Parse time:      0.084s
Bind time:       0.026s
Check time:      1.503s
Emit time:       0.002s
Total time:      1.620s
```

Run on:

```bash
CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 cores)
Memory: 7238 MB
OS: Linux 7.0.0-29-generic x64
Node: 24.18.1
pnpm: 11.17.0
```
