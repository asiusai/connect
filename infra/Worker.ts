import * as cloudflare from '@pulumi/cloudflare'
import * as pulumi from '@pulumi/pulumi'
import { readFileSync } from 'fs'
import { join } from 'path'

type WorkerArgs = {
  accountId: string
  zoneId: string
  domain: string
  file: string
  env?: Record<string, string>
}

export class Worker extends pulumi.ComponentResource {
  constructor(name: string, args: WorkerArgs, opts?: pulumi.ComponentResourceOptions) {
    super('asius:cloudflare:Worker', name, {}, opts)

    const parts = args.domain.split('.')
    const subdomain = parts.length > 2 ? parts[0] : '@'
    const content = readFileSync(join(__dirname, args.file), 'utf-8')
    const bindings = args.env ? Object.entries(args.env).map(([name, text]) => ({ name, type: 'plain_text', text })) : undefined

    const worker = new cloudflare.WorkersScript(
      name,
      {
        accountId: args.accountId,
        scriptName: subdomain,
        mainModule: 'index.js',
        content,
        bindings,
      },
      { parent: this },
    )

    new cloudflare.DnsRecord(
      `${name}-dns`,
      {
        zoneId: args.zoneId,
        name: subdomain,
        type: 'AAAA',
        content: '100::',
        proxied: true,
        ttl: 1,
      },
      { parent: this },
    )

    new cloudflare.WorkersRoute(
      `${name}-route`,
      {
        zoneId: args.zoneId,
        pattern: `${args.domain}/*`,
        script: worker.scriptName,
      },
      { parent: this },
    )
  }
}
