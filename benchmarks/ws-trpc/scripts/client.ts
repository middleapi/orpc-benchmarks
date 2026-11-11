import { createTRPCClient, createWSClient, wsLink } from "@trpc/client";
import SuperJSON from "superjson";
import { WS_URL, recordingWebSocket, report } from "../../../scripts/lib/official-client.ts";
import type { router } from "../src/main.ts";

const { WebSocket, frames } = recordingWebSocket();

const client = createTRPCClient<typeof router>({
  links: [wsLink({ client: createWSClient({ url: WS_URL, WebSocket }), transformer: SuperJSON })],
});

// Two calls, so the runner can tell the request id apart from the rest of the frame.
await client.nested.procedure_1.query("hello world");
const result = await client.nested.procedure_1.query("hello world");

report({ result, frames });
