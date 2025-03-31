import { TRPCMswConfig } from './types.js';
export declare const trpc: {
    query: (path: string, handler: Function, opts: TRPCMswConfig) => import("msw").HttpHandler;
    mutation: (path: string, handler: Function, opts: TRPCMswConfig) => import("msw").HttpHandler;
};
