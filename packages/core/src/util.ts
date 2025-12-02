import ts from 'typescript'


export function parseFunctionName(node: ts.Node, sourceFile: ts.SourceFile): string {
  let functionName = 'anonymous'
  if (ts.isFunctionDeclaration(node) && node.name) {
    functionName = node.name.getText(sourceFile)
  } else if (ts.isMethodDeclaration(node) && node.name) {
    functionName = node.name.getText(sourceFile)
  } else if (ts.isVariableDeclaration(node.parent) && node.parent.name) {
    functionName = node.parent.name.getText(sourceFile)
  }
  return functionName
}
