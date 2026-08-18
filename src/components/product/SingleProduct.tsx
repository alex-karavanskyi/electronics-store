'use client'
import { useEffect, useState } from 'react'

import { useParams } from 'next/navigation'

import { HiOutlineShoppingCart } from 'react-icons/hi2'
import styled from 'styled-components'

import Chat from '@/components/chat/Chat'
import { Error, Loading } from '@/layout'
import { addToCart } from '@/redux/features/cartSlice'
import { getSingleProduct } from '@/redux/features/productSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { url } from '@/shared/constants/db'
import { device } from '@/shared/constants/device'
import { Breadcrumbs } from '@/shared/ui'
import ProductInfo from '@/shared/ui/ProductInfo'
import { containerStyles } from '@/shared/ui/styles/containerStyles'

import ProductImages from './ProductImages'

const SingleProduct = () => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const {
    single_product_loading: loading,
    single_product_error: error,
    single_product: product,
  } = useAppSelector(store => store.products)

  const { id } = useParams()

  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(getSingleProduct(`${url}/${id}`))
  }, [dispatch, id])

  if (loading) return <Loading />
  if (error) {
    return (
      <Error
        message="Oops! Something went wrong. Try again later."
        redirectTo="/"
        redirectDelay={3000}
      />
    )
  }
  if (!product) return null

  const { description, images } = product

  return (
    <Container>
      <Breadcrumbs name={product.name} />
      <div className="single__product-container">
        <ProductImages images={images} onChatOpen={() => setIsChatOpen(true)} />
        <section className="single__product-info">
          <ProductInfo
            product={product}
            variant="detailed"
            showHeader
            showPrice
            priceTag="h5"
          />

          <button
            type="button"
            className="single__product-buy-button"
            aria-label={`Buy ${product.name}`}
            onClick={() => {
              dispatch(addToCart(product))
            }}
          >
            <HiOutlineShoppingCart />
            <span>Buy now</span>
          </button>
          <p className="single__product-description">{description}</p>
          <hr />
        </section>
      </div>

      {isChatOpen && (
        <ChatModal>
          <ChatOverlay onClick={() => setIsChatOpen(false)} />
          <ChatContent>
            <ChatHeader>
              <CloseButton
                onClick={() => setIsChatOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </CloseButton>
            </ChatHeader>
            <ChatWrapper>
              <Chat product={product} />
            </ChatWrapper>
          </ChatContent>
        </ChatModal>
      )}
    </Container>
  )
}

const Container = styled.main`
  ${containerStyles}
  padding: 1rem;

  .single__product-container {
    display: grid;
    gap: 4rem;
  }

  .single__product-info {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .single__product-description {
    line-height: 1.8;
    color: var(--ink-soft);
  }

  .product__info-favorite-icon {
    width: 2rem;
    height: 2rem;
    color: var(--clr-primary-4);
    cursor: pointer;
  }

  .single__product-buy-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;

    width: fit-content;
    padding: 0.9rem 1.8rem;

    border: none;
    border-radius: var(--radius);

    background: var(--clr-primary-5);
    color: #fff;

    font-size: 1rem;
    font-weight: 600;

    cursor: pointer;

    transition:
      background-color 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .single__product-buy-button svg {
    width: 1.3rem;
    height: 1.3rem;
  }

  .single__product-buy-button:hover {
    background: #d95700;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }

  .single__product-buy-button:active {
    transform: translateY(0);
  }

  @media ${device.laptop} {
    .single__product-container {
      grid-template-columns: 1fr 1fr;
    }

    .product__info-favorite-icon {
      width: 2.2rem;
      height: 2.2rem;
    }
  }

  @media ${device.desktop} {
    padding-left: 0;
    padding-right: 0;
  }
`

const ChatModal = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  z-index: 1000;

  @media ${device.laptop} {
    align-items: center;
    justify-content: center;
  }
`

const ChatOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  cursor: pointer;
`

const ChatContent = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  max-height: 600px;
  background: white;
  border-radius: 12px 12px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media ${device.laptop} {
    width: 90%;
    max-width: 450px;
    height: auto;
    border-radius: 12px;

    @keyframes slideUp {
      from {
        transform: scale(0.9);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
  }

  @media (max-width: 480px) {
    max-height: 80vh;
  }
`

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`

const CloseButton = styled.button`
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #e5e7eb;
    color: #1f2937;
  }

  &:active {
    background: var(--clr-grey-7);
  }
`

const ChatWrapper = styled.div`
  flex: 1;
  overflow: hidden;
`

export default SingleProduct
