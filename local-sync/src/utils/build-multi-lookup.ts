type AllowedType = Partial<Asset> | Partial<SourceAsset> | Partial<Title>

/**
 * Builds a lookup object from an array of elements 
 * Object contains multiple elements for a given key
 * The key is determined by the keyGetter function and should be a unique identifier across elements
 */
export const buildMultiLookup = <Element extends AllowedType>(elements: Element[], keyGetter: (element: Element) => string) => {
  return elements.reduce<Record<string, Element[]>>((lookup, element) => {
    const keyValue = keyGetter(element)
    if (!lookup[keyValue]) {
      lookup[keyValue] = []
    }
    lookup[keyValue].push(element)
    return lookup
  }, {})
}
