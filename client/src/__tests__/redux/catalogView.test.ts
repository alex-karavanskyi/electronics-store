import reducer, {
  setListView,
  setGridView,
} from '@/redux/features/catalogViewSlice'
it('only owns display mode, independently of catalog filters', () => {
  expect(reducer(undefined, setListView())).toEqual({ grid_view: false })
  expect(reducer(undefined, setGridView())).toEqual({ grid_view: true })
})
