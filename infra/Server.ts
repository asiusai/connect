import * as cloudflare from '@pulumi/cloudflare'
import * as pulumi from '@pulumi/pulumi'
import * as hcloud from '@pulumi/hcloud'
import * as command from '@pulumi/command'
import { getSubdomain } from './Site'

const RSYNC_EXCLUDES = ['.env*', 'node_modules', 'dist', '.git', 'openpilot', 'sunnypilot', '.turbo', '.next', 'connect-data', 'screenshots']

type ServiceArgs = Record<string, Record<string, string | string[] | { [key: string]: pulumi.Input<string> }>>
type ServerArgs = {
  allowedPorts: string[]
  sshKeyId: pulumi.Input<string>
  sshPrivateKey: pulumi.Input<string>
  serverType: string
  domain?: {
    name: string
    zoneId: string
    proxied?: boolean
  }
  createScript: pulumi.Input<string>
  deployScript: pulumi.Input<string>
  services: { name: string; service: ServiceArgs; check?: string; trigger: any }[]
}

const generateService = (service: ServiceArgs): pulumi.Output<string> => {
  const lines: pulumi.Input<string>[] = Object.entries(service).flatMap(([category, entries]) => [
    `[${category}]`,
    ...Object.entries(entries).flatMap(([key, value]): pulumi.Input<string>[] =>
      typeof value === 'string'
        ? [`${key}=${value}`]
        : Array.isArray(value)
          ? value.map((v) => `${key}=${v}`)
          : Object.entries(value).map(([k, v]) =>
              // For multiline values (like SSH keys), escape newlines for systemd
              pulumi
                .output(v)
                .apply((val) => {
                  const escaped = val.includes('\n') ? `"${val.replace(/\n/g, '\\n')}"` : val
                  return `${key}=${k}=${escaped}`
                }),
            ),
    ),
    '',
  ])
  return pulumi.all(lines).apply((l) => l.join('\n'))
}

export class Server extends pulumi.ComponentResource {
  public readonly ipv4: pulumi.Output<string>
  public readonly ipv6: pulumi.Output<string>
  public readonly domain?: string
  public readonly services?: string[]

  constructor(name: string, args: ServerArgs, opts?: pulumi.ComponentResourceOptions) {
    super('asius:hetzner:Server', name, {}, opts)

    const firewall = new hcloud.Firewall(
      `${name}-firewall`,
      {
        rules: args.allowedPorts.map((port) => ({ direction: 'in', protocol: 'tcp', port, sourceIps: ['0.0.0.0/0', '::/0'] })),
      },
      { parent: this },
    )

    const server = new hcloud.Server(
      `${name}-server`,
      {
        serverType: args.serverType,
        image: 'ubuntu-24.04',
        location: 'nbg1',
        sshKeys: [args.sshKeyId],
        firewallIds: [firewall.id.apply((id) => parseInt(id, 10))],
      },
      { parent: this },
    )

    this.domain = args.domain?.name
    this.ipv4 = server.ipv4Address
    this.ipv6 = server.ipv6Address
    this.services = args.services.map((x) => x.name)

    if (args.domain) {
      new cloudflare.DnsRecord(
        `${name}-dns`,
        {
          zoneId: args.domain.zoneId,
          name: getSubdomain(args.domain.name),
          type: 'A',
          content: server.ipv4Address,
          proxied: args.domain.proxied,
          ttl: 1,
        },
        { parent: this },
      )
    }

    const connection = {
      host: server.ipv4Address,
      user: 'root',
      privateKey: args.sshPrivateKey,
    }
    const setup = new command.remote.Command(
      `${name}-setup`,
      {
        connection,
        create: args.createScript,
        triggers: [server.id],
      },
      { dependsOn: [server], parent: this },
    )

    const excludes = RSYNC_EXCLUDES.map((e) => `--exclude='${e}'`).join(' ')

    // Rsync repo to server and run deploy script
    const deploy = new command.local.Command(
      `${name}-deploy`,
      {
        create: pulumi.interpolate`
KEY=$(mktemp) && echo '${args.sshPrivateKey}' > $KEY && chmod 600 $KEY
rsync -avz --delete ${excludes} -e "ssh -i $KEY -o StrictHostKeyChecking=no" ../ root@${server.ipv4Address}:/app/
ssh -i $KEY -o StrictHostKeyChecking=no root@${server.ipv4Address} '${args.deployScript}'
rm -f $KEY
`,
        triggers: [Date.now()],
      },
      { parent: this, dependsOn: [setup] },
    )

    // Write systemd service files and restart services after deploy (in order)
    let prev: pulumi.Resource = deploy
    for (const service of args.services) {
      const content = generateService(service.service)
      const check = service.check ? `\ntimeout 30 bash -c '${service.check}' || (journalctl -u ${service.name} -n 20 --no-pager && exit 1)` : ''
      prev = new command.remote.Command(
        `${name}-${service.name}`,
        {
          connection,
          create: pulumi.interpolate`
cat > /etc/systemd/system/${service.name}.service << 'EOF'
${content}
EOF
systemctl daemon-reload
systemctl enable ${service.name}
systemctl restart ${service.name}${check}
`,
          triggers: [content, service.trigger],
        },
        { parent: this, dependsOn: [prev] },
      )
    }
  }
}
