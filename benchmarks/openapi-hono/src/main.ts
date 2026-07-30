import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { validator } from "hono/validator";

const passthrough = validator("query", (value: any) => value);

const app = new Hono()
  .get("/procedure_1", passthrough, (c) =>
    c.json({ name: "procedure_1", date: new Date(), input: c.req.valid("query") }),
  )
  .get("/procedure_2", passthrough, (c) =>
    c.json({ name: "procedure_2", date: new Date(), input: c.req.valid("query") }),
  )
  .get("/nested/procedure_1", passthrough, (c) =>
    c.json({
      name: "nested/procedure_1",
      date: new Date(),
      input: c.req.valid("query"),
    }),
  )
  .get("/nested/procedure_2", passthrough, (c) =>
    c.json({
      name: "nested/procedure_2",
      date: new Date(),
      input: c.req.valid("query"),
    }),
  )
  .get("/nested/nested/procedure_1", passthrough, (c) =>
    c.json({
      name: "nested/nested/procedure_1",
      date: new Date(),
      input: c.req.valid("query"),
    }),
  )
  .get("/nested/nested/procedure_2", passthrough, (c) =>
    c.json({
      name: "nested/nested/procedure_2",
      date: new Date(),
      input: c.req.valid("query"),
    }),
  );

serve({ fetch: app.fetch, port: 3000, hostname: "127.0.0.1" }, () => {
  // eslint-disable-next-line no-console
  console.log("Listening on http://127.0.0.1:3000/nested/procedure_1?who=hello%20world");
});
