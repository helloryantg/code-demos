import { chunk } from './chunk'

describe('chunk', () => {
  test('should split an array into chunks of the specified size', () => {
    const arr = [1, 2, 3, 4, 5]
    const chunkSize = 2
    const result = chunk(arr, chunkSize)
    
    expect(result).toEqual([[1, 2], [3, 4], [5]])
  })

  test('should handle empty arrays', () => {
    const arr: number[] = []
    const chunkSize = 2
    const result = chunk(arr, chunkSize)

    expect(result).toEqual([])
  })

  test('should handle arrays smaller than the chunk size', () => {
    const arr = [1]
    const chunkSize = 2
    const result = chunk(arr, chunkSize)
    
    expect(result).toEqual([[1]])
  })
})