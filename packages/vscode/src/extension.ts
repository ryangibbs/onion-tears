import * as vscode from 'vscode'
import ts from 'typescript'
import { analyzeSourceFile, generateMermaidForFunction } from '@onion-tears/core'
import type { FunctionComplexityResult, Config } from '@onion-tears/core'

export function activate(context: vscode.ExtensionContext) {
  console.log('Function Info Extension is now active!')

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'onionTears.showControlFlowMenu',
      async (result: FunctionComplexityResult) => {
        const mermaid = generateMermaidForFunction(result)
        const panel = vscode.window.createWebviewPanel(
          'onionTearsMermaid',
          `Control Flow: ${result.functionName}()`,
          vscode.ViewColumn.Beside,
          { enableScripts: true },
        )

        panel.webview.html = getMermaidHtml(mermaid)
      },
    ),
  )

  // Register the CodeLens Provider
  const selector: vscode.DocumentSelector = [
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'typescriptreact' },
  ]

  const codeLensProvider = new ComplexityCodeLensProvider()
  context.subscriptions.push(vscode.languages.registerCodeLensProvider(selector, codeLensProvider))

  // Refresh CodeLens when configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('onionTears')) {
        codeLensProvider.refresh()
      }
    }),
  )
}

export function deactivate() {}

class ComplexityCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>()
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event

  refresh(): void {
    this._onDidChangeCodeLenses.fire()
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
    // Use the TypeScript Compiler API to parse the source file
    const sourceFile = ts.createSourceFile(
      document.fileName,
      document.getText(),
      ts.ScriptTarget.Latest,
      true, // setParentNodes
    )

    const config = getConfig()
    const results = analyzeSourceFile(sourceFile, config)

    const codeLenses: vscode.CodeLens[] = results.map((result) => {
      const line = result.line - 1 // VSCode lines are 0-based
      const range = new vscode.Range(line, 0, line, 0)
      const severityIcon = getSeverityIcon(result)

      return new vscode.CodeLens(range, {
        title: `🧅 ${severityIcon} Cyclomatic: ${result.cyclomatic}, Cognitive: ${result.cognitive} | Show control flow graph`,
        command: 'onionTears.showControlFlowMenu',
        arguments: [result],
      })
    })

    return codeLenses
  }
}

function getConfig(): Config {
  const config = vscode.workspace.getConfiguration('onionTears')
  return {
    cyclomaticWarning: config.get<number>('complexity.cyclomaticWarning', 10),
    cyclomaticError: config.get<number>('complexity.cyclomaticError', 20),
  }
}

function getSeverityIcon(result: FunctionComplexityResult): string {
  const config = getConfig()

  if (config.cyclomaticError && result.cyclomatic >= config.cyclomaticError) {
    return '🔴'
  }

  if (config.cyclomaticWarning && result.cyclomatic >= config.cyclomaticWarning) {
    return '🟡'
  }

  return '🟢'
}

function getMermaidHtml(graph: string): string {
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Onion Tears Control Flow</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; margin: 0; }
        .container { padding: 16px; }
        .mermaid { background: #fff; }
      </style>
      <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs'
        mermaid.initialize({ startOnLoad: true, securityLevel: 'loose', theme: 'default' })
        const graph = ${JSON.stringify(graph)};
        window.addEventListener('DOMContentLoaded', () => {
          const el = document.querySelector('.mermaid')
          if (el) {
            el.textContent = graph
            mermaid.run({ querySelector: '.mermaid' })
          }
        })
      </script>
    </head>
    <body>
      <div class="container">
        <div class="mermaid"></div>
      </div>
    </body>
  </html>`
}
