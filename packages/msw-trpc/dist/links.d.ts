import { Operation } from '@trpc/client';
type LinkType = 'http';
export type Link = (op?: Pick<Operation, 'type' | 'path'>) => {
    type: LinkType;
    url: string;
    methodOverride?: 'POST';
};
export declare const httpLink: <T extends {
    url: string;
    methodOverride?: "POST";
}>(args: T) => Link;
export declare const splitLink: (opts: {
    condition: (args: Pick<Operation, "type" | "path">) => boolean;
    true: Link;
    false: Link;
}) => Link;
export {};
