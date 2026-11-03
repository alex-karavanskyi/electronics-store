import * as storage from '@/shared/lib/favoritesStorage'
import { randomUUID } from 'node:crypto'
import { installStorageLocks } from '../support/locks'

Object.defineProperty(crypto, 'randomUUID', {
  value: randomUUID,
  configurable: true,
})

beforeEach(() => {
  localStorage.clear()
  installStorageLocks()
})
afterEach(() => jest.restoreAllMocks())

it('atomically binds guest IDs to one account and recovers the same batch after reload', async () => {
  await storage.saveFavoriteIds(['one', 'two'])
  const first = await storage.stageGuestImport('user_a', ['one', 'two'])
  expect(first).toMatchObject({ userId: 'user_a', ids: ['one', 'two'] })
  expect(storage.loadGuestFavorites().ids).toEqual([])
  expect(await storage.stageGuestImport('user_b', [])).toBeNull()
  expect(await storage.stageGuestImport('user_a', [])).toEqual(first)
  await storage.saveFavoriteIds(['new-guest'])
  expect(await storage.stageGuestImport('user_a', ['new-guest'])).toEqual(first)
  await storage.completeGuestImport('user_b', first!.batchId)
  expect(await storage.stageGuestImport('user_a', ['new-guest'])).toEqual(first)
  await storage.completeGuestImport('user_a', first!.batchId)
  const next = await storage.stageGuestImport('user_a', ['new-guest'])
  expect(next?.ids).toEqual(['new-guest'])
  expect(next?.batchId).not.toBe(first?.batchId)
})

it('never sends a transfer that cannot be saved and leaves original guest IDs recoverable', async () => {
  await storage.saveFavoriteIds(['one'])
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  await expect(
    Promise.resolve().then(() => storage.stageGuestImport('user_a', ['one']))
  ).rejects.toThrow('quota')
  expect(storage.loadGuestFavorites().ids).toEqual(['one'])
})

it('does not erase another pending account when guest favorites are edited', async () => {
  await storage.saveFavoriteIds(['one'])
  const a = await storage.stageGuestImport('user_a', ['one'])
  await storage.saveFavoriteIds(['two'])
  const b = await storage.stageGuestImport('user_b', ['two'])
  await storage.completeGuestImport('user_b', b!.batchId)
  expect(await storage.stageGuestImport('user_a', [])).toEqual(a)
  expect(storage.loadGuestFavorites().ids).toEqual([])
})

it('serializes two tabs trying to claim the same guest IDs for different accounts', async () => {
  await storage.saveFavoriteIds(['one'])
  const read = Storage.prototype.getItem
  let second: ReturnType<typeof storage.stageGuestImport> | undefined
  let entered = false
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
    this: Storage,
    key
  ) {
    const snapshot = read.call(this, key)
    if (!entered) {
      entered = true
      // Emulate tab B starting after A reads but before A writes its claim.
      second = storage.stageGuestImport('user_b', [])
    }
    return snapshot
  })
  const first = await storage.stageGuestImport('user_a', [])
  const other = await second
  expect([first, other].filter(Boolean)).toHaveLength(1)
  expect(
    JSON.parse(localStorage.getItem('volt_favorites')!).pendingImports
  ).toHaveLength(1)
})

it('applies guest edits to current storage after another tab claims the old list', async () => {
  await storage.saveFavoriteIds(['one'])
  const staleGuest = storage.loadGuestFavorites()
  const transfer = storage.stageGuestImport('user_a', [])
  const edit = storage.updateGuestFavorites(ids => [...ids, 'two'], staleGuest)
  const batch = await transfer
  expect(await edit).toEqual({ ids: ['two'], storageAvailable: true })
  expect(storage.loadGuestFavorites().ids).toEqual(['two'])
  expect(await storage.stageGuestImport('user_a', [])).toEqual(batch)
})

it('preserves concurrent guest edits when acknowledging an import', async () => {
  await storage.saveFavoriteIds(['one'])
  const batch = await storage.stageGuestImport('user_a', [])
  await Promise.all([
    storage.completeGuestImport('user_a', batch!.batchId),
    storage.updateGuestFavorites(ids => [...ids, 'two'], {
      ids: [],
      storageAvailable: true,
    }),
  ])
  expect(storage.loadGuestFavorites().ids).toEqual(['two'])
  expect(
    JSON.parse(localStorage.getItem('volt_favorites')!).pendingImports
  ).toEqual([])
})

it('leaves guest data intact when cross-tab locking is unavailable', async () => {
  await storage.saveFavoriteIds(['one'])
  Object.defineProperty(navigator, 'locks', {
    value: undefined,
    configurable: true,
  })
  await expect(storage.stageGuestImport('user_a', [])).rejects.toThrow(
    'Web Locks'
  )
  expect(storage.loadGuestFavorites().ids).toEqual(['one'])
})
