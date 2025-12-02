import fs from 'node:fs'
import path from 'node:path'
import type { Config } from '@onion-tears/core'

/**
 * Load configuration from file with priority:
 * 1. .onion-tears.json
 * 2. onion-tears property in package.json
 * 3. Return empty object (use defaults)
 */
export function loadConfigFile(startDir: string = process.cwd()): Partial<Config> {
  // Try .onion-tears.json
  const jsonConfigPath = findConfigFile(startDir, '.onion-tears.json')
  if (jsonConfigPath) {
    try {
      const content = fs.readFileSync(jsonConfigPath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      console.warn(`Warning: Failed to parse ${jsonConfigPath}:`, error)
    }
  }

  // Try package.json -> onion-tears property
  const packageJsonPath = findConfigFile(startDir, 'package.json')
  if (packageJsonPath) {
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf8')
      const pkg = JSON.parse(content)
      if (pkg['onion-tears']) {
        return pkg['onion-tears']
      }
    } catch (error) {
      console.warn(`Warning: Failed to read package.json:`, error)
    }
  }

  return {}
}

/**
 * Search for config file walking up directory tree
 */
function findConfigFile(startDir: string, filename: string): string | null {
  let currentDir = path.resolve(startDir)
  const root = path.parse(currentDir).root

  while (true) {
    const candidatePath = path.join(currentDir, filename)
    if (fs.existsSync(candidatePath)) {
      return candidatePath
    }

    if (currentDir === root) {
      return null
    }

    currentDir = path.dirname(currentDir)
  }
}
