import { useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { Button } from '../components/Button'

export const ErrorPage = () => {
  const error = useRouteError()
  console.error(error)

  let errorMessage: string
  let errorTitle: string

  if (isRouteErrorResponse(error)) {
    // page threw an expected response (e.g. 404)
    errorTitle = `${error.status} ${error.statusText}`
    errorMessage = error.data?.message || 'Something went wrong.'
  } else if (error instanceof Error) {
    // component threw an error
    errorTitle = 'Unexpected Application Error'
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorTitle = 'Unexpected Application Error'
    errorMessage = error
  } else {
    errorTitle = 'Unexpected Application Error'
    errorMessage = String(error) ?? 'Unknown error'
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <h1 className="text-4xl font-bold text-foreground">{errorTitle}</h1>
      <p className="text-lg text-muted-foreground">{errorMessage}</p>
      <div className="flex gap-2">
        <Button href="/" color="primary">
          Go Home
        </Button>
        <Button color="secondary" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </div>
      {(error instanceof Error || typeof error === 'object') && (
        <div className="mt-8 w-full max-w-2xl overflow-hidden rounded-lg bg-background-alt p-4 text-left">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Error Details:</p>
          <pre className="overflow-auto text-xs text-red-400">{error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
