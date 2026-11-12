import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { RouterClient } from "@orpc/server";
import { WS_URL, recordingWebSocket, report } from "../../../scripts/lib/official-client.ts";
import type { router } from "../src/main.ts";

const { WebSocket, frames } = recordingWebSocket();

const client: RouterClient<typeof router> = createORPCClient(
  new RPCLink({ connect: () => new WebSocket(WS_URL) }),
);

// Two calls, so the runner can tell the request id apart from the rest of the frame.
await client.nested.procedure_1("hello world");
const result = await client.nested.procedure_1("hello world");

report({ result, frames });
