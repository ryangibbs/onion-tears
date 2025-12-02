export function getAge(age: number): string {
  if (age < 10) {
    return 'Child'
  } else {
    return 'Adult'
  }
}

export function isEven(num: number): boolean {
  return num % 2 === 0
}

export function example(arr: number[]) {
  // 0
  if (arr.length > 0) {
    // +1 (if)
    for (const num of arr) {
      // +1 (for) +1 (nested in if) = +2
      if (num > 10) {
        // +1 (if) +2 (nested 2 levels) = +3
        console.log(num)
      }
    }
  }
}
