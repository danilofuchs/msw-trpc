import { trpc } from './handler.js';
import { HttpHandler } from 'msw';
const createTRPCMsw = (config) => {
    const { links, transformer } = config;
    const createUntypedTRPCMsw = (pathParts = []) => {
        return new Proxy({}, {
            get(target, lastKey) {
                const procedurePath = pathParts.join('.');
                if (lastKey === 'query' || lastKey === 'mutation') {
                    return (handler) => {
                        const result = trpc[lastKey](procedurePath, handler, { links, transformer });
                        if (result instanceof HttpHandler) {
                            return result;
                        }
                        return result.handler;
                    };
                }
                else if (lastKey === 'subscription') {
                    return (handler) => {
                        const result = trpc[lastKey](procedurePath, handler, { links, transformer });
                        return result;
                    };
                }
                return createUntypedTRPCMsw([...pathParts, lastKey]);
            },
        });
    };
    return createUntypedTRPCMsw();
};
export default createTRPCMsw;
//# sourceMappingURL=create.js.map