import type { FileComplexityResult } from '@onion-tears/core'
import { getThresholdStatusBadge } from './util.js'

export function createReport(fileResults: FileComplexityResult[]): string {
  const rows = fileResults
    .map(({ fileName, results }) => {
      if (results.length === 0) return ''
      return results
        .map((r) => {
          const badge = getThresholdStatusBadge(r.thresholdStatus)
          const status = r.thresholdStatus ?? 'ok'
          return `<tr data-status="${status}">
            <td>${fileName}</td>
            <td>${r.line}</td>
            <td>${r.functionName}()</td>
            <td>${badge}</td>
            <td>${r.cyclomatic}</td>
            <td>${r.cognitive}</td>
          </tr>`
        })
        .join('')
    })
    .join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Onion Tears Complexity Report</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; margin: 24px; }
      h1 { font-size: 20px; margin-bottom: 12px; }
      .controls { margin: 12px 0 16px; display: flex; gap: 8px; align-items: center; }
      .controls button { padding: 6px 10px; border: 1px solid #ccc; background: #fff; border-radius: 6px; cursor: pointer; }
      .controls button.active { background: #f0f7ff; border-color: #70a5ff; }
      table { width: 100%; border-collapse: collapse; }
      thead th { text-align: left; font-weight: 600; border-bottom: 2px solid #ccc; padding: 8px; }
      tbody td { border-bottom: 1px solid #eee; padding: 8px; }
      .badge { font-size: 14px; }
    </style>
  </head>
  <body>
    <h1>Onion Tears Complexity Report</h1>
    <div class="controls">
      <span>Filter:</span>
      <button data-filter="all" class="active">All</button>
      <button data-filter="errors">Errors</button>
      <button data-filter="warnings">Warnings</button>
      <button data-filter="ok">OK</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Line</th>
          <th>Function</th>
          <th>Threshold</th>
          <th>Cyclomatic</th>
          <th>Cognitive</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <script>
      (function(){
        const buttons = document.querySelectorAll('.controls button');
        const tbody = document.querySelector('tbody');
        const functionRows = Array.from(tbody.querySelectorAll('tr'));
        function setActive(btn){
          buttons.forEach(b => b.classList.toggle('active', b === btn));
        }
        function applyFilter(filter){
          const map = { errors: 'error', warnings: 'warning', ok: 'ok', all: 'all' };
          const target = map[filter] || 'all';
          functionRows.forEach(row => {
            const status = row.getAttribute('data-status');
            const show = target === 'all' ? true : status === target;
            row.style.display = show ? '' : 'none';
          });
        }
        buttons.forEach(btn => {
          btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            setActive(btn);
            applyFilter(filter);
          });
        });
        // Initialize with current active button
        const active = document.querySelector('.controls button.active');
        if (active) applyFilter(active.getAttribute('data-filter'));
      })();
    </script>
  </body>
</html>`
}
