import { useEffect } from 'react'
export default function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title + ' | React App'
  }, [title])
  return null
}
