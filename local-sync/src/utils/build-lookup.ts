type AllowedType = Partial<Asset> | Partial<SourceAsset> | Partial<Title>

/**
 * Builds a lookup object from an array of elements 
 * Object contains a single element for a given key
 * The key is determined by the keyGetter function and should be a unique identifier across elements
 */
export const buildLookup = <Element extends AllowedType>(elements: Element[], keyGetter: (element: Element) => string) => {
  return elements.reduce<Record<string, Element>>((lookup, element) => {
    const keyValue = keyGetter(element)
    lookup[keyValue] = element
    return lookup
  }, {})
}
