export const chunk = <T>(arr: T[], size: number) => {
  const res = []

  for (let i = 0; i < arr.length; i += size) {
    const chunk = arr.slice(i, i + size)
    res.push(chunk)
  }

  return res
}
