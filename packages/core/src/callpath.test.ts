import { describe, it, expect } from 'vitest'
import ts from 'typescript'
import { generateCallPathTree, formatCallPathTree } from './callpath.js'
import { isFunctionNode, parseFunctionName } from './util.js'

const testCode = `
function topLevel1() {
  midLevel1()
}
function topLevel2() {
  midLevel1()
}
function topLevel3() {
  midLevel3()
}
function midLevel1() {
  lowLevel()
}
function midLevel2() {
  lowLevel()
}
function midLevel3() {}
function lowLevel() {}
`

describe('generateCallPathTree', () => {
  it('should generate call path tree for lowLevel function', () => {
    const sourceFile = ts.createSourceFile('test.ts', testCode, ts.ScriptTarget.Latest, true)

    // Find the lowLevel function
    let lowLevelNode = findStartNode('lowLevel', sourceFile)

    expect(lowLevelNode).not.toBeNull()

    const tree = generateCallPathTree(lowLevelNode!, sourceFile)

    expect(tree.functionName).toBe('lowLevel')
    expect(tree.callers.length).toBe(2) // midLevel1 and midLevel2

    const callerNames = tree.callers.map((c) => c.functionName).sort()
    expect(callerNames).toEqual(['midLevel1', 'midLevel2'])

    // midLevel1 should have topLevel1 and topLevel2 as callers
    const midLevel1 = tree.callers.find((c) => c.functionName === 'midLevel1')
    expect(midLevel1).toBeDefined()
    expect(midLevel1!.callers.length).toBe(2)

    const topLevelCallers = midLevel1!.callers.map((c) => c.functionName).sort()
    expect(topLevelCallers).toEqual(['topLevel1', 'topLevel2'])
  })

  it('should format call path tree as a readable string', () => {
    const sourceFile = ts.createSourceFile(
      '/project/src/test.ts',
      testCode,
      ts.ScriptTarget.Latest,
      true,
    )

    const lowLevelNode = findStartNode('lowLevel', sourceFile)

    const tree = generateCallPathTree(lowLevelNode!, sourceFile)
    const formatted = formatCallPathTree(tree, '', (path) => path.replace('/project/', ''))

    expect(formatted).toContain('lowLevel()')
    expect(formatted).toContain('src/test.ts')
    expect(formatted).toContain('midLevel1()')
    expect(formatted).toContain('midLevel2()')
    expect(formatted).toContain('topLevel1()')
    expect(formatted).toContain('topLevel2()')
  })

  it('should handle function with no callers', () => {
    const sourceFile = ts.createSourceFile('test.ts', testCode, ts.ScriptTarget.Latest, true)

    const topLevel1Node = findStartNode('topLevel1', sourceFile)

    const tree = generateCallPathTree(topLevel1Node!, sourceFile)

    expect(tree.functionName).toBe('topLevel1')
    expect(tree.callers.length).toBe(0) // No callers - it's a top-level function
  })

  it('should match snapshot for formatted output with relative paths', () => {
    const sourceFile = ts.createSourceFile(
      '/project/src/test.ts',
      testCode,
      ts.ScriptTarget.Latest,
      true,
    )

    const lowLevelNode = findStartNode('lowLevel', sourceFile)
    const tree = generateCallPathTree(lowLevelNode!, sourceFile)
    const formatted = formatCallPathTree(tree, '', (path) => path.replace('/project/', ''))

    expect(formatted).toMatchInlineSnapshot(`
      "lowLevel() [src/test.ts]
      │   midLevel1() [src/test.ts]
      │   │   topLevel1() [src/test.ts]
      │       topLevel2() [src/test.ts]
          midLevel2() [src/test.ts]
      "
    `)
  })
})

function findStartNode(functionName: string, sourceFile: ts.SourceFile): ts.Node | null {
  let targetNode: ts.Node | null = null
  function findNode(node: ts.Node): void {
    if (isFunctionNode(node) && parseFunctionName(node, sourceFile) === functionName) {
      targetNode = node
    }
    ts.forEachChild(node, findNode)
  }
  findNode(sourceFile)
  return targetNode
}
