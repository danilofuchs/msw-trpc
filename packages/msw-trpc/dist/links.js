export const createWSClient = ({ url }) => ({
    url,
});
export const wsLink = (arg) => {
    return () => ({
        type: 'ws',
        url: arg.client.url,
    });
};
export const httpLink = (args) => {
    return () => ({
        type: 'http',
        url: args.url,
    });
};
export const splitLink = (opts) => {
    /*   const yes = Array.isArray(opts.true) ? opts.true : [opts.true]
    const no = Array.isArray(opts.false) ? opts.false : [opts.false] */
    return ((op) => {
        const link = opts.condition(op) ? opts.true : opts.false;
        return link();
    });
};
//# sourceMappingURL=links.js.map