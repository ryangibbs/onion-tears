import ts from 'typescript'
import { isFunctionNode, parseFunctionName } from './util.js'
import type { CallPathNode } from './types.js'

/**
 * Extract all function calls from a node
 */
function extractFunctionCalls(node: ts.Node, sourceFile: ts.SourceFile): Set<string> {
  const callees = new Set<string>()

  function visit(n: ts.Node): void {
    if (ts.isCallExpression(n)) {
      const callText = n.expression.getText(sourceFile)
      const calleeName = callText.split('(')[0]?.trim() || callText.trim()
      callees.add(calleeName)
    }
    ts.forEachChild(n, visit)
  }

  ts.forEachChild(node, visit)
  return callees
}

/**
 * Build reverse call map (callee -> callers)
 */
function buildReverseCallMap(callMap: Map<string, Set<string>>): Map<string, Set<string>> {
  const reverseMap = new Map<string, Set<string>>()

  for (const [caller, callees] of callMap.entries()) {
    for (const callee of callees) {
      if (!reverseMap.has(callee)) {
        reverseMap.set(callee, new Set())
      }
      reverseMap.get(callee)!.add(caller)
    }
  }

  return reverseMap
}

/**
 * Given a function node, generate a tree of all possible code paths above it.
 * Traces the call hierarchy upward to find all callers within a single file.
 *
 * @param targetNode - The function node to start from
 * @param sourceFile - The source file containing the code
 * @returns A tree structure showing all call paths to the target function
 */
export function generateCallPathTree(targetNode: ts.Node, sourceFile: ts.SourceFile): CallPathNode {
  const targetName = parseFunctionName(targetNode, sourceFile)

  // Build function and call maps
  const functionMap = new Map<string, ts.Node>()
  const callMap = new Map<string, Set<string>>()

  function visit(node: ts.Node): void {
    if (isFunctionNode(node)) {
      const funcName = parseFunctionName(node, sourceFile)
      functionMap.set(funcName, node)
      callMap.set(funcName, extractFunctionCalls(node, sourceFile))
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  const reverseCallMap = buildReverseCallMap(callMap)
  const visited = new Set<string>()

  function buildTree(funcName: string, depth: number = 0): CallPathNode {
    const node = functionMap.get(funcName)
    if (!node) {
      return {
        functionName: funcName,
        filePath: sourceFile.fileName,
        node: targetNode,
        callers: [],
      }
    }

    const callers: CallPathNode[] = []

    if (!visited.has(funcName) && depth < 20) {
      visited.add(funcName)

      for (const callerName of reverseCallMap.get(funcName) || []) {
        callers.push(buildTree(callerName, depth + 1))
      }

      visited.delete(funcName)
    }

    return {
      functionName: funcName,
      filePath: sourceFile.fileName,
      node,
      callers,
    }
  }

  return buildTree(targetName)
}

/**
 * Generate a call path tree across multiple source files in a workspace.
 * This analyzes all provided source files to build a complete call hierarchy.
 *
 * @param targetFunctionName - The name of the function to find callers for
 * @param sourceFiles - Array of source file info objects containing file paths and content
 * @returns A tree structure showing all call paths to the target function across files
 */
export function generateCallPathTreeAcrossFiles(
  targetFunctionName: string,
  sourceFiles: SourceFileInfo[],
): CallPathNode {
  const parsedFiles = sourceFiles.map(({ filePath, content }) => ({
    filePath,
    sourceFile: ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true),
  }))

  const functionMap = new Map<
    string,
    { node: ts.Node; sourceFile: ts.SourceFile; filePath: string }
  >()
  const callMap = new Map<string, Set<string>>()

  for (const { filePath, sourceFile } of parsedFiles) {
    function visit(node: ts.Node): void {
      if (isFunctionNode(node)) {
        const funcName = parseFunctionName(node, sourceFile)
        functionMap.set(funcName, { node, sourceFile, filePath })
        callMap.set(funcName, extractFunctionCalls(node, sourceFile))
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }

  const reverseCallMap = buildReverseCallMap(callMap)
  const visited = new Set<string>()

  function buildTree(funcName: string, depth: number = 0): CallPathNode {
    const funcInfo = functionMap.get(funcName)

    if (!funcInfo) {
      return {
        functionName: funcName,
        filePath: 'unknown',
        node: ts.factory.createIdentifier(funcName) as ts.Node,
        callers: [],
      }
    }

    const callers: CallPathNode[] = []

    if (!visited.has(funcName) && depth < 10) {
      visited.add(funcName)

      for (const callerName of reverseCallMap.get(funcName) || []) {
        if (callerName !== funcName) {
          callers.push(buildTree(callerName, depth + 1))
        }
      }

      visited.delete(funcName)
    }

    return {
      functionName: funcName,
      filePath: funcInfo.filePath,
      node: funcInfo.node,
      callers,
    }
  }

  return buildTree(targetFunctionName)
}

/**
 * Convert a call path tree to a human-readable string representation
 *
 * @param tree - The call path tree to format
 * @param indent - Current indentation level (used for recursion)
 * @param formatFilePath - Optional function to format file paths (e.g., make relative)
 */
export function formatCallPathTree(
  tree: CallPathNode,
  indent: string = '',
  formatFilePath?: (filePath: string) => string,
): string {
  const displayPath = formatFilePath ? formatFilePath(tree.filePath) : tree.filePath
  let result = `${indent}${tree.functionName}() [${displayPath}]\n`

  if (tree.callers.length > 0) {
    tree.callers.forEach((caller, index) => {
      const isLast = index === tree.callers.length - 1
      const continuation = indent + (isLast ? '    ' : '│   ')
      result += formatCallPathTree(caller, continuation, formatFilePath)
    })
  }

  return result
}

export interface SourceFileInfo {
  filePath: string
  content: string
}
