import type ts from 'typescript'

export interface FileComplexityResult {
  fileName: string
  results: FunctionComplexityResult[]
}

export interface FunctionComplexityResult {
  functionName: string
  line: number
  cyclomatic: number
  cognitive: number
  astNode: ts.Node
  thresholdStatus: ThresholdStatus
}

export type ThresholdStatus = 'warning' | 'error' | undefined

export interface Config {
  /**
   * Cyclomatic complexity value above which an error should be issued.
   */
  cyclomaticError: number
  /**
   * Cyclomatic complexity value above which a warning should be issued.
   */
  cyclomaticWarning: number
}
