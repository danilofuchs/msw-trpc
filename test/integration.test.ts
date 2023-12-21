import {
  AppRouter,
  mswTrpc,
  mswTrpcWithSuperJson,
  NestedAppRouter,
  nestedMswTrpc,
  nestedTrpc,
  trpc,
  trpcWithSuperJson,
} from './setup'

import { setupServer } from 'msw/node'
import { createTRPCMsw } from '../src'
import { TRPCError } from '@trpc/server'
import { TRPCClientError } from '@trpc/client'

type MswTrpc = typeof mswTrpc
type NestedMswTrpc = typeof nestedMswTrpc

const setupServerWithQueries = (mswTrpc: MswTrpc, nestedMswTrpc: NestedMswTrpc) => {
  return setupServer(
    mswTrpc.userById.query(() => {
      return { id: '1', name: 'Malo' }
    }),
    mswTrpc.userByIdAndPost.query(() => {
      return { id: '1', name: 'Malo', posts: ['1'] }
    }),
    mswTrpc.createUser.mutation(name => {
      return { id: '2', name }
    }),
    nestedMswTrpc.users.userById.query(() => {
      return { id: '1', name: 'Malo' }
    }),
    nestedMswTrpc.users.userByIdAndPost.query(() => {
      return { id: '1', name: 'Malo', posts: ['1'] }
    }),
    nestedMswTrpc.users.createUser.mutation(name => {
      return { id: '2', name }
    })
  )
}

describe('queries and mutations', () => {
  const server = setupServerWithQueries(mswTrpc, nestedMswTrpc)

  beforeAll(() => server.listen())

  afterAll(() => server.close())

  test('msw server setup from msw-trpc query handle should handle queries properly', async () => {
    const user = await trpc.userById.query('1')

    expect(user).toEqual({ id: '1', name: 'Malo' })
  })

  test('msw server setup from msw-trpc query handle should handle mutations properly', async () => {
    const user = await trpc.createUser.mutate('Robert')

    expect(user).toEqual({ id: '2', name: 'Robert' })
  })

  describe('nested router', () => {
    test('msw server setup from msw-trpc query handle should handle queries properly', async () => {
      const user = await nestedTrpc.users.userById.query('1')

      expect(user).toEqual({ id: '1', name: 'Malo' })
    })

    test('msw server setup from msw-trpc query handle should handle queries with same starting string properly', async () => {
      const user = await nestedTrpc.users.userByIdAndPost.query('1')

      expect(user).toEqual({ id: '1', name: 'Malo', posts: ['1'] })
    })

    test('msw server setup from msw-trpc query handle should handle mutations properly', async () => {
      const user = await nestedTrpc.users.createUser.mutate('Robert')

      expect(user).toEqual({ id: '2', name: 'Robert' })
    })
  })

  test('throwing error works', async () => {
    server.use(
      mswTrpc.userById.query(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' })
      })
    )

    let error
    try {
      await trpc.userById.query('1')
    } catch (e) {
      error = e
    }
    const clientError = error as TRPCClientError<any>

    expect(clientError).toBeInstanceOf(TRPCClientError)
    expect(clientError.message).toBe('Resource not found')
    expect(clientError.data).toEqual({
      code: 'NOT_FOUND',
      httpStatus: 404,
      path: 'userById',
    })
    expect(clientError.meta?.response).toBeInstanceOf(Response)
    expect(clientError.meta?.responseJSON).toEqual({
      error: {
        message: 'Resource not found',
        code: -32004,
        data: clientError.data,
      },
    })
    expect(clientError.shape).toEqual({
      message: 'Resource not found',
      code: -32004,
      data: clientError.data,
    })
  })

  test('throwing error with superjson works', async () => {
    server.use(
      mswTrpcWithSuperJson.userById.query(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' })
      })
    )

    let error
    try {
      await trpcWithSuperJson.userById.query('1')
    } catch (e) {
      error = e
    }
    const clientError = error as TRPCClientError<any>

    expect(clientError).toBeInstanceOf(TRPCClientError)
    expect(clientError.message).toBe('Resource not found')
    expect(clientError.data).toEqual({
      code: 'NOT_FOUND',
      httpStatus: 404,
      path: 'userById',
    })
    expect(clientError.meta?.response).toBeInstanceOf(Response)
    expect(clientError.meta?.responseJSON).toEqual({
      error: {
        json: {
          message: 'Resource not found',
          code: -32004,
          data: clientError.data,
        },
      },
    })
    expect(clientError.shape).toEqual({
      message: 'Resource not found',
      code: -32004,
      data: clientError.data,
    })
  })

  test('throwing error with nested router works', async () => {
    server.use(
      nestedMswTrpc.users.userById.query(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' })
      })
    )

    let error
    try {
      await nestedTrpc.users.userById.query('1')
    } catch (e) {
      error = e
    }
    const clientError = error as TRPCClientError<any>

    expect(clientError).toBeInstanceOf(TRPCClientError)
    expect(clientError.data).toEqual({
      code: 'NOT_FOUND',
      httpStatus: 404,
      path: 'users.userById',
    })
  })
})

describe('config', () => {
  describe('createTRCPMsw should map requests to baseUrl prop when passed', () => {
    const mswTrpc = createTRPCMsw<AppRouter>({ baseUrl: 'http://localhost:3000/trpc' })
    const nestedMswTrpc = createTRPCMsw<NestedAppRouter>({ baseUrl: 'http://localhost:3000/trpc' })

    const server = setupServerWithQueries(mswTrpc, nestedMswTrpc)

    beforeAll(() => server.listen())

    afterAll(() => server.close())

    test('msw server setup from msw-trpc query handle should handle queries properly', async () => {
      const user = await trpc.userById.query('1')

      expect(user).toEqual({ id: '1', name: 'Malo' })
    })

    test('msw server setup from msw-trpc query handle should handle mutations properly', async () => {
      const user = await trpc.createUser.mutate('Robert')

      expect(user).toEqual({ id: '2', name: 'Robert' })
    })

    describe('nested router', () => {
      test('msw server setup from msw-trpc query handle should handle queries properly', async () => {
        const user = await nestedTrpc.users.userById.query('1')

        expect(user).toEqual({ id: '1', name: 'Malo' })
      })

      test('msw server setup from msw-trpc query handle should handle queries with same starting string properly', async () => {
        const user = await nestedTrpc.users.userByIdAndPost.query('1')

        expect(user).toEqual({ id: '1', name: 'Malo', posts: ['1'] })
      })

      test('msw server setup from msw-trpc query handle should handle mutations properly', async () => {
        const user = await nestedTrpc.users.createUser.mutate('Robert')

        expect(user).toEqual({ id: '2', name: 'Robert' })
      })
    })
  })

  describe('with SuperJson transformer', () => {
    const serverWithSuperJson = setupServer(
      mswTrpcWithSuperJson.listUsers.query(users => {
        return users
      }),
      mswTrpcWithSuperJson.createFriend.mutation(async ({ name }) => {
        return { name, id: 'new-friend' }
      })
    )

    beforeAll(() => {
      serverWithSuperJson.listen()
    })

    afterAll(() => {
      serverWithSuperJson.close()
    })

    test('query should use the transformer to deserialize the input correctly and return it', async () => {
      const result = await trpcWithSuperJson.listUsers.query({ take: 3, skip: 10 })

      expect(result).toEqual({ take: 3, skip: 10 })
    })

    test('mutation should use the transformer to deserialize the input correctly and return it', async () => {
      const result = await trpcWithSuperJson.createFriend.mutate({ name: 'Jason' })

      expect(result).toEqual({ name: 'Jason', id: 'new-friend' })
    })
  })
})
