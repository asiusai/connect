export const SyntaxHighlightedJson = ({ json }: { json: string }) => {
  if (!json) return null

  const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g

  const elements = []
  let lastIndex = 0
  let match: RegExpExecArray | null = regex.exec(json)
  let key = 0

  while (match !== null) {
    if (match.index > lastIndex) {
      elements.push(<span key={key++}>{json.substring(lastIndex, match.index)}</span>)
    }

    const part = match[0]
    let cls = 'text-green-300'
    if (/^"/.test(part)) {
      if (/:$/.test(part)) {
        cls = 'text-purple-300'
      }
    } else if (/true|false/.test(part)) {
      cls = 'text-red-300'
    } else if (/null/.test(part)) {
      cls = 'text-gray-500'
    } else {
      cls = 'text-orange-300'
    }

    elements.push(
      <span key={key++} className={cls}>
        {part}
      </span>,
    )
    lastIndex = regex.lastIndex
    match = regex.exec(json)
  }

  if (lastIndex < json.length) {
    elements.push(<span key={key++}>{json.substring(lastIndex)}</span>)
  }

  return <>{elements}</>
}
