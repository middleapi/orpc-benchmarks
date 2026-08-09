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

const router = {
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

server.listen(3000, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(
    "Listening on http://127.0.0.1:3000/nested/procedure_1?data=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D",
  );
});
