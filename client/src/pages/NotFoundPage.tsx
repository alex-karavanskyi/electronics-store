import Error from '@/layout/Error'
import PageTitle from '@/shared/ui/PageTitle'
export default function NotFoundPage() {
  return (
    <>
      <PageTitle title="Page not found" />
      <Error
        message="404 - Page Not Found"
        redirectTo="/"
        redirectDelay={2500}
      />
    </>
  )
}
