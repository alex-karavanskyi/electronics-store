import { useParams } from 'react-router-dom'
import SingleProduct from '@/components/product/SingleProduct'
import PageTitle from '@/shared/ui/PageTitle'
export default function ProductPage() {
  const { id } = useParams()
  return (
    <>
      <PageTitle title="Product" />
      <SingleProduct key={id} />
    </>
  )
}
