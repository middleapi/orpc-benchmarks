import { createTRPCClient, createWSClient, wsLink } from "@trpc/client";
import SuperJSON from "superjson";
import type { router } from "../src/main.ts";

const URL = `ws://127.0.0.1:${process.env.PORT ?? "3000"}`;
const CONNECTIONS = 10;
const DURATION_MS = 20_000;

function createClient() {
  const wsClient = createWSClient({ url: URL });

  return createTRPCClient<typeof router>({
    links: [wsLink({ client: wsClient, transformer: SuperJSON })],
  });
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
}

function printSummary(latencies: number[], perSecond: number[], elapsedSeconds: number): void {
  const sorted = [...latencies].sort((a, b) => a - b);
  const total = latencies.length;
  const avg = latencies.reduce((a, b) => a + b, 0) / total;
  const stdev = Math.sqrt(latencies.reduce((a, b) => a + (b - avg) ** 2, 0) / total);
  const rpsAvg = perSecond.reduce((a, b) => a + b, 0) / perSecond.length;
  const rpsStdev = Math.sqrt(
    perSecond.reduce((a, b) => a + (b - rpsAvg) ** 2, 0) / perSecond.length,
  );

  const ms = (value: number) => `${value.toFixed(2)} ms`;
  const int = (value: number) => Math.round(value).toLocaleString("en-US");

  // eslint-disable-next-line no-console
  console.log(
    [
      `Latency: avg=${ms(avg)} stdev=${ms(stdev)} p50=${ms(percentile(sorted, 50))} p97.5=${ms(percentile(sorted, 97.5))} p99=${ms(percentile(sorted, 99))} max=${ms(sorted[sorted.length - 1] ?? 0)}`,
      `Req/Sec: avg=${int(rpsAvg)} stdev=${int(rpsStdev)} min=${int(Math.min(...perSecond))} max=${int(Math.max(...perSecond))}`,
      "",
      `${int(total)} requests in ${elapsedSeconds.toFixed(2)}s`,
    ].join("\n"),
  );
}

const clients = Array.from({ length: CONNECTIONS }, () => createClient());

const latencies: number[] = [];
const perSecond = new Array(Math.ceil(DURATION_MS / 1000)).fill(0);

// eslint-disable-next-line no-console
console.log(`Running ${DURATION_MS / 1000}s WebSocket test @ ${URL}\n${CONNECTIONS} connections\n`);

const start = performance.now();
const end = start + DURATION_MS;

await Promise.all(
  clients.map(async (client) => {
    while (performance.now() < end) {
      const began = performance.now();
      await client.nested.procedure_1.query("hello world");
      const finished = performance.now();
      latencies.push(finished - began);
      perSecond[Math.min(perSecond.length - 1, Math.floor((finished - start) / 1000))]++;
    }
  }),
);

printSummary(latencies, perSecond, (performance.now() - start) / 1000);
process.exit(0);
