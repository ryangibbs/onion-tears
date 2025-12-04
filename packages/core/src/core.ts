import type {
  Config,
  FunctionComplexityResult,
  ComplexityContributor,
  ComplexityResult,
} from './types.js'
import ts from 'typescript'
import { parseFunctionName, isFunctionNode } from './util.js'

export function analyzeSourceFile(
  sourceFile: ts.SourceFile,
  config: Config,
): FunctionComplexityResult[] {
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

    if (isFunctionNode(node)) {
      try {
        // Get the line number where the function starts
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        const cyclomaticComplexity = calculateCyclomaticComplexity(node, sourceFile)
        const cognitiveComplexity = calculateCognitiveComplexity(node, sourceFile)

        const result: FunctionComplexityResult = {
          cyclomatic: cyclomaticComplexity.score,
          cyclomaticContributors: cyclomaticComplexity.contributors,
          cognitive: cognitiveComplexity.score,
          cognitiveContributors: cognitiveComplexity.contributors,
          functionName: parseFunctionName(node, sourceFile),
          line: line + 1,
          astNode: node,
          thresholdStatus: undefined,
        }

        if (config.cyclomaticError && cyclomaticComplexity.score >= config.cyclomaticError) {
          result.thresholdStatus = 'error'
        } else if (
          config.cyclomaticWarning &&
          cyclomaticComplexity.score >= config.cyclomaticWarning
        ) {
          result.thresholdStatus = 'warning'
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

export function calculateCyclomaticComplexity(
  funcNode: ts.Node,
  sourceFile: ts.SourceFile,
): ComplexityResult {
  let edges = 0 // Decision points (creates branches)
  const contributors: ComplexityContributor[] = []

  const visitor = (node: ts.Node): void => {
    const addContributor = (type: string, cost: number = 1) => {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      )
      const text = node.getText(sourceFile).slice(0, 50).replace(/\n/g, ' ')
      contributors.push({ type, cost, line: line + 1, column: character + 1, text })
      edges += cost
    }

    switch (node.kind) {
      // 1. Conditional & Loop Statements (each adds +1 decision point)
      case ts.SyntaxKind.IfStatement:
        addContributor('if statement')
        break
      case ts.SyntaxKind.WhileStatement:
        addContributor('while loop')
        break
      case ts.SyntaxKind.DoStatement:
        addContributor('do-while loop')
        break
      case ts.SyntaxKind.ForStatement:
        addContributor('for loop')
        break
      case ts.SyntaxKind.ForInStatement:
        addContributor('for-in loop')
        break
      case ts.SyntaxKind.ForOfStatement:
        addContributor('for-of loop')
        break
      case ts.SyntaxKind.ConditionalExpression:
        addContributor('ternary operator')
        break
      case ts.SyntaxKind.CatchClause:
        addContributor('catch clause')
        break

      // 2. Switch Statements - count each case clause
      case ts.SyntaxKind.SwitchStatement:
        const switchStmt = node as ts.SwitchStatement
        switchStmt.caseBlock.clauses.forEach((clause) => {
          if (ts.isCaseClause(clause)) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(
              clause.getStart(sourceFile),
            )
            const text = clause.getText(sourceFile).slice(0, 50).replace(/\n/g, ' ')
            contributors.push({
              type: 'case clause',
              cost: 1,
              line: line + 1,
              column: character + 1,
              text,
            })
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
          const op =
            binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ? '&&' : '||'
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            binaryExpr.operatorToken.getStart(sourceFile),
          )
          const text = binaryExpr.getText(sourceFile).slice(0, 50).replace(/\n/g, ' ')
          contributors.push({
            type: `logical ${op}`,
            cost: 1,
            line: line + 1,
            column: character + 1,
            text,
          })
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

  return { score, contributors }
}

export function calculateCognitiveComplexity(
  funcNode: ts.Node,
  sourceFile: ts.SourceFile,
): ComplexityResult {
  let score = 0
  let nestingLevel = 0
  const contributors: ComplexityContributor[] = []

  const visitor = (node: ts.Node): void => {
    let incrementsNesting = false

    const addContributor = (type: string, cost: number) => {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      )
      const text = node.getText(sourceFile).slice(0, 50).replace(/\n/g, ' ')
      contributors.push({ type, cost, line: line + 1, column: character + 1, text })
      score += cost
    }

    switch (node.kind) {
      // Control flow structures that increase complexity and nesting
      case ts.SyntaxKind.IfStatement:
        addContributor('if statement', 1 + nestingLevel)
        incrementsNesting = true
        nestingLevel++
        break
      case ts.SyntaxKind.ForStatement:
        addContributor('for loop', 1 + nestingLevel)
        incrementsNesting = true
        nestingLevel++
        break
      case ts.SyntaxKind.ForInStatement:
        addContributor('for-in loop', 1 + nestingLevel)
        incrementsNesting = true
        nestingLevel++
        break
      case ts.SyntaxKind.ForOfStatement:
        addContributor('for-of loop', 1 + nestingLevel)
        incrementsNesting = true
        nestingLevel++
        break
      case ts.SyntaxKind.WhileStatement:
        addContributor('while loop', 1 + nestingLevel)
        incrementsNesting = true
        nestingLevel++
        break
      case ts.SyntaxKind.DoStatement:
        addContributor('do-while loop', 1 + nestingLevel)
        incrementsNesting = true
        nestingLevel++
        break
      case ts.SyntaxKind.ConditionalExpression:
        addContributor('ternary operator', 1 + nestingLevel)
        incrementsNesting = true
        nestingLevel++
        break
      case ts.SyntaxKind.CatchClause:
        addContributor('catch clause', 1 + nestingLevel)
        incrementsNesting = true
        nestingLevel++
        break

      case ts.SyntaxKind.SwitchStatement:
        addContributor('switch statement', 1 + nestingLevel)
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
          const op =
            binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
              ? '&&'
              : binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
                ? '||'
                : '??'
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            binaryExpr.operatorToken.getStart(sourceFile),
          )
          const text = binaryExpr.getText(sourceFile).slice(0, 50).replace(/\n/g, ' ')
          contributors.push({
            type: `logical ${op}`,
            cost: 1,
            line: line + 1,
            column: character + 1,
            text,
          })
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

  return { score, contributors }
}
