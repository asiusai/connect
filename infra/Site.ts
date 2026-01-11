import * as cloudflare from '@pulumi/cloudflare'
import * as pulumi from '@pulumi/pulumi'

type SiteArgs = {
  accountId: string
  zoneId: string
  rootDir?: string
  buildCommand: string
  domain: string
}

export class Site extends pulumi.ComponentResource {
  constructor(name: string, args: SiteArgs, opts?: pulumi.ComponentResourceOptions) {
    super('asius:cloudflare:Site', name, {}, opts)


    const envVars = { SKIP_DEPENDENCY_INSTALL: { type: 'plain_text', value: 'true' } }
    const project = new cloudflare.PagesProject(
      name,
      {
        accountId: args.accountId,
        name,
        productionBranch: 'master',
        buildConfig: {
          rootDir: args.rootDir,
          buildCommand: args.buildCommand,
          destinationDir: 'dist',
        },
        deploymentConfigs: { production: { envVars }, preview: { envVars } },
        source: {
          type: 'github',
          config: { owner: 'asiusai', repoName: 'asiusai', prCommentsEnabled: true },
        },
      },
      { parent: this },
    )

    new cloudflare.PagesDomain(
      `${name}-domain`,
      {
        accountId: args.accountId,
        projectName: project.name,
        name: args.domain,
      },
      { parent: this },
    )

    const parts = args.domain.split('.')
    new cloudflare.DnsRecord(
      `${name}-dns`,
      {
        zoneId: args.zoneId,
        name: parts.length > 2 ? parts[0] : '@',
        type: 'CNAME',
        content: `${name}.pages.dev`,
        proxied: true,
        ttl: 1,
      },
      { parent: this },
    )
  }
}
