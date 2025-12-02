import ts from 'typescript'
import type { FunctionComplexityResult } from './types.js'

export function generateMermaidForFunction(result: FunctionComplexityResult): string {
  const cfg = buildCyclomaticCFG(result.astNode)
  return toMermaidFormat(cfg, result)
}

function toMermaidFormat(cfg: ControlFlowGraph, result: FunctionComplexityResult): string {
  let mermaid = '---\n'
  mermaid += `title: ${result.functionName}() | Cyclomatic:${result.cyclomatic} Cognitive:${result.cognitive}\n`
  mermaid += '---\n'
  mermaid += 'flowchart TD\n'

  // Define nodes with styling
  cfg.nodes.forEach((node) => {
    const nodeId = `N${node.id}`
    const escapedLabel = node.label.replace(/"/g, "'")

    switch (node.type) {
      case 'entry':
        mermaid += `    ${nodeId}(["${escapedLabel}"])\n`
        mermaid += `    style ${nodeId} fill:#2d5016,stroke:#4a7c2c,stroke-width:2px,color:#e8f5e9\n`
        break
      case 'exit':
        mermaid += `    ${nodeId}(["${escapedLabel}"])\n`
        mermaid += `    style ${nodeId} fill:#5d1f1f,stroke:#a04040,stroke-width:2px,color:#ffebee\n`
        break
      case 'decision':
        mermaid += `    ${nodeId}{"${escapedLabel}"}\n`
        mermaid += `    style ${nodeId} fill:#4a3c00,stroke:#997a00,stroke-width:2px,color:#fff9c4\n`
        break
      case 'statement':
        mermaid += `    ${nodeId}["${escapedLabel}"]\n`
        mermaid += `    style ${nodeId} fill:#1e3a5f,stroke:#3d5a80,stroke-width:1px,color:#e3f2fd\n`
        break
    }
  })

  mermaid += '\n'

  // Define edges
  cfg.edges.forEach((edge) => {
    const fromId = `N${edge.from}`
    const toId = `N${edge.to}`
    const label = edge.label ? `|"${edge.label}"| ` : ''
    mermaid += `    ${fromId} -->${label}${toId}\n`
  })

  return mermaid
}

/**
 * Build a control flow graph showing the nodes and edges counted by cyclomatic complexity
 */
function buildCyclomaticCFG(funcNode: ts.Node): ControlFlowGraph {
  const nodes: CFGNode[] = []
  const edges: CFGEdge[] = []
  let nodeId = 0

  // Entry node
  const entryId = nodeId++
  nodes.push({ id: entryId, label: 'ENTRY', type: 'entry' })

  let currentId = entryId

  const visitor = (node: ts.Node, prevId: number): number => {
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement: {
        const ifStmt = node as ts.IfStatement

        // Decision node
        const decisionId = nodeId++
        nodes.push({
          id: decisionId,
          label: `if (${ifStmt.expression.getText().slice(0, 30)})`,
          type: 'decision',
        })
        edges.push({ from: prevId, to: decisionId })

        // Then branch - create a node for the then body
        const thenId = nodeId++
        let thenText = 'then'
        if (ts.isBlock(ifStmt.thenStatement) && ifStmt.thenStatement.statements.length > 0) {
          // Get the first statement in the block
          const firstStmt = ifStmt.thenStatement.statements[0]
          if (firstStmt) {
            thenText = firstStmt.getText().slice(0, 40)
          }
        } else {
          thenText = ifStmt.thenStatement.getText().slice(0, 40)
        }
        nodes.push({ id: thenId, label: thenText, type: 'statement' })
        edges.push({ from: decisionId, to: thenId, label: 'T' })
        const thenExitId = visitor(ifStmt.thenStatement, thenId)

        // Else branch (or merge point)
        let elseExitId: number
        if (ifStmt.elseStatement) {
          // Check if else is another if statement (else if chain)
          if (ts.isIfStatement(ifStmt.elseStatement)) {
            // For else-if, connect directly from decision to the nested if
            elseExitId = visitor(ifStmt.elseStatement, decisionId)
            // Find and label the edge that was just created
            for (let i = edges.length - 1; i >= 0; i--) {
              const edge = edges[i]
              if (edge && edge.from === decisionId && !edge.label) {
                edge.label = 'F'
                break
              }
            }
          } else {
            // For regular else block, create a node for it
            const elseId = nodeId++
            let elseText = 'else'
            if (ts.isBlock(ifStmt.elseStatement) && ifStmt.elseStatement.statements.length > 0) {
              const firstStmt = ifStmt.elseStatement.statements[0]
              if (firstStmt) {
                elseText = firstStmt.getText().slice(0, 40)
              }
            } else {
              elseText = ifStmt.elseStatement.getText().slice(0, 40)
            }
            nodes.push({ id: elseId, label: elseText, type: 'statement' })
            edges.push({ from: decisionId, to: elseId, label: 'F' })
            elseExitId = visitor(ifStmt.elseStatement, elseId)
          }
        } else {
          // No else branch, false path will merge
          elseExitId = decisionId
        }

        // Merge node
        const mergeId = nodeId++
        nodes.push({ id: mergeId, label: 'merge', type: 'statement' })
        edges.push({ from: thenExitId, to: mergeId })

        if (ifStmt.elseStatement) {
          edges.push({ from: elseExitId, to: mergeId })
        } else {
          edges.push({ from: decisionId, to: mergeId, label: 'F' })
        }

        return mergeId
      }

      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.ForInStatement: {
        // Loop decision node
        const loopId = nodeId++
        const loopText = node.getText().split('\n')[0]?.slice(0, 40) || 'loop'
        nodes.push({ id: loopId, label: loopText, type: 'decision' })
        edges.push({ from: prevId, to: loopId })

        // Loop body
        const bodyId = nodeId++
        nodes.push({ id: bodyId, label: 'loop body', type: 'statement' })
        edges.push({ from: loopId, to: bodyId, label: 'T' })

        // Get the statement
        let stmt: ts.Statement
        if (ts.isWhileStatement(node)) {
          stmt = node.statement
        } else if (ts.isDoStatement(node)) {
          stmt = node.statement
        } else if (ts.isForStatement(node)) {
          stmt = node.statement
        } else if (ts.isForOfStatement(node)) {
          stmt = node.statement
        } else {
          stmt = (node as ts.ForInStatement).statement
        }

        const bodyExitId = visitor(stmt, bodyId)

        // Back edge to loop condition
        edges.push({ from: bodyExitId, to: loopId, label: 'continue' })

        // Exit edge
        const exitId = nodeId++
        nodes.push({ id: exitId, label: 'loop exit', type: 'statement' })
        edges.push({ from: loopId, to: exitId, label: 'F' })

        return exitId
      }

      case ts.SyntaxKind.SwitchStatement: {
        const switchStmt = node as ts.SwitchStatement

        const switchId = nodeId++
        nodes.push({
          id: switchId,
          label: `switch (${switchStmt.expression.getText().slice(0, 20)})`,
          type: 'decision',
        })
        edges.push({ from: prevId, to: switchId })

        const mergeId = nodeId++
        nodes.push({ id: mergeId, label: 'switch merge', type: 'statement' })

        // Create a node for each case
        switchStmt.caseBlock.clauses.forEach((clause, idx) => {
          const caseId = nodeId++
          const label = ts.isCaseClause(clause) ? `case ${clause.expression.getText()}` : 'default'
          nodes.push({ id: caseId, label, type: 'statement' })
          edges.push({ from: switchId, to: caseId, label: `case ${idx}` })
          edges.push({ from: caseId, to: mergeId })
        })

        return mergeId
      }

      case ts.SyntaxKind.ConditionalExpression: {
        const ternary = node as ts.ConditionalExpression

        const ternaryId = nodeId++
        nodes.push({
          id: ternaryId,
          label: `${ternary.condition.getText().slice(0, 20)} ?`,
          type: 'decision',
        })
        edges.push({ from: prevId, to: ternaryId })

        const trueId = nodeId++
        nodes.push({ id: trueId, label: 'true branch', type: 'statement' })
        edges.push({ from: ternaryId, to: trueId, label: 'T' })

        const falseId = nodeId++
        nodes.push({ id: falseId, label: 'false branch', type: 'statement' })
        edges.push({ from: ternaryId, to: falseId, label: 'F' })

        const mergeId = nodeId++
        nodes.push({ id: mergeId, label: 'merge', type: 'statement' })
        edges.push({ from: trueId, to: mergeId })
        edges.push({ from: falseId, to: mergeId })

        return mergeId
      }

      case ts.SyntaxKind.BinaryExpression: {
        const binaryExpr = node as ts.BinaryExpression
        if (
          binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          const opId = nodeId++
          const op =
            binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ? '&&' : '||'
          nodes.push({
            id: opId,
            label: `${op} short-circuit`,
            type: 'decision',
          })
          edges.push({ from: prevId, to: opId })

          const nextId = nodeId++
          nodes.push({ id: nextId, label: 'continue', type: 'statement' })
          edges.push({ from: opId, to: nextId, label: 'eval' })
          edges.push({ from: opId, to: nextId, label: 'skip' })

          return nextId
        }
        break
      }

      case ts.SyntaxKind.Block: {
        const block = node as ts.Block
        let blockCurrentId = prevId
        for (const stmt of block.statements) {
          blockCurrentId = visitor(stmt, blockCurrentId)
        }
        return blockCurrentId
      }

      case ts.SyntaxKind.ReturnStatement:
      case ts.SyntaxKind.BreakStatement:
      case ts.SyntaxKind.ContinueStatement: {
        const stmtId = nodeId++
        nodes.push({
          id: stmtId,
          label: node.getText().slice(0, 30),
          type: 'statement',
        })
        edges.push({ from: prevId, to: stmtId })
        return stmtId
      }
    }

    // For other nodes, recurse through children
    let currentId = prevId
    ts.forEachChild(node, (child) => {
      currentId = visitor(child, currentId)
    })
    return currentId
  }

  // Visit the function body
  const exitPrevId = visitor(funcNode, currentId)

  // Exit node
  const exitId = nodeId++
  nodes.push({ id: exitId, label: 'EXIT', type: 'exit' })
  edges.push({ from: exitPrevId, to: exitId })

  return { nodes, edges }
}

interface CFGNode {
  id: number
  label: string
  type: 'entry' | 'exit' | 'statement' | 'decision'
}

interface CFGEdge {
  from: number
  to: number
  label?: string
}

export interface ControlFlowGraph {
  nodes: CFGNode[]
  edges: CFGEdge[]
}
