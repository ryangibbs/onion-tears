import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { analyzeSourceFile, generateMermaidForFunction } from '@onion-tears/core'
import type { Config, FileComplexityResult } from '@onion-tears/core'
import { cleanFilesFromDirectory } from './util.js'
import { createReport } from './report.js'

const outputDir = path.join(process.cwd(), 'onion-tears')

export function runFileCommand(filePath: string, generateGraphs: boolean, config: Config) {
  const fullPath = path.resolve(filePath)

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found at path: ${fullPath}`)
  }

  const sourceFile = ts.createSourceFile(
    path.basename(filePath),
    fs.readFileSync(fullPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )

  const result: FileComplexityResult = {
    fileName: path.basename(filePath),
    results: analyzeSourceFile(sourceFile, config),
  }

  // Always write HTML report to outputDir
  writeHtmlReport([result])

  // Generate Mermaid graph files if --graph
  if (generateGraphs) {
    const graphDir = path.join(outputDir, 'graphs')
    cleanFilesFromDirectory(graphDir)
    console.log('Generating control flow graphs...\n')
    result.results.forEach((result) => {
      const output = generateMermaidForFunction(result)
      const outputPath = path.join(graphDir, `${result.functionName}.mermaid`)
      fs.writeFileSync(outputPath, output)

      console.log(`✓ ${result.functionName}.mermaid`)
    })

    console.log(`\n✓ Generated ${result.results.length} graph(s) in ${graphDir}/`)
  }
}

export function runProjectCommand(dir: string, config: Config) {
  const projectPath = path.resolve(dir)

  // Try to use tsconfig.json first
  const configPath = ts.findConfigFile(projectPath, ts.sys.fileExists, 'tsconfig.json')
  if (!configPath) {
    throw new Error(`tsconfig.json not found in directory: ${projectPath}`)
  }

  console.log(`Using TypeScript project: ${configPath}\n`)
  analyzeTypescriptProject(configPath, config)
}

function analyzeTypescriptProject(configPath: string, config: Config) {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  )

  const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
  })

  const sourceFiles = program.getSourceFiles().filter((sf) => {
    // Filter out declaration files
    if (sf.isDeclarationFile) return false
    // Exclude test files like *.test.ts and *.test.tsx
    const base = path.basename(sf.fileName)
    if (base.endsWith('.test.ts') || base.endsWith('.test.tsx')) return false
    return true
  })

  console.log(`Found ${sourceFiles.length} files in project\n`)

  const results: FileComplexityResult[] = []
  for (const sourceFile of sourceFiles) {
    // get file path relative to tsconfig.json directory of the project e.g src/dir/file.ts
    const relativeFilePath = path.relative(path.dirname(configPath), sourceFile.fileName)
    results.push({
      fileName: relativeFilePath,
      results: analyzeSourceFile(sourceFile, config),
    })
  }

  console.log(`\nAnalyzed ${sourceFiles.length} files\n`)
  writeHtmlReport(results)
}

// Console summary output removed; HTML report is always generated instead.

function writeHtmlReport(fileResults: FileComplexityResult[]) {
  const outputPath = path.join(outputDir, 'complexity-report.html')
  const html = createReport(fileResults)
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(outputPath, html, 'utf8')
  console.log(`\n✓ HTML report written to ${outputPath}\n`)
}
