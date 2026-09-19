import PageTitle from '@/shared/ui/PageTitle'
import { ProductControls, ProductList, Slider } from '@/components/home'

export default function HomePage() {
  return (
    <>
      <PageTitle title="E-Commerce" />
      <Slider />
      <ProductControls />
      <ProductList />
    </>
  )
}
