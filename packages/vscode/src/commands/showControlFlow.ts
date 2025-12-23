import { generateMermaidForFunction, type FunctionComplexityResult } from '@onion-tears/core'
import * as vscode from 'vscode'

export async function showControlFlow(
  result: FunctionComplexityResult,
  document: vscode.TextDocument,
  context: vscode.ExtensionContext,
) {
  const mermaid = generateMermaidForFunction(result)
  const panel = vscode.window.createWebviewPanel(
    'onionTearsMermaid',
    `Control Flow: ${result.functionName}()`,
    vscode.ViewColumn.Beside,
    { enableScripts: true },
  )

  panel.webview.html = getMermaidHtml(mermaid, result, document.uri)

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    (message) => {
      if (message.command === 'navigateToLine') {
        const line = message.line - 1 // Convert to 0-based
        const position = new vscode.Position(line, 0)
        const range = new vscode.Range(position, position)

        vscode.window.showTextDocument(document.uri, {
          selection: range,
          viewColumn: vscode.ViewColumn.One,
        })
      }
    },
    undefined,
    context.subscriptions,
  )
}

function getMermaidHtml(
  graph: string,
  result: FunctionComplexityResult,
  _documentUri: vscode.Uri,
): string {
  const cyclomaticRows = result.cyclomaticContributors
    .map(
      (c) =>
        `<tr><td>${c.type}</td><td>+${c.cost}</td><td class="clickable-line" data-line="${c.line}">${c.line}</td><td class="code-preview">${escapeHtml(c.text)}</td></tr>`,
    )
    .join('')

  const cognitiveRows = result.cognitiveContributors
    .map(
      (c) =>
        `<tr><td>${c.type}</td><td>+${c.cost}</td><td class="clickable-line" data-line="${c.line}">${c.line}</td><td class="code-preview">${escapeHtml(c.text)}</td></tr>`,
    )
    .join('')

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Onion Tears Control Flow</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; 
          margin: 0; 
          padding: 16px;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        .container { margin-bottom: 24px; }
        .mermaid { background: var(--vscode-editor-background); }
        
        h2 { 
          color: var(--vscode-editor-foreground);
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 8px;
          margin-top: 24px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          font-size: 13px;
        }
        
        th {
          text-align: left;
          padding: 8px;
          background: var(--vscode-editor-inactiveSelectionBackground);
          font-weight: 600;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        td {
          padding: 6px 8px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        tr:hover {
          background: var(--vscode-list-hoverBackground);
        }
        
        .clickable-line {
          color: var(--vscode-textLink-foreground);
          cursor: pointer;
          font-weight: 500;
        }
        
        .clickable-line:hover {
          text-decoration: underline;
        }
        
        .code-preview {
          font-family: 'Consolas', 'Courier New', monospace;
          color: var(--vscode-editor-foreground);
          opacity: 0.8;
          font-size: 12px;
        }
        
        .summary {
          display: flex;
          gap: 24px;
          margin-bottom: 16px;
          padding: 12px;
          background: var(--vscode-editor-inactiveSelectionBackground);
          border-radius: 4px;
        }
        
        .summary-item {
          display: flex;
          flex-direction: column;
        }
        
        .summary-label {
          font-size: 11px;
          text-transform: uppercase;
          opacity: 0.7;
          margin-bottom: 4px;
        }
        
        .summary-value {
          font-size: 24px;
          font-weight: 600;
        }
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
          
          // Handle line navigation
          document.querySelectorAll('.clickable-line').forEach(el => {
            el.addEventListener('click', () => {
              const line = parseInt(el.dataset.line)
              window.vscodeApi.postMessage({
                command: 'navigateToLine',
                line: line
              })
            })
          })
        })
        
        // VS Code API
        window.vscodeApi = acquireVsCodeApi()
      </script>
    </head>
    <body>
      <h1>Control Flow Analysis: ${escapeHtml(result.functionName)}()</h1>
      
      <div class="summary">
        <div class="summary-item">
          <div class="summary-label">Cyclomatic Complexity</div>
          <div class="summary-value">${result.cyclomatic}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Cognitive Complexity</div>
          <div class="summary-value">${result.cognitive}</div>
        </div>
      </div>

      <h2>📊 Control Flow Graph</h2>
      <div class="container">
        <div class="mermaid"></div>
      </div>

      <h2>📋 Cyclomatic Complexity Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Cost</th>
            <th>Line</th>
            <th>Code Preview</th>
          </tr>
        </thead>
        <tbody>
          ${cyclomaticRows || '<tr><td colspan="4"><em>Base complexity: +1</em></td></tr>'}
        </tbody>
      </table>

      <h2>🧠 Cognitive Complexity Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Cost</th>
            <th>Line</th>
            <th>Code Preview</th>
          </tr>
        </thead>
        <tbody>
          ${cognitiveRows || '<tr><td colspan="4"><em>No complexity contributors</em></td></tr>'}
        </tbody>
      </table>
    </body>
  </html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
