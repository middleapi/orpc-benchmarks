# oRPC OpenAPI Runtime Benchmark

Run the benchmark with:

```bash
pnpm bench
```

## Overview

This benchmark evaluates the performance of oRPC's OpenAPI runtime on a project with **6 procedures** and **3 routers**. Every procedure is exposed as a RESTful `GET` endpoint that reads its input from query parameters.

We use [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod to ensure the results reflect oRPC's performance without external influences.

Benchmarks in the `openapi` group are comparable to each other: [openapi-orpc](../openapi-orpc), [openapi-hono](../openapi-hono).

## Benchmark Results

No results have been recorded yet.
