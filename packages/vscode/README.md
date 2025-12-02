# Onion Tears

VS Code extension that measures cyclomatic and cognitive complexity for TypeScript code.

## Features

- **Cyclomatic Complexity**: Measures the number of linearly independent paths through code
- **Cognitive Complexity**: Measures how difficult code is to understand
- **CodeLens Integration**: Shows complexity metrics inline above each function
- **Mermaid Diagrams**: Generate control flow visualizations
- **Configurable Thresholds**: Set warning and error levels for complexity

## Installation

1. Download the latest `.vsix` file from releases
2. In VS Code, run: Extensions > Install from VSIX...
3. Select the downloaded `.vsix` file

Or build from source:

```bash
pnpm install
pnpm package:vscode
```

Then install the generated `dist/onion-tears-1.0.0.vsix` file.

## Usage

### CodeLens

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

### Settings

Configure thresholds in VS Code settings:

```json
{
  "onionTears.complexity.cyclomaticWarning": 10,
  "onionTears.complexity.cyclomaticError": 20
}
```

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
