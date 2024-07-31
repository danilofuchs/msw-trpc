import { http, HttpResponse, ws } from 'msw';
import { TRPCError, getTRPCErrorFromUnknown } from '@trpc/server';
import { TRPC_ERROR_CODES_BY_KEY, defaultTransformer, getHTTPStatusCodeFromError, } from '@trpc/server/unstable-core-do-not-import';
import { observable } from '@trpc/server/observable';
const getQueryInput = (req, transformer) => {
    const inputString = new URL(req.url).searchParams.get('input');
    if (inputString == null)
        return inputString;
    return transformer.input.deserialize(JSON.parse(inputString));
};
const getMutationInput = async (req, transformer) => {
    const body = await req.json();
    return transformer.input.deserialize(body);
};
const getSerializedTrpcError = (e, path, transformer = defaultTransformer) => {
    const error = getTRPCErrorFromUnknown(e);
    const jsonError = {
        message: error.message,
        code: TRPC_ERROR_CODES_BY_KEY[error.code],
        data: {
            code: error.code,
            httpStatus: getHTTPStatusCodeFromError(error),
            path,
            stack: error.stack,
        },
    };
    return transformer.output.serialize(jsonError);
};
const wsLinks = new Map();
const createTrpcHandler = (procedureType, path, handler, { links, transformer = defaultTransformer, }) => {
    const [link] = links;
    if (!link) {
        throw new Error('No link provided');
    }
    else if (links.length > 1) {
        throw new Error('Only a single link is supported');
    }
    const { type: handlerType, url } = link({ type: procedureType, path });
    if (!handler && (procedureType === 'query' || procedureType === 'mutation')) {
        throw new Error('Handler is required for query and mutation procedures');
    }
    if (handlerType === 'http') {
        if (procedureType === 'query' || procedureType === 'mutation') {
            const getInput = procedureType === 'query' ? getQueryInput : getMutationInput;
            const httpHandler = procedureType === 'query' ? http.get : http.post;
            const urlRegex = new RegExp(`${url}/${path.replace('.', '[/.|.]')}$`);
            return httpHandler(urlRegex, async (params) => {
                try {
                    const input = await getInput(params.request, transformer);
                    const body = await handler(input); // TS doesn't seem to understand that handler is defined here, despite the check above
                    return HttpResponse.json({ result: { data: transformer.output.serialize(body) } });
                }
                catch (e) {
                    if (!(e instanceof Error)) {
                        throw e;
                    }
                    if (!('code' in e)) {
                        throw e;
                    }
                    const status = getHTTPStatusCodeFromError(e);
                    const { name: _, ...otherErrorData } = e;
                    const jsonError = {
                        message: e.message,
                        code: TRPC_ERROR_CODES_BY_KEY[e.code],
                        data: { ...otherErrorData, code: e.code, httpStatus: status, path },
                    };
                    return HttpResponse.json({ error: transformer.output.serialize(jsonError) }, { status });
                }
            });
        }
        throw new Error('Subscriptions require a WebSocket link (wsLink)');
    }
    else if (handlerType === 'ws') {
        const wsLink = wsLinks.get(url) ?? wsLinks.set(url, ws.link(url)).get(url);
        const clients = new Map();
        let innerTrigger;
        return {
            handler: wsLink.on('connection', ({ client }) => {
                if (!clients.has(client.id)) {
                    clients.set(client.id, new Map());
                }
                const clientSubscriptions = clients.get(client.id);
                client.addEventListener('message', async (event) => {
                    // @ts-ignore Wrong type for event ?
                    const message = JSON.parse(event.data.toString());
                    try {
                        if (message.params.path === path) {
                            const input = transformer.input.deserialize(message.params.input);
                            if (message.method === 'subscription') {
                                // Default to an observable that does nothing, in case we want a subscription that only sends data on trigger
                                const obs = handler?.(input) ?? observable(() => { });
                                const sub = obs.subscribe({
                                    next(data) {
                                        client.send(JSON.stringify({
                                            id: message.id,
                                            jsonrpc: message.jsonrpc,
                                            result: {
                                                type: 'data',
                                                data: transformer.output.serialize(data),
                                            },
                                        }));
                                    },
                                    error(e) {
                                        client.send(JSON.stringify({
                                            id: message.id,
                                            jsonrpc: message.jsonrpc,
                                            error: getSerializedTrpcError(e, path, transformer),
                                        }));
                                    },
                                    complete() {
                                        sub.unsubscribe();
                                        client.send(JSON.stringify({
                                            id: message.id,
                                            jsonrpc: message.jsonrpc,
                                            result: {
                                                type: 'stopped',
                                            },
                                        }));
                                        clientSubscriptions.delete(message.id);
                                    },
                                });
                                // WebSocket.OPEN = 1
                                if (client.socket.readyState !== 1) {
                                    sub.unsubscribe();
                                    return;
                                }
                                if (clientSubscriptions.has(message.id)) {
                                    sub.unsubscribe();
                                    client.send(JSON.stringify({
                                        id: message.id,
                                        jsonrpc: message.jsonrpc,
                                        result: {
                                            type: 'stopped',
                                        },
                                    }));
                                    throw new TRPCError({
                                        message: `Duplicate id ${message.id}`,
                                        code: 'BAD_REQUEST',
                                    });
                                }
                                clientSubscriptions.set(message.id, sub);
                                innerTrigger = (input) => client.send(JSON.stringify({
                                    id: message.id,
                                    jsonrpc: message.jsonrpc,
                                    result: {
                                        type: 'data',
                                        data: transformer.output.serialize(input),
                                    },
                                }));
                                client.send(JSON.stringify({
                                    id: message.id,
                                    jsonrpc: message.jsonrpc,
                                    result: {
                                        type: 'started',
                                    },
                                }));
                            }
                            else {
                                const result = await handler(input); // TS doesn't seem to understand that handler is defined here, despite the check above
                                client.send(JSON.stringify({
                                    id: message.id,
                                    jsonrpc: message.jsonrpc,
                                    result: {
                                        type: 'data',
                                        data: transformer.output.serialize(result),
                                    },
                                }));
                            }
                        }
                    }
                    catch (e) {
                        client.send(JSON.stringify({
                            id: message.id,
                            jsonrpc: message.jsonrpc,
                            error: getSerializedTrpcError(e, path),
                        }));
                    }
                });
                client.addEventListener('close', () => {
                    clientSubscriptions.forEach((sub) => sub.unsubscribe());
                    clients.delete(client.id);
                }, { once: true });
            }),
            trigger: async (input, wait = 10) => {
                // Ensure the subscription is started before triggering it
                await new Promise((resolve) => setTimeout(resolve, wait));
                if (!innerTrigger) {
                    throw new Error('Subscription not started');
                }
                innerTrigger(input);
                await new Promise((resolve) => setTimeout(resolve, wait));
            },
        };
    }
    throw new Error('Unknown handler type');
};
export const trpc = {
    query: (path, handler, opts) => createTrpcHandler('query', path, handler, opts),
    mutation: (path, handler, opts) => createTrpcHandler('mutation', path, handler, opts),
    subscription: (path, handler, opts) => createTrpcHandler('subscription', path, handler, opts),
};
//# sourceMappingURL=handler.js.map