/** Invalidate outstanding reads when a newer read or mutation starts. */
export function createLatestRequest() {
  let version = 0
  return {
    begin() {
      const current = ++version
      return () => current === version
    },
    invalidate() { version++ },
  }
}
