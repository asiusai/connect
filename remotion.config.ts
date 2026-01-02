import { Config, WebpackOverrideFn } from '@remotion/cli/config'
import { enableTailwind } from '@remotion/tailwind'

export const webpackOverride: WebpackOverrideFn = (config) =>
  enableTailwind({
    ...config,
    resolve: {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        path: false,
      },
    },
  })

Config.overrideWebpackConfig(webpackOverride)

Config.setExperimentalClientSideRenderingEnabled(true)
