import { http, HttpResponse } from 'msw';
import { TRPC_ERROR_CODES_BY_KEY, defaultTransformer, getHTTPStatusCodeFromError, } from '@trpc/server/unstable-core-do-not-import';
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
const createTrpcHandler = (procedureType, path, handler, { links, transformer = defaultTransformer, }) => {
    const [link] = links;
    if (!link) {
        throw new Error('No link provided');
    }
    else if (links.length > 1) {
        throw new Error('Only a single link is supported');
    }
    const { type: handlerType, url, methodOverride } = link({ type: procedureType, path });
    if (!handler && (procedureType === 'query' || procedureType === 'mutation')) {
        throw new Error('Handler is required for query and mutation procedures');
    }
    if (handlerType === 'http') {
        if (procedureType === 'query' || procedureType === 'mutation') {
            const getInput = procedureType === 'query' ? getQueryInput : getMutationInput;
            const httpHandler = procedureType === 'mutation' || methodOverride === 'POST' ? http.post : http.get;
            const urlRegex = new RegExp(`${url}/${path.replace('.', '[/.|.]')}$`);
            return httpHandler(urlRegex, async (params) => {
                try {
                    const input = await getInput(params.request, transformer);
                    const body = await handler({ input }); // TS doesn't seem to understand that handler is defined here, despite the check above
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
    }
    throw new Error('Unknown handler type');
};
export const trpc = {
    query: (path, handler, opts) => createTrpcHandler('query', path, handler, opts),
    mutation: (path, handler, opts) => createTrpcHandler('mutation', path, handler, opts),
};
//# sourceMappingURL=handler.js.map