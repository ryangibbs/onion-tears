import type { ThresholdStatus } from '@onion-tears/core'
import fs from 'node:fs'
import path from 'node:path'

export function cleanFilesFromDirectory(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  } else {
    const files = fs.readdirSync(outputDir)
    files.forEach((file) => {
      if (file.endsWith(`.mermaid`)) {
        fs.unlinkSync(path.join(outputDir, file))
      }
    })
  }
}

export function getThresholdStatusBadge(thresholdStatus: ThresholdStatus): string {
  if (thresholdStatus === 'error') {
    return '🔴'
  }

  if (thresholdStatus === 'warning') {
    return '🟡'
  }

  return '🟢'
}
