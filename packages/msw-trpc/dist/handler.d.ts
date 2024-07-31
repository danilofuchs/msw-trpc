import { TRPCMswConfig } from './types.js'
export declare const trpc: {
  query: (
    path: string,
    handler: Function,
    opts: TRPCMswConfig
  ) =>
    | import('msw').HttpHandler
    | {
        handler: import('msw').WebSocketHandler
        trigger: (input: unknown, wait?: number) => Promise<void>
      }
  mutation: (
    path: string,
    handler: Function,
    opts: TRPCMswConfig
  ) =>
    | import('msw').HttpHandler
    | {
        handler: import('msw').WebSocketHandler
        trigger: (input: unknown, wait?: number) => Promise<void>
      }
  subscription: (
    path: string,
    handler: Function | undefined,
    opts: TRPCMswConfig
  ) =>
    | import('msw').HttpHandler
    | {
        handler: import('msw').WebSocketHandler
        trigger: (input: unknown, wait?: number) => Promise<void>
      }
}
