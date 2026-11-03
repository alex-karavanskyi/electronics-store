// jsdom has no Web Locks. Model the exclusive origin-wide queue, keeping all
// storage and application logic real. Reentrant requests wait for the holder.
export function installStorageLocks() {
  let tail: Promise<unknown> = Promise.resolve()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (_name: string, run: () => unknown) => {
        const next = tail.then(run)
        tail = next.catch(() => undefined)
        return next
      },
    },
  })
}
