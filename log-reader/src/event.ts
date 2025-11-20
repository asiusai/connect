import capnp from 'capnp-ts'
import { partial } from 'ap'

import * as Log from '../capnp/log.capnp'
import CapnpJSON from '@commaai/capnp-json'

export const Event = (buf: any) => {
  const msg = new capnp.Message(buf, false)
  const event = msg.getRoot(Log.Event)
  const toJSON = partial(CapnpJSON, event)
  return { msg, event, toJSON }
}
