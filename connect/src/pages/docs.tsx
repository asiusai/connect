import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { generateOpenApi } from '@ts-rest/open-api'
import { contract } from '../../../shared/contract'
import { getProviderInfo, Provider } from '../../../shared/provider'
import { useAuth } from '../hooks/useAuth'

const openApiDoc = generateOpenApi(
  contract,
  {
    info: { title: 'Asius API', version: '1.0.0' },
    servers: Provider.options
      .flatMap((provider) => [
        { url: getProviderInfo(provider).apiUrl, description: `${provider} API` },
        { url: getProviderInfo(provider).athenaUrl, description: `${provider} athena` },
        { url: getProviderInfo(provider).billingUrl, description: `${provider} billing` },
      ])
      .filter((x) => x.url),
  },
  { setOperationId: 'concatenated-path' },
)

const darkStyles = `
  .swagger-ui {
    background: #141418;
    color: #e0e0e0;
  }
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info hgroup.main { border-bottom: none; }
  .swagger-ui .scheme-container {
    background: #141418;
    box-shadow: none;
    border-bottom: 1px solid #2a2a35;
  }
  .swagger-ui .btn.execute {
    background: #4990e2;
    border-color: #4990e2;
    text-align: center;
  }
  .swagger-ui .info .title,
  .swagger-ui .opblock-tag,
  .swagger-ui .opblock .opblock-summary-operation-id,
  .swagger-ui .opblock .opblock-summary-path,
  .swagger-ui .opblock .opblock-summary-path__deprecated,
  .swagger-ui .opblock-description-wrapper p,
  .swagger-ui .opblock-external-docs-wrapper p,
  .swagger-ui .opblock-title_normal p,
  .swagger-ui table thead tr td,
  .swagger-ui table thead tr th,
  .swagger-ui .parameter__name,
  .swagger-ui .parameter__type,
  .swagger-ui .parameter__in,
  .swagger-ui .response-col_status,
  .swagger-ui .response-col_description,
  .swagger-ui label,
  .swagger-ui .btn,
  .swagger-ui select {
    color: #e0e0e0 !important;
  }
  .swagger-ui .opblock .opblock-section-header {
    background: #252530;
    box-shadow: none;
  }
  .swagger-ui .opblock .opblock-section-header h4 {
    color: #e0e0e0;
  }
  .swagger-ui .opblock-body pre.microlight {
    background: #0d0d12 !important;
    color: #e0e0e0 !important;
  }
  .swagger-ui .opblock.opblock-get {
    background: rgba(97, 175, 254, 0.1);
    border-color: #61affe;
  }
  .swagger-ui .opblock.opblock-post {
    background: rgba(73, 204, 144, 0.1);
    border-color: #49cc90;
  }
  .swagger-ui .opblock.opblock-put {
    background: rgba(252, 161, 48, 0.1);
    border-color: #fca130;
  }
  .swagger-ui .opblock.opblock-delete {
    background: rgba(249, 62, 62, 0.1);
    border-color: #f93e3e;
  }
  .swagger-ui .opblock.opblock-patch {
    background: rgba(80, 227, 194, 0.1);
    border-color: #50e3c2;
  }
  .swagger-ui section.models {
    border-color: #2a2a35;
  }
  .swagger-ui section.models .model-container {
    background: #252530;
  }
  .swagger-ui .model-box {
    background: #141418;
  }
  .swagger-ui .model {
    color: #e0e0e0;
  }
  .swagger-ui input[type=text],
  .swagger-ui textarea,
  .swagger-ui select {
    background: #252530;
    border-color: #2a2a35;
    color: #e0e0e0;
  }
  .swagger-ui .responses-inner {
    background: #141418;
  }
  .swagger-ui .response-col_links {
    color: #e0e0e0;
  }
  .swagger-ui .wrapper {
    border: none;
  }
  .swagger-ui .information-container {
    background: #141418;
  }
`

export const Component = () => {
  const { token } = useAuth()

  return (
    <>
      <style>{darkStyles}</style>
      <SwaggerUI
        spec={openApiDoc}
        tryItOutEnabled={true}
        requestInterceptor={(req: any) => {
          req.headers.authorization = `JWT ${token}`
          return req
        }}
      />
    </>
  )
}
