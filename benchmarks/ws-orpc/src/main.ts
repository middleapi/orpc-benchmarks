import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/websocket";
import { WebSocketServer } from "ws";

const schema = {
  "~standard": {
    vendor: "custom",
    validate: (value: any) => ({ value }),
    version: 1,
  },
} as const;

export const router = {
  procedure_1: os
    .input(schema)
    .handler(({ input }) => ({ name: "procedure_1", date: new Date(), input })),
  procedure_2: os
    .input(schema)
    .handler(({ input }) => ({ name: "procedure_2", date: new Date(), input })),
  nested: {
    procedure_1: os.input(schema).handler(({ input }) => ({
      name: "nested/procedure_1",
      date: new Date(),
      input,
    })),
    procedure_2: os.input(schema).handler(({ input }) => ({
      name: "nested/procedure_2",
      date: new Date(),
      input,
    })),
    nested: {
      procedure_1: os.input(schema).handler(({ input }) => ({
        name: "nested/nested/procedure_1",
        date: new Date(),
        input,
      })),
      procedure_2: os.input(schema).handler(({ input }) => ({
        name: "nested/nested/procedure_2",
        date: new Date(),
        input,
      })),
    },
  },
};

const handler = new RPCHandler(router);

const wss = new WebSocketServer({ host: "127.0.0.1", port: 3000 });

wss.on("connection", (ws) => {
  handler.upgrade(ws);
});

wss.on("listening", () => {
  // eslint-disable-next-line no-console
  console.log("Listening on ws://127.0.0.1:3000");
});
