import { Config } from '@remotion/cli/config'
import { enableTailwind } from '@remotion/tailwind'

Config.overrideWebpackConfig((config) => enableTailwind(config))
