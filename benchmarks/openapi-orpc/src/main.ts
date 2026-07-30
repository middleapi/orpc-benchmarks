import { createServer } from "node:http";
import { openapi } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { os } from "@orpc/server";

const schema = {
  "~standard": {
    vendor: "custom",
    validate: (value: any) => ({ value }),
    version: 1,
  },
} as const;

const router = {
  procedure_1: os
    .meta(openapi({ method: "GET", path: "/procedure_1" }))
    .input(schema)
    .handler(({ input }) => ({ name: "procedure_1", date: new Date(), input })),
  procedure_2: os
    .meta(openapi({ method: "GET", path: "/procedure_2" }))
    .input(schema)
    .handler(({ input }) => ({ name: "procedure_2", date: new Date(), input })),
  nested: {
    procedure_1: os
      .meta(openapi({ method: "GET", path: "/nested/procedure_1" }))
      .input(schema)
      .handler(({ input }) => ({
        name: "nested/procedure_1",
        date: new Date(),
        input,
      })),
    procedure_2: os
      .meta(openapi({ method: "GET", path: "/nested/procedure_2" }))
      .input(schema)
      .handler(({ input }) => ({
        name: "nested/procedure_2",
        date: new Date(),
        input,
      })),
    nested: {
      procedure_1: os
        .meta(openapi({ method: "GET", path: "/nested/nested/procedure_1" }))
        .input(schema)
        .handler(({ input }) => ({
          name: "nested/nested/procedure_1",
          date: new Date(),
          input,
        })),
      procedure_2: os
        .meta(openapi({ method: "GET", path: "/nested/nested/procedure_2" }))
        .input(schema)
        .handler(({ input }) => ({
          name: "nested/nested/procedure_2",
          date: new Date(),
          input,
        })),
    },
  },
};

const handler = new OpenAPIHandler(router);

const server = createServer(async (req, res) => {
  const { matched } = await handler.handle(req, res);

  if (!matched) {
    res.statusCode = 404;
    res.end("Not Found");
  }
});

server.listen(3000, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log("Listening on http://127.0.0.1:3000/nested/procedure_1?who=hello%20world");
});
