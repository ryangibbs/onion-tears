import { runFileCommand, runProjectCommand } from './commands.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { createConfiguration } from '@onion-tears/core'
import { loadConfigFile } from './config-loader.js'

yargs(hideBin(process.argv))
  .scriptName('complexity')
  .usage('Usage: $0 <command> [options]')
  .command(
    'file <file>',
    'Analyze a single TypeScript file',
    {
      file: {
        describe: 'Path to TypeScript file to analyze',
        type: 'string',
        demandOption: true,
      },
      graph: {
        type: 'boolean',
        description: 'Generate Mermaid control flow graphs',
        default: false,
      },
      warning: {
        alias: 'w',
        type: 'number',
        description: 'Cyclomatic complexity warning threshold',
        default: 10,
      },
      error: {
        alias: 'e',
        type: 'number',
        description: 'Cyclomatic complexity error threshold',
        default: 20,
      },
    },
    (argv) => {
      const config = createConfiguration({
        cyclomaticWarning: argv.warning,
        cyclomaticError: argv.error,
        ...loadConfigFile(),
      })
      runFileCommand(argv.file, argv.graph, config)
    },
  )
  .command(
    'project [dir]',
    'Analyze all TypeScript files in a project',
    {
      dir: {
        describe: 'Project directory (defaults to current directory)',
        default: '.',
      },
      warning: {
        alias: 'w',
        type: 'number',
        description: 'Cyclomatic complexity warning threshold',
        default: 10,
      },
      error: {
        alias: 'e',
        type: 'number',
        description: 'Cyclomatic complexity error threshold',
        default: 20,
      },
    },
    (argv) => {
      const config = createConfiguration({
        cyclomaticWarning: argv.warning,
        cyclomaticError: argv.error,
        ...loadConfigFile(),
      })
      runProjectCommand(argv.dir, config)
    },
  )
  .demandCommand(1, 'You must provide a command')
  .help()
  .alias('help', 'h')
  .parseSync()
