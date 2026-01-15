// Installer for openpilot and sunnypilot forks
// The repoName is determined by the subdomain (openpilot.asius.ai or sunnypilot.asius.ai)
export default {
  fetch: async (request) => {
    const url = new URL(request.url)
    const host = url.host
    const parts = url.pathname.slice(1).split('/')

    // Determine repoName from subdomain
    const repoName = host.startsWith('sunnypilot.') ? 'sunnypilot' : 'openpilot'

    // Format: /userName/branch
    const userName = parts[0] || 'asiusai'
    const branch = parts[1] || 'master'

    // For openpilot, forward directly to comma
    if (repoName === 'openpilot') {
      return fetch('https://installer.comma.ai/' + userName + '/' + branch, request)
    }

    // For sunnypilot, fetch comma's binary and replace the repo name
    const response = await fetch('https://installer.comma.ai/' + userName + '/' + branch, {
      headers: request.headers,
    })

    if (!response.ok) {
      return response
    }

    const buffer = await response.arrayBuffer()
    const arr = new Uint8Array(buffer)

    // Find and replace "openpilot.git?" with "sunnypilot.git?" (padded with spaces)
    const searchStr = 'openpilot.git?'
    const replaceStr = (repoName + '.git?').padEnd(searchStr.length, ' ')
    const encoder = new TextEncoder()
    const searchBytes = encoder.encode(searchStr)
    const replaceBytes = encoder.encode(replaceStr)

    outer: for (let i = 0; i <= arr.length - searchBytes.length; i++) {
      for (let j = 0; j < searchBytes.length; j++) {
        if (arr[i + j] !== searchBytes[j]) continue outer
      }
      for (let j = 0; j < replaceBytes.length; j++) {
        arr[i + j] = replaceBytes[j]
      }
      break
    }

    return new Response(arr.buffer, { headers: response.headers })
  },
}
