import ts from 'typescript'
import { test, expect, describe } from 'vitest'
import {
  analyzeSourceFile,
  calculateCyclomaticComplexity,
  calculateCognitiveComplexity,
} from './core.js'
import { createConfiguration } from './config.js'
import { isFunctionNode } from './util.js'

const defaultConfiguration = createConfiguration()

describe('analyzeSourceFile', () => {
  test('should calculate complexity 1/0 for simple function with no branches', () => {
    const sourceFile = toSourceFile(`
      function isEven(num: number): boolean {
        return num % 2 === 0
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)

    expect(result).toBeDefined()
    expect(result?.line).toBe(2)
    expect(result?.functionName).toBe('isEven')
    expect(result?.cyclomatic).toBe(1)
    expect(result?.cognitive).toBe(0)
  })

  test('should calculate complexity 2/1 for function with if-else statement', () => {
    const sourceFile = toSourceFile(`
      function getAge(age: number): string {
        if (age < 10) {
          return "Child"
        } else {
          return "Adult"
        }
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)

    expect(result).toBeDefined()
    expect(result?.line).toBe(2)
    expect(result?.functionName).toBe('getAge')
    expect(result?.cyclomatic).toBe(2)
    expect(result?.cognitive).toBe(1)
  })

  test('should apply nesting penalties to cognitive complexity for nested conditions', () => {
    const sourceFile = toSourceFile(`
      function nestedExample(arr: number[]) {
        if (arr.length > 0) {
          for (const num of arr) {
            if (num > 10) {
              console.log(num)
            }
          }
        }
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)

    expect(result).toBeDefined()
    expect(result?.line).toBe(2)
    expect(result?.functionName).toBe('nestedExample')
    expect(result?.cyclomatic).toBe(4)
    expect(result?.cognitive).toBe(6)
  })

  test('should parse multiple functions in a file', () => {
    const sourceFile = toSourceFile(`
      function firstFunction() {
        return true;
      }

      function secondFunction() {
        if (false) {
          return false;
        }
        return true;
      }
    `)

    const results = analyzeSourceFile(sourceFile, defaultConfiguration)

    expect(results.length).toBe(2)

    const firstResult = results.find((r) => r.functionName === 'firstFunction')
    const secondResult = results.find((r) => r.functionName === 'secondFunction')

    expect(firstResult).toBeDefined()
    expect(firstResult?.cyclomatic).toBe(1)
    expect(firstResult?.cognitive).toBe(0)

    expect(secondResult).toBeDefined()
    expect(secondResult?.cyclomatic).toBe(2)
    expect(secondResult?.cognitive).toBe(1)
  })

  test('should return thresholdStatus of error when cyclomatic exceeds error threshold', () => {
    const config = createConfiguration({ cyclomaticError: 4 })
    const sourceFile = toSourceFile(`
      function complexFunction() {
        if (true) {
          for (let i = 0; i < 10; i++) {
            while (false) {
              console.log(i);
            }
          }
        }
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, config)
    expect(result?.thresholdStatus).toBe('error')
  })

  test('should return thresholdStatus of warning when cyclomatic exceeds warning threshold but not error', () => {
    const config = createConfiguration({ cyclomaticWarning: 3, cyclomaticError: 5 })
    const sourceFile = toSourceFile(`
      function somewhatComplexFunction() {
        if (true) {
          for (let i = 0; i < 10; i++) {
            console.log(i);
          }
        }
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, config)
    expect(result?.thresholdStatus).toBe('warning')
  })

  test('should return undefined thresholdStatus when cyclomatic is below thresholds', () => {
    const config = createConfiguration({ cyclomaticWarning: 5, cyclomaticError: 10 })
    const sourceFile = toSourceFile(`
      function simpleFunction() {
        return 42;
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, config)
    expect(result?.thresholdStatus).toBeUndefined()
  })

  test('should analyze arrow functions correctly', () => {
    const sourceFile = toSourceFile(`
      const multiply = (a: number, b: number) => a * b
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(result).toBeDefined()
    expect(result?.functionName).toBe('multiply')
    expect(result?.cyclomatic).toBe(1)
    expect(result?.cognitive).toBe(0)
  })

  test('should analyze method declarations in classes', () => {
    const sourceFile = toSourceFile(`
      class Calculator {
        add(a: number, b: number): number {
          return a + b
        }

        divide(a: number, b: number): number {
          if (b === 0) {
            throw new Error('Division by zero')
          }
          return a / b
        }
      }
    `)

    const results = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(results.length).toBe(2)

    const addMethod = results.find((r) => r.functionName === 'add')
    expect(addMethod?.cyclomatic).toBe(1)
    expect(addMethod?.cognitive).toBe(0)

    const divideMethod = results.find((r) => r.functionName === 'divide')
    expect(divideMethod?.cyclomatic).toBe(2)
    expect(divideMethod?.cognitive).toBe(1)
  })

  test('should count each case clause in switch statements', () => {
    const sourceFile = toSourceFile(`
      function getDayType(day: number): string {
        switch (day) {
          case 1:
          case 2:
          case 3:
          case 4:
          case 5:
            return 'Weekday'
          case 6:
          case 7:
            return 'Weekend'
          default:
            return 'Invalid'
        }
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(result).toBeDefined()
    expect(result?.cyclomatic).toBe(8) // 7 cases + default
  })

  test('should count ternary operators as decision points', () => {
    const sourceFile = toSourceFile(`
      function isAdult(age: number): string {
        return age >= 18 ? 'Adult' : 'Minor'
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(result?.cyclomatic).toBe(2)
    expect(result?.cognitive).toBe(1)
  })

  test('should count logical operators (&&, ||) as decision points', () => {
    const sourceFile = toSourceFile(`
      function validate(name: string, age: number): boolean {
        return name.length > 0 && age > 0 && age < 120
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(result?.cyclomatic).toBe(3) // base 1 + two && operators
    expect(result?.cognitive).toBe(2)
  })

  test('should count catch clauses as decision points', () => {
    const sourceFile = toSourceFile(`
      function parseJSON(json: string): object {
        try {
          return JSON.parse(json)
        } catch (error) {
          return {}
        }
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(result?.cyclomatic).toBe(2) // base 1 + catch clause
    expect(result?.cognitive).toBe(1)
  })

  test('should count while and do-while loops as decision points', () => {
    const sourceFile = toSourceFile(`
      function countDown(n: number): void {
        while (n > 0) {
          console.log(n)
          n--
        }
        
        do {
          console.log('At least once')
        } while (false)
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(result?.cyclomatic).toBe(3) // base 1 + while + do-while
    expect(result?.cognitive).toBe(2)
  })

  test('should count for-in and for-of loops as decision points', () => {
    const sourceFile = toSourceFile(`
      function processItems(items: string[], obj: Record<string, any>): void {
        for (const item of items) {
          console.log(item)
        }
        
        for (const key in obj) {
          console.log(key)
        }
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(result?.cyclomatic).toBe(3) // base 1 + for-of + for-in
    expect(result?.cognitive).toBe(2)
  })

  test('should count nullish coalescing (??) in cognitive but not cyclomatic complexity', () => {
    const sourceFile = toSourceFile(`
      function getValue(input: string | null): string {
        return input ?? 'default'
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(result?.cyclomatic).toBe(1) // ?? doesn't add to cyclomatic
    expect(result?.cognitive).toBe(1) // but does add to cognitive
  })

  test('should apply increasing nesting penalties for deeply nested conditions', () => {
    const sourceFile = toSourceFile(`
      function deepNesting(a: number, b: number, c: number): number {
        if (a > 0) {
          if (b > 0) {
            if (c > 0) {
              return a + b + c
            }
          }
        }
        return 0
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(result?.cyclomatic).toBe(4) // 3 ifs + base 1
    expect(result?.cognitive).toBe(6) // 1 + 2 + 3 (nesting penalty)
  })

  test('should skip import and export declarations when analyzing', () => {
    const sourceFile = toSourceFile(`
      import fs from 'node:fs'
      import { someFunction } from './other'
      
      export function exported() {
        return true
      }
      
      export default function() {
        return false
      }
    `)

    const results = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(results.length).toBe(2) // Only functions, not imports/exports
  })

  test('should assign variable name to anonymous functions', () => {
    const sourceFile = toSourceFile(`
      const callback = function() {
        return 42
      }
    `)

    const [result] = analyzeSourceFile(sourceFile, defaultConfiguration)
    expect(result?.functionName).toBe('callback')
  })
})

describe('calculateCyclomaticComplexity', () => {
  test('should return 1 for function with no decision points', () => {
    const sourceFile = toSourceFile(`
      function simple() {
        return 42
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCyclomaticComplexity(funcNode, sourceFile).score).toBe(1)
  })

  test('should count if statement as +1 decision point', () => {
    const sourceFile = toSourceFile(`
      function withIf(x: number) {
        if (x > 0) return true
        return false
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCyclomaticComplexity(funcNode, sourceFile).score).toBe(2)
  })

  test('should count each case in switch statement', () => {
    const sourceFile = toSourceFile(`
      function withSwitch(x: number) {
        switch (x) {
          case 1: return 'one'
          case 2: return 'two'
          case 3: return 'three'
          default: return 'other'
        }
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCyclomaticComplexity(funcNode, sourceFile).score).toBe(4) // base 1 + 3 cases (default doesn't count)
  })

  test('should count logical operators && and ||', () => {
    const sourceFile = toSourceFile(`
      function withLogical(a: boolean, b: boolean, c: boolean) {
        return a && b || c
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCyclomaticComplexity(funcNode, sourceFile).score).toBe(3) // base 1 + && + ||
  })

  test('should count while, do-while, for, for-of, for-in loops', () => {
    const sourceFile = toSourceFile(`
      function withLoops(arr: number[]) {
        while (true) break
        do { break } while (true)
        for (let i = 0; i < 10; i++) break
        for (const x of arr) break
        for (const key in arr) break
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCyclomaticComplexity(funcNode, sourceFile).score).toBe(6) // base 1 + 5 loops
  })

  test('should count ternary operator as decision point', () => {
    const sourceFile = toSourceFile(`
      function withTernary(x: number) {
        return x > 0 ? 'positive' : 'non-positive'
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCyclomaticComplexity(funcNode, sourceFile).score).toBe(2)
  })

  test('should count catch clause as decision point', () => {
    const sourceFile = toSourceFile(`
      function withTryCatch() {
        try {
          return risky()
        } catch (e) {
          return null
        }
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCyclomaticComplexity(funcNode, sourceFile).score).toBe(2)
  })

  test('should accumulate multiple decision points', () => {
    const sourceFile = toSourceFile(`
      function complex(a: number, b: number) {
        if (a > 0) {
          for (let i = 0; i < b; i++) {
            if (i % 2 === 0 && i > 5) {
              return true
            }
          }
        }
        return false
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCyclomaticComplexity(funcNode, sourceFile).score).toBe(5) // base 1 + if + for + if + &&
  })
})

describe('calculateCognitiveComplexity', () => {
  test('should return 0 for function with no control flow', () => {
    const sourceFile = toSourceFile(`
      function simple() {
        return 42
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(0)
  })

  test('should add +1 for if statement at nesting level 0', () => {
    const sourceFile = toSourceFile(`
      function withIf(x: number) {
        if (x > 0) return true
        return false
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(1)
  })

  test('should apply nesting penalty to nested if statements', () => {
    const sourceFile = toSourceFile(`
      function nested(a: number, b: number) {
        if (a > 0) {
          if (b > 0) {
            return true
          }
        }
        return false
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(3) // outer if: 1, inner if: 1 + 1 (nesting)
  })

  test('should count logical operators without nesting penalty', () => {
    const sourceFile = toSourceFile(`
      function withLogical(a: boolean, b: boolean, c: boolean) {
        return a && b || c
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(2) // && +1, || +1, no nesting
  })

  test('should count nullish coalescing operator', () => {
    const sourceFile = toSourceFile(`
      function withNullish(x: string | null) {
        return x ?? 'default'
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(1)
  })

  test('should apply nesting penalty to loops', () => {
    const sourceFile = toSourceFile(`
      function withLoop(arr: number[]) {
        for (const x of arr) {
          if (x > 0) {
            return true
          }
        }
        return false
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(3) // for: 1, if: 1 + 1 (nested)
  })

  test('should apply increasing nesting penalties for deep nesting', () => {
    const sourceFile = toSourceFile(`
      function deepNest(a: number, b: number, c: number) {
        if (a > 0) {
          if (b > 0) {
            if (c > 0) {
              return true
            }
          }
        }
        return false
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(6) // 1 + 2 + 3
  })

  test('should count switch statements with nesting', () => {
    const sourceFile = toSourceFile(`
      function withSwitch(x: number) {
        switch (x) {
          case 1: return 'one'
          case 2: return 'two'
          default: return 'other'
        }
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(1)
  })

  test('should count ternary operators with nesting', () => {
    const sourceFile = toSourceFile(`
      function withTernary(x: number) {
        return x > 0 ? 'positive' : 'non-positive'
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(1)
  })

  test('should count catch clauses with nesting', () => {
    const sourceFile = toSourceFile(`
      function withTryCatch() {
        try {
          return risky()
        } catch (e) {
          return null
        }
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(1)
  })

  test('should handle complex nested structures', () => {
    const sourceFile = toSourceFile(`
      function complex(arr: number[]) {
        if (arr.length > 0) {
          for (const num of arr) {
            if (num > 10 && num < 100) {
              while (num > 0) {
                if (num % 2 === 0) {
                  return true
                }
              }
            }
          }
        }
        return false
      }
    `)
    const funcNode = findFirstFunction(sourceFile)
    // if: 1, for: 1+1=2, inner if: 1+2=3, &&: 1, while: 1+3=4, innermost if: 1+4=5
    // Total: 1 + 2 + 3 + 1 + 4 + 5 = 16
    expect(calculateCognitiveComplexity(funcNode, sourceFile).score).toBe(16)
  })
})

function toSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true)
}

function findFirstFunction(sourceFile: ts.SourceFile): ts.Node {
  let funcNode: ts.Node | undefined

  const visitor = (node: ts.Node): void => {
    if (funcNode) return

    if (isFunctionNode(node)) {
      funcNode = node
      return
    }

    ts.forEachChild(node, visitor)
  }

  visitor(sourceFile)

  if (!funcNode) {
    throw new Error('No function found in source file')
  }

  return funcNode
}
