import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

esbuild
  .build({
    entryPoints: [path.resolve(__dirname, 'src', 'cli.ts')],
    outfile: path.resolve(__dirname, 'dist', 'cli.js'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    sourcemap: true,
    minify: true,
    target: 'es2020',
    external: ['typescript'],
    banner: {
      js: '#!/usr/bin/env node',
    },
  })
  .then(() => {
    console.log('✅ CLI built successfully.')
  })
  .catch((e) => {
    console.error('❌ CLI build failed:', e)
    process.exit(1)
  })
