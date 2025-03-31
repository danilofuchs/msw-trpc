import { trpc } from './handler.js';
export const createTRPCMsw = (config) => {
    const { links, transformer } = config;
    const createUntypedTRPCMsw = (pathParts = []) => {
        return new Proxy({}, {
            get(target, lastKey) {
                const procedurePath = pathParts.join('.');
                if (lastKey === 'query' || lastKey === 'mutation') {
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
//# sourceMappingURL=create.js.map