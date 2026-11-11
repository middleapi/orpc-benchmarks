// Guards the benchmark: each line below must be a type error. If inference ever fell back to `any`,
// they would stop being errors and tsc would fail instead of looking fast.
import { client } from "./client";
import { procedure, type Schema } from "./trpc";

// @ts-expect-error the input is { who: string }
await client.router_0.procedure_1.query({ who: 1 });
// @ts-expect-error the output is a string
export const output: number = await client.router_499.nested.nested.procedure_1.query({
  who: "world",
});

procedure.input({} as Schema<{ who: string }, { who: string }>).query(({ input }) => {
  // @ts-expect-error the handler input is { who: string }
  const who: number = input.who;
  return who;
});
