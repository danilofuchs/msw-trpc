import { Operation } from '@trpc/client'
type LinkType = 'ws' | 'http'
export type Link = (op?: Pick<Operation, 'type' | 'path'>) => {
  type: LinkType
  url: string
}
export declare const createWSClient: <
  T extends {
    url: string
  },
>({
  url,
}: T) => {
  url: string
}
export declare const wsLink: <
  T extends {
    client: {
      url: string
    }
  },
>(
  arg: T
) => Link
export declare const httpLink: <
  T extends {
    url: string
  },
>(
  args: T
) => Link
export declare const splitLink: (opts: {
  condition: (args: Pick<Operation, 'type' | 'path'>) => boolean
  true: Link
  false: Link
}) => Link
export {}
