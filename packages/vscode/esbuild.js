import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

esbuild
  .build({
    entryPoints: [path.resolve(__dirname, 'src', 'extension.ts')],
    outfile: path.resolve(__dirname, 'dist', 'extension.js'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    sourcemap: true,
    minify: true,
    target: 'es2020',
    external: ['vscode'],
    banner: {
      js: `import { createRequire } from 'module';import { fileURLToPath } from 'url';import { dirname } from 'path';const require = createRequire(import.meta.url);const __filename = fileURLToPath(import.meta.url);const __dirname = dirname(__filename);`,
    },
  })
  .then(() => {
    console.log('✅ VS Code extension built successfully.')
  })
  .catch((e) => {
    console.error('❌ VS Code extension build failed:', e)
    process.exit(1)
  })
