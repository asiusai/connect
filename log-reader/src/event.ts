import capnp from 'capnp-ts'

import * as Log from '../capnp/log.capnp'
import { toJSON } from './capnp-json'

export const Event = (buf: any) => {
  const event = new capnp.Message(buf, false).getRoot(Log.Event)

  return {
    toJSON: (struct?: any) => toJSON(event, struct),
  }
}
