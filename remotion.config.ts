// Config for the Remotion CLI only (studio / still / render).
//
// The Next.js build resolves the "@/..." alias through its own webpack
// config; the Remotion CLI bundles separately and needs to be told about it,
// otherwise any composition importing "@/lib/..." fails to resolve.
import { Config } from '@remotion/cli/config'
import path from 'path'

Config.overrideWebpackConfig((current) => ({
  ...current,
  resolve: {
    ...current.resolve,
    alias: {
      ...(current.resolve?.alias ?? {}),
      '@': path.resolve(process.cwd()),
    },
  },
}))
