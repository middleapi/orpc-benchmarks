import { createTRPCClient, httpLink } from "@trpc/client";
import SuperJSON from "superjson";
import { ORIGIN, recordingFetch, report } from "../../../scripts/lib/official-client.ts";
import type { router } from "../src/main.ts";

const { fetch, requests } = recordingFetch();

const client = createTRPCClient<typeof router>({
  links: [httpLink({ url: ORIGIN, fetch, transformer: SuperJSON })],
});

const result = await client.nested.procedure_1.query("hello world");

report({ result, requests });
