import { buildMultiLookup } from './build-multi-lookup'

describe('buildMultiLookup', () => {
  it('should build a lookup object from an array of elements with multiple values', () => {
    const assetOne = { id: 1, uuid: '111', data: { title: { gpms_id: '123' } } }
    const assetTwo = { id: 2, uuid: '222', data: { title: { gpms_id: '123' } } }
    const assetThree = { id: 3, uuid: '333', data: { title: { gpms_id: '456' } } }

    const result  = buildMultiLookup([assetOne, assetTwo, assetThree], (asset) => asset.data.title.gpms_id)

    expect(result).toEqual({
      '123': [assetOne, assetTwo],
      '456': [assetThree],
    })
  })
})