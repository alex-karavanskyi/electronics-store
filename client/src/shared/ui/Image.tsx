import type { ComponentProps } from 'react'

type ImageProps = ComponentProps<'img'> & { fill?: boolean; priority?: boolean }

export default function Image({
  fill,
  priority,
  style,
  loading,
  src,
  alt = '',
  ...props
}: ImageProps) {
  return (
    <img
      {...props}
      alt={alt}
      src={src || undefined}
      loading={priority ? 'eager' : (loading ?? 'lazy')}
      style={
        fill
          ? {
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              ...style,
            }
          : style
      }
    />
  )
}
