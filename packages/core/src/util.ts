import ts from 'typescript'

export function isFunctionNode(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node)
  )
}

export function parseFunctionName(node: ts.Node, sourceFile: ts.SourceFile): string {
  const getNameText = (n: ts.Node | undefined): string | undefined => {
    if (!n) return undefined
    if (ts.isFunctionDeclaration(n)) return n.name?.getText(sourceFile)
    if (ts.isMethodDeclaration(n)) return n.name?.getText(sourceFile)
    if (ts.isGetAccessorDeclaration(n)) return n.name?.getText(sourceFile)
    if (ts.isSetAccessorDeclaration(n)) return n.name?.getText(sourceFile)
    if (ts.isClassDeclaration(n)) return n.name?.getText(sourceFile)
    if (ts.isVariableDeclaration(n)) return n.name?.getText(sourceFile)
    if (ts.isPropertyDeclaration(n)) return n.name?.getText(sourceFile)
    if (ts.isPropertyAssignment(n)) return n.name?.getText(sourceFile)
    return undefined
  }

  const direct = getNameText(node)
  if (direct) return direct

  const fromParent = getNameText(node.parent)
  return fromParent ?? 'anonymous'
}
