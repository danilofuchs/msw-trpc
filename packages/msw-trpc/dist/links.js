export const httpLink = (args) => {
    return () => ({
        type: 'http',
        url: args.url,
        methodOverride: args.methodOverride,
    });
};
export const splitLink = (opts) => {
    return ((op) => {
        const link = opts.condition(op) ? opts.true : opts.false;
        return link();
    });
};
//# sourceMappingURL=links.js.map