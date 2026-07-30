import { initTRPC } from "@trpc/server";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import SuperJSON from "superjson";
import { WebSocketServer } from "ws";

const t = initTRPC.create({
  transformer: SuperJSON,
});

const schema = {
  "~standard": {
    vendor: "custom",
    validate: (value: any) => ({ value }),
    version: 1,
  },
} as const;

export const router = t.router({
  procedure_1: t.procedure
    .input(schema)
    .query(({ input }) => ({ name: "procedure_1", date: new Date(), input })),
  procedure_2: t.procedure
    .input(schema)
    .mutation(({ input }) => ({ name: "procedure_2", date: new Date(), input })),
  nested: t.router({
    procedure_1: t.procedure
      .input(schema)
      .query(({ input }) => ({ name: "nested/procedure_1", date: new Date(), input })),
    procedure_2: t.procedure
      .input(schema)
      .mutation(({ input }) => ({ name: "nested/procedure_2", date: new Date(), input })),
    nested: t.router({
      procedure_1: t.procedure
        .input(schema)
        .query(({ input }) => ({ name: "nested/nested/procedure_1", date: new Date(), input })),
      procedure_2: t.procedure
        .input(schema)
        .mutation(({ input }) => ({ name: "nested/nested/procedure_2", date: new Date(), input })),
    }),
  }),
});

const wss = new WebSocketServer({ host: "127.0.0.1", port: 3000 });

applyWSSHandler({
  wss,
  router,
  createContext() {
    return {};
  },
});

wss.on("listening", () => {
  // eslint-disable-next-line no-console
  console.log("Listening on ws://127.0.0.1:3000");
});
