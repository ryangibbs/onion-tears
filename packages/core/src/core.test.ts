import ts from 'typescript'
import { test, expect, describe } from 'vitest'
import { analyzeSourceFile } from './core.js'
import { createConfiguration } from './config.js'

const defaultConfiguration = createConfiguration()

describe('analyzeSourceFile', () => {
  test('simple function with no branches', () => {
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

  test('function with if statement', () => {
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

  test('nested conditions', () => {
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
})

function toSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true)
}
