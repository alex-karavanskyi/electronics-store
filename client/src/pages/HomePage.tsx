import PageTitle from '@/shared/ui/PageTitle'
import { MobileCatalogControlsContainer, CatalogSection, Slider } from '@/components/home'

export default function HomePage() {
  return (
    <>
      <PageTitle title="E-Commerce" />
      <Slider />
      <MobileCatalogControlsContainer />
      <CatalogSection />
    </>
  )
}
