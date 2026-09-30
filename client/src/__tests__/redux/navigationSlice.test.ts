import navigationReducer, {
  closeNavigation,
  toggleNavigation,
} from '@/redux/features/navigationSlice'

describe('navigationSlice', () => {
  const initialState = {
    isOpen: false,
  }

  it('should return the initial state when passed an empty action', () => {
    const result = navigationReducer(undefined, { type: '' })
    expect(result).toEqual(initialState)
  })

  it('should handle toggleNavigation', () => {
    const state = navigationReducer(initialState, toggleNavigation())
    expect(state).toEqual({ isOpen: true })
  })

  it('should handle closeNavigation', () => {
    const state = { isOpen: true }
    const result = navigationReducer(state, closeNavigation())
    expect(result).toEqual({ isOpen: false })
  })

  it('should handle toggleNavigation and closeNavigation in sequence', () => {
    let state = navigationReducer(initialState, toggleNavigation())
    expect(state).toEqual({ isOpen: true })

    state = navigationReducer(state, closeNavigation())
    expect(state).toEqual({ isOpen: false })
  })
})
