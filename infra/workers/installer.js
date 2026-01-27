export default {
  fetch: async (request) => {
    const url = new URL(request.url)
    const parts = url.pathname.slice(1).split('/')

    const userName = parts[0] || 'asiusai'
    const branch = parts[1] || 'master'

    return fetch('https://installer.comma.ai/' + userName + '/' + branch, request)
  },
}
