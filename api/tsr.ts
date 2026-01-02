import { tsr as tsrest } from '@ts-rest/serverless/fetch'

export const tsr = tsrest.platformContext<{}>()
