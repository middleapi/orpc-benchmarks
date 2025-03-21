import { initTRPC } from '@trpc/server'
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import SuperJSON from 'superjson'

const t = initTRPC.create({
  transformer: SuperJSON,
})

const schema = {
  '~standard': {
    vendor: 'custom',
    validate: (value: any) => ({ value }),
    version: 1,
  },
} as const

const router = t.router({
  procedure_1: t.procedure.input(schema).query(({ input }) => ({ name: 'procedure_1', date: new Date(), input })),
  procedure_2: t.procedure.input(schema).mutation(({ input }) => ({ name: 'procedure_2', date: new Date(), input })),
  nested: t.router({
    procedure_1: t.procedure.input(schema).query(({ input }) => ({ name: 'nested/procedure_1', date: new Date(), input })),
    procedure_2: t.procedure.input(schema).mutation(({ input }) => ({ name: 'nested/procedure_2', date: new Date(), input })),
    nested: t.router({
      procedure_1: t.procedure.input(schema).query(({ input }) => ({ name: 'nested/nested/procedure_1', date: new Date(), input })),
      procedure_2: t.procedure.input(schema).mutation(({ input }) => ({ name: 'nested/nested/procedure_2', date: new Date(), input })),
    }),
  }),
})

const server = createHTTPServer({
  router,
  createContext() {
    return {}
  },
})

server.listen(3000, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log('Listening on http://127.0.0.1:3000/nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%2C%22meta%22%3A%5B%5D%7D')
})
