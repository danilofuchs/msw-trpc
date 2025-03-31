import { AnyTRPCRouter } from '@trpc/server';
import { MswTrpc, TRPCMswConfig } from './types.js';
export declare const createTRPCMsw: <Router extends AnyTRPCRouter>(config: TRPCMswConfig) => MswTrpc<Router>;
