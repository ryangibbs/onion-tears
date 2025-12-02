import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { analyzeSourceFile, generateMermaidForFunction } from '@onion-tears/core'
import type { Config, FileComplexityResult } from '@onion-tears/core'
import { cleanFilesFromDirectory, getThresholdStatusBadge } from './util.js'

export function runFileCommand(
  filePath: string,
  generateGraphs: boolean,
  outputDir: string,
  config: Config,
) {
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

  displayResults([result])

  // Generate Mermaid graph files if --graph
  if (generateGraphs) {
    cleanFilesFromDirectory(outputDir)
    console.log('Generating control flow graphs...\n')
    result.results.forEach((result) => {
      const output = generateMermaidForFunction(result)
      const outputPath = path.join(outputDir, `${result.functionName}.mermaid`)
      fs.writeFileSync(outputPath, output)

      console.log(`✓ ${result.functionName}.mermaid`)
    })

    console.log(`\n✓ Generated ${result.results.length} graph(s) in ${outputDir}/`)
  }
}

export function runProjectCommand(dir: string, exclude: string[], config: Config) {
  const projectPath = path.resolve(dir)

  // Try to use tsconfig.json first
  const configPath = ts.findConfigFile(projectPath, ts.sys.fileExists, 'tsconfig.json')
  if (!configPath) {
    throw new Error(`tsconfig.json not found in directory: ${projectPath}`)
  }

  console.log(`Using TypeScript project: ${configPath}\n`)
  analyzeTypescriptProject(configPath, exclude, config)
}

function analyzeTypescriptProject(configPath: string, exclude: string[], config: Config) {
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
    // Filter out declaration files and node_modules
    if (sf.isDeclarationFile) return false
    const filePath = sf.fileName
    return !exclude.some((pattern) => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        return regex.test(filePath)
      }
      return filePath.includes(pattern)
    })
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
  displayResults(results)
}

function displayResults(fileResults: FileComplexityResult[]) {
  fileResults.forEach(({ fileName, results }) => {
    // Exclude files with no results
    if (results.length === 0) return

    console.log(`\n-- Complexity Report for ${fileName} --`)
    let maxCyclomaticComplexity = 0
    let totalCyclomaticComplexity = 0

    let maxCognitiveComplexity = 0
    let totalCognitiveComplexity = 0

    results.forEach((result) => {
      console.log(`[Line] ${result.line} Function: ${result.functionName}()`)
      console.log(
        `${getThresholdStatusBadge(result.thresholdStatus)} Cyclomatic Complexity: ${result.cyclomatic}`,
      )
      console.log(
        `${getThresholdStatusBadge(result.thresholdStatus)} Cognitive Complexity: ${result.cognitive}`,
      )
      console.log('\n')

      maxCyclomaticComplexity = Math.max(maxCyclomaticComplexity, result.cyclomatic)
      totalCyclomaticComplexity += result.cyclomatic

      maxCognitiveComplexity = Math.max(maxCognitiveComplexity, result.cognitive)
      totalCognitiveComplexity += result.cognitive
    })

    const averageCyclomaticComplexity =
      results.length > 0 ? (totalCyclomaticComplexity / results.length).toFixed(2) : '0'

    const averageCognitiveComplexity =
      results.length > 0 ? (totalCognitiveComplexity / results.length).toFixed(2) : '0'

    console.log('-------------------------------------')
    console.log(`Total Functions Found: ${results.length}`)
    console.log(`Average Cyclomatic Complexity: ${averageCyclomaticComplexity}`)
    console.log(`Maximum Cyclomatic Complexity: ${maxCyclomaticComplexity}`)
    console.log(`Average Cognitive Complexity: ${averageCognitiveComplexity}`)
    console.log(`Maximum Cognitive Complexity: ${maxCognitiveComplexity}`)
    console.log('-------------------------------------\n')
  })
}
