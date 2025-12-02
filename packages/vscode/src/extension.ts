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
        const doc = await vscode.workspace.openTextDocument({
          content: `\`\`\`mermaid\n${mermaid}\n\`\`\``,
          language: 'markdown',
        })
        await vscode.window.showTextDocument(doc, { preview: true })
        // Open markdown preview automatically
        await vscode.commands.executeCommand('markdown.showPreview')
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
