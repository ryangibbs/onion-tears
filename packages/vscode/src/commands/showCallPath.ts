import {
  formatCallPathTree,
  generateCallPathTreeAcrossFiles,
  isFunctionNode,
  parseFunctionName,
  type SourceFileInfo,
} from '@onion-tears/core'
import ts from 'typescript'
import * as vscode from 'vscode'

export async function showCallPath() {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  const document = editor.document
  const position = editor.selection.active

  // Parse the current source file
  const sourceFile = ts.createSourceFile(
    document.fileName,
    document.getText(),
    ts.ScriptTarget.Latest,
    true,
  )

  // Find the function node at the cursor position
  let targetNode: ts.Node | null = null
  let targetFunctionName = ''
  const offset = document.offsetAt(position)

  function findFunctionAtPosition(node: ts.Node): void {
    if (isFunctionNode(node) && offset >= node.getStart(sourceFile) && offset <= node.getEnd()) {
      targetNode = node
      targetFunctionName = parseFunctionName(node, sourceFile)
    }
    ts.forEachChild(node, findFunctionAtPosition)
  }

  findFunctionAtPosition(sourceFile)

  if (!targetNode || !targetFunctionName) {
    vscode.window.showInformationMessage(
      'No function found at cursor position. Right-click within a function body.',
    )
    return
  }

  // Show progress while searching
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Analyzing call paths for ${targetFunctionName}()`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0, message: 'Finding TypeScript files...' })

      // Find all TypeScript files in the workspace
      const tsFiles = await vscode.workspace.findFiles('**/*.{ts,tsx}', '**/node_modules/**')

      progress.report({ increment: 30, message: 'Reading files...' })

      // Read all files
      const sourceFiles: SourceFileInfo[] = []
      for (const fileUri of tsFiles) {
        const fileDoc = await vscode.workspace.openTextDocument(fileUri)
        sourceFiles.push({
          filePath: fileDoc.fileName,
          content: fileDoc.getText(),
        })
      }

      progress.report({ increment: 60, message: 'Building call hierarchy...' })

      // Use core function to generate call path tree
      const callPathTree = generateCallPathTreeAcrossFiles(targetFunctionName, sourceFiles)

      progress.report({ increment: 100, message: 'Complete!' })

      // Format the tree with relative paths
      const formattedTree = formatCallPathTree(callPathTree, '', (filePath) =>
        vscode.workspace.asRelativePath(filePath),
      )

      // Show in an output channel
      const outputChannel = vscode.window.createOutputChannel(`Call Path: ${targetFunctionName}()`)
      outputChannel.clear()
      outputChannel.appendLine(`Call Path Tree for: ${targetFunctionName}()\n`)
      outputChannel.appendLine('═'.repeat(70))
      outputChannel.appendLine('')

      if (callPathTree.callers.length === 0) {
        outputChannel.appendLine(`${targetFunctionName}() has no callers in the workspace.`)
        outputChannel.appendLine(
          'This might be a top-level function or called from external modules.',
        )
      } else {
        outputChannel.appendLine(`Functions that call ${targetFunctionName}():\n`)
        outputChannel.append(formattedTree)
      }

      outputChannel.show()
    },
  )
}
