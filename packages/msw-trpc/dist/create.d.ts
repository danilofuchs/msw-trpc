import { AnyTRPCRouter } from '@trpc/server'
import { MswTrpc, TRPCMswConfig } from './types.js'
declare const createTRPCMsw: <Router extends AnyTRPCRouter>(config: TRPCMswConfig) => MswTrpc<Router>
export default createTRPCMsw
