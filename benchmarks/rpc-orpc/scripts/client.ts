import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { ORIGIN, recordingFetch, report } from "../../../scripts/lib/official-client.ts";
import type { router } from "../src/main.ts";

const { fetch, requests } = recordingFetch();

const client: RouterClient<typeof router> = createORPCClient(
  new RPCLink({ origin: ORIGIN, method: "GET", fetch }),
);

const result = await client.nested.procedure_1("hello world");

report({ result, requests });
