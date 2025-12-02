import type { Config, FunctionComplexityResult, ThresholdStatus } from './types.js'
import ts from 'typescript'
import { parseFunctionName } from './util.js'

export function analyzeSourceFile(sourceFile: ts.SourceFile, config: Config): FunctionComplexityResult[] {
  const results: FunctionComplexityResult[] = []

  const fileVisitor = (node: ts.Node): void => {
    // Skip import/export declarations entirely
    if (
      ts.isImportDeclaration(node) ||
      ts.isExportDeclaration(node) ||
      ts.isImportEqualsDeclaration(node) ||
      ts.isExportAssignment(node)
    ) {
      return
    }

    const isFunction =
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)

    if (isFunction) {
      try {
        // Get the line number where the function starts
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        const cyclomatic = calculateCyclomaticComplexity(node)

        let thresholdStatus: ThresholdStatus = undefined
        if (config.cyclomaticError && cyclomatic >= config.cyclomaticError) {
          thresholdStatus = 'error'
        } else if (config.cyclomaticWarning && cyclomatic >= config.cyclomaticWarning) {
          thresholdStatus = 'warning'
        }
        
        const result: FunctionComplexityResult = {
          cyclomatic,
          thresholdStatus,
          functionName: parseFunctionName(node, sourceFile),
          line: line + 1,
          cognitive: calculateCognitiveComplexity(node),
          astNode: node,
        }
        results.push(result)
      } catch (error) {
        console.error(`Error analyzing function at position ${node.pos}:`, error)
      }

      // Do not recurse into the function's children from the fileVisitor,
      // as calculateFunctionComplexity handles that scope.
    } else {
      // Continue search for functions in the rest of the file
      ts.forEachChild(node, fileVisitor)
    }
  }

  // Start file traversal from the root node
  fileVisitor(sourceFile)

  return results
}

export function calculateCyclomaticComplexity(funcNode: ts.Node): number {
  let edges = 0 // Decision points (creates branches)

  const visitor = (node: ts.Node): void => {
    switch (node.kind) {
      // 1. Conditional & Loop Statements (each adds +1 decision point)
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.ConditionalExpression: // Ternary operator: a ? b : c
      case ts.SyntaxKind.CatchClause: // Error handling path
        edges++
        break

      // 2. Switch Statements - count each case clause
      case ts.SyntaxKind.SwitchStatement:
        const switchStmt = node as ts.SwitchStatement
        switchStmt.caseBlock.clauses.forEach((clause) => {
          if (ts.isCaseClause(clause)) {
            edges++
          }
        })
        break

      // 3. Logical Operators (Short-circuit evaluation creates a branch)
      case ts.SyntaxKind.BinaryExpression:
        const binaryExpr = node as ts.BinaryExpression
        if (
          binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || // &&
          binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken // ||
        ) {
          edges++
        }
        break
    }

    // Continue recursion within the current node's children
    ts.forEachChild(node, visitor)
  }

  // Start traversal from the function's body
  ts.forEachChild(funcNode, visitor)

  // Cyclomatic Complexity = decision points + 1
  const score = edges + 1

  return score
}

export function calculateCognitiveComplexity(funcNode: ts.Node): number {
  let score = 0
  let nestingLevel = 0

  const visitor = (node: ts.Node): void => {
    let incrementsNesting = false

    switch (node.kind) {
      // Control flow structures that increase complexity and nesting
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.ConditionalExpression: // Ternary operator
      case ts.SyntaxKind.CatchClause:
        score += 1 + nestingLevel
        incrementsNesting = true
        nestingLevel++
        break

      case ts.SyntaxKind.SwitchStatement:
        score += 1 + nestingLevel
        incrementsNesting = true
        nestingLevel++
        break

      // Logical operators (each occurrence adds +1, no nesting)
      case ts.SyntaxKind.BinaryExpression:
        const binaryExpr = node as ts.BinaryExpression
        if (
          binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || // &&
          binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken || // ||
          binaryExpr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken // ??
        ) {
          score += 1
        }
        break
    }

    // Continue recursion within the current node's children
    ts.forEachChild(node, visitor)

    // Decrease nesting after processing children
    if (incrementsNesting) {
      nestingLevel--
    }
  }

  // Start traversal from the function's body
  ts.forEachChild(funcNode, visitor)

  return score
}
