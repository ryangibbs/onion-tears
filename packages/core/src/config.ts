import type { Config } from './types.js'

export function getDefaultConfiguration(): Config {
  return {
    cyclomaticWarning: 10,
    cyclomaticError: 20,
  }
}

export function createConfiguration(overrides?: Partial<Config>): Config {
  const defaultConfig = getDefaultConfiguration()
  return {
    cyclomaticWarning: overrides?.cyclomaticWarning ?? defaultConfig.cyclomaticWarning,
    cyclomaticError: overrides?.cyclomaticError ?? defaultConfig.cyclomaticError,
  }
}
