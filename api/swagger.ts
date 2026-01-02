import { generateOpenApi } from '@ts-rest/open-api'
import { contract } from '../connect/src/api/contract'

export const openApiDoc = generateOpenApi(contract, { info: { title: 'Asius API', version: '1.0.0' } }, { setOperationId: 'concatenated-path' })

export const swaggerHtml = `<!DOCTYPE html>
<html><head>
<title>Asius API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui' })</script>
</body></html>`
