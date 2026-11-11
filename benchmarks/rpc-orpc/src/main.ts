import { createServer } from "node:http";
import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/node";

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

const handler = new RPCHandler(router, {
  allowMethods: ["GET"],
});

const server = createServer(async (req, res) => {
  const { matched } = await handler.handle(req, res);

  if (!matched) {
    res.statusCode = 404;
    res.end("Not Found");
  }
});

const port = Number(process.env.PORT ?? 3000);

server.listen(port, "127.0.0.1", () => {
  console.log(
    `Listening on http://127.0.0.1:${port}/nested/procedure_1?data=%7B%22json%22%3A%22hello+world%22%7D`,
  );
});
