# Hono OpenAPI Runtime Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates the performance of Hono's runtime on a project with **6 routes** matching the procedures in [openapi-orpc](../openapi-orpc). Every route is exposed as a RESTful `GET` endpoint that reads its input from query parameters.

Each route uses a pass-through `hono/validator`, mirroring the no-op Standard Schema used in the oRPC benchmark, so the results reflect Hono's performance without external influences.

Benchmarks in the `openapi` group are comparable to each other: [openapi-orpc](../openapi-orpc), [openapi-hono](../openapi-hono).

## Benchmark Results

No results have been recorded yet.
