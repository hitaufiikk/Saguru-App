/** Preserve mounted forms only for the same previously authorized identity. */
export function createSessionAccessGate() {
  let authorizedId: string | null = null
  let generation = 0
  return {
    begin(userId: string | null) {
      const current = ++generation
      const keepMounted = userId !== null && authorizedId === userId
      if (!keepMounted) authorizedId = null
      return {
        keepMounted,
        isCurrent: () => current === generation,
        resolve(allowed: boolean) {
          if (current !== generation) return false
          authorizedId = allowed ? userId : null
          return true
        },
      }
    },
    invalidate() { generation++ },
  }
}
