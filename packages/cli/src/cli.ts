import { runFileCommand, runProjectCommand } from './commands.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { createConfiguration } from '@onion-tears/core'

yargs(hideBin(process.argv))
  .scriptName('complexity')
  .usage('Usage: $0 <command> [options]')
  .command(
    'file <file>',
    'Analyze a single TypeScript file',
    (yargs) => {
      return yargs
        .positional('file', {
          describe: 'Path to TypeScript file to analyze',
          type: 'string',
          demandOption: true,
        })
        .option('graph', {
          type: 'boolean',
          description: 'Generate Mermaid control flow graphs',
          default: false,
        })
        .option('outputDir', {
          type: 'string',
          description: 'Output directory for Mermaid graphs',
          default: './graphs',
        })
    },
    (argv) => {
      const config = createConfiguration({})
      runFileCommand(argv.file, argv.graph, argv.outputDir, config)
    },
  )
  .command(
    'project [dir]',
    'Analyze all TypeScript files in a project',
    (yargs) => {
      return yargs
        .positional('dir', {
          describe: 'Project directory (defaults to current directory)',
          type: 'string',
          default: '.',
        })
        .option('exclude', {
          alias: 'e',
          type: 'array',
          description: 'Patterns to exclude (e.g., node_modules, dist)',
          default: ['node_modules', 'dist', '.git', '*.test.ts', '*.spec.ts'],
        })
    },
    (argv) => {
      const config = createConfiguration({})
      runProjectCommand(argv.dir, argv.exclude as string[], config)
    },
  )
  .demandCommand(1, 'You must provide a command')
  .help()
  .alias('help', 'h')
  .parseSync()
