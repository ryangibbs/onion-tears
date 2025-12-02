# Onion Tears

Code complexity analysis tool for TypeScript with VS Code extension and CLI.

## Features

- **Cyclomatic Complexity**: Measures the number of linearly independent paths through code
- **Cognitive Complexity**: Measures how difficult code is to understand
- **VS Code Extension**: CodeLens integration showing metrics inline above functions
- **CLI Tool**: Analyze files and projects from the command line
- **Mermaid Diagrams**: Generate control flow visualizations
- **Configurable Thresholds**: Set warning and error levels for complexity
- **Multiple Config Options**: Configure via file, CLI params, or VS Code settings

## Installation

### VS Code Extension

1. Download the latest `.vsix` file from releases
2. In VS Code, run: Extensions > Install from VSIX...
3. Select the downloaded `.vsix` file

Or build from source:

```bash
pnpm install
pnpm package:vscode
```

Then install the generated `dist/onion-tears-1.0.0.vsix` file.

### CLI Tool

Install globally:

```bash
pnpm install -g @onion-tears/cli
```

Or use directly with `pnpm dlx`:

```bash
pnpm dlx @onion-tears/cli project
```

## Usage

### VS Code Extension

The extension automatically shows complexity metrics above each function in TypeScript files:

```
🟢 Cyclomatic: 3 | Cognitive: 2 | Show Control Flow Graph
function example(x: number) { ... }
```

Icons indicate severity:
- 🟢 Green: Below warning threshold
- 🟡 Yellow: Above warning threshold
- 🔴 Red: Above error threshold

Click "Show Control Flow Graph" to visualize the function's control flow as a Mermaid diagram.

Configure thresholds in VS Code settings:

```json
{
  "onionTears.complexity.cyclomaticWarning": 10,
  "onionTears.complexity.cyclomaticError": 20
}
```

### CLI Tool

Analyze a single file:

```bash
onion-tears file src/example.ts
```

Analyze entire project:

```bash
onion-tears project
onion-tears project ./src
```

With custom thresholds:

```bash
onion-tears file src/example.ts --warning 15 --error 30
onion-tears project --warning 15 --error 30
```

Generate Mermaid diagrams:

```bash
onion-tears file src/example.ts --graph --outputDir ./graphs
```

### HTML Report

- The CLI always generates an HTML report.
- For `file` command: report is written to your `--outputDir` as `complexity-report.html` (default `./onion/complexity-report.html`).
- For `project` command: report is written to `./onion/complexity-report.html`.

Open the report in your browser:

```bash
open ./onion/complexity-report.html
```

## Configuration

Configure complexity thresholds using one of these methods (in priority order):

### 1. Config File

Create `.onion-tears.json` in your project root:

```json
{
  "cyclomaticWarning": 10,
  "cyclomaticError": 20
}
```

### 2. package.json

Add an `onionTears` property to your `package.json`:

```json
{
  "name": "my-project",
  "onionTears": {
    "cyclomaticWarning": 10,
    "cyclomaticError": 20
  }
}
```

### 3. CLI Parameters

Override config file settings with CLI flags:

```bash
onion-tears project --warning 15 --error 30
```

### 4. VS Code Settings

For the VS Code extension, configure in settings:

```json
{
  "onionTears.complexity.cyclomaticWarning": 10,
  "onionTears.complexity.cyclomaticError": 20
}
```

**Priority**: CLI params > config file > VS Code settings > defaults (10/20)

## Complexity Metrics

### Cyclomatic Complexity

Counts decision points in code:
- `if`, `else if`, `while`, `for`, `do-while` statements (+1 each)
- `case` clauses in `switch` statements (+1 each)
- Ternary operators `? :` (+1)
- Logical operators `&&`, `||` (+1 each)
- `catch` clauses (+1)

Base complexity starts at 1, so a simple function with no branches has complexity 1.

### Cognitive Complexity

Measures how hard code is to understand:
- Basic control flow structures (+1)
- Nesting multiplier (nested structures add more)
- Logical operators (+1 each, no nesting increment)

Higher cognitive complexity indicates code that's harder to understand and maintain.

## Thresholds Guide

Recommended thresholds:

- **Cyclomatic Complexity**:
  - 1-10: Simple, low risk
  - 11-20: Moderate complexity, medium risk
  - 21-50: Complex, high risk
  - 50+: Very complex, very high risk

- **Cognitive Complexity**:
  - 0-5: Simple
  - 6-10: Moderate
  - 11-15: Complex
  - 15+: Very complex

## Development

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format

# Package extension
pnpm package:vscode
```

## License

ISC
