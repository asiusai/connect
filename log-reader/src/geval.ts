type Message = any

export class ListItem {
  constructor(
    public fn: (v: Message) => void,
    public deleted = false,
  ) {}
}

export const Event = () => {
  const listeners: ListItem[] = []

  const broadcast = (value: Message) => {
    let listenersCopy = listeners.slice()
    for (let i = 0; i < listenersCopy.length; i++) {
      if (!listenersCopy[i].deleted) {
        listenersCopy[i].fn(value)
      }
    }
  }

  const listen = (listener: any) => {
    listeners.push(new ListItem(listener))

    return removeListener

    function removeListener() {
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i].fn === listener) {
          listeners[i].deleted = true
          listeners.splice(i, 1)
          break
        }
      }
    }
  }
  return { broadcast, listen }
}
