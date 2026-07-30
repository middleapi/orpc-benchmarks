import type { RouterClient } from "@orpc/server";
import type { router } from "./router";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

const link = new RPCLink({});

export const client: RouterClient<typeof router> = createORPCClient(link);
