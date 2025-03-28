import { buildLookup } from './build-lookup'

describe('buildLookup', () => {
  test('should build a lookup object from an array of elements with a single value', () => {
    const assetOne = { id: 1, uuid: '111' }
    const assetTwo = { id: 2, uuid: '222' }
    const assetThree = { id: 3, uuid: '333' }

    const result = buildLookup([assetOne, assetTwo, assetThree], (asset) => asset.uuid)

    expect(result).toEqual({
      '111': assetOne,
      '222': assetTwo,
      '333': assetThree,
    })
  })
})