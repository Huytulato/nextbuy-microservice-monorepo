'use client'
import React from 'react'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useStore } from '../../../store'

interface CartItemProps {
  id: string
  title: string
  price: number
  image: string
  quantity: number
  shopId: string
}

const CartItem: React.FC<CartItemProps> = ({ id, title, price, image, quantity, shopId }) => {
  const updateCartQuantity = useStore((state: any) => state.updateCartQuantity)
  const removeFromCart = useStore((state: any) => state.removeFromCart)

  const handleIncrement = () => {
    updateCartQuantity(id, quantity + 1, null, window.location.pathname, navigator.userAgent)
  }

  const handleDecrement = () => {
    if (quantity > 1) {
      updateCartQuantity(id, quantity - 1, null, window.location.pathname, navigator.userAgent)
    }
  }

  const handleRemove = () => {
    removeFromCart(id, null, window.location.pathname, navigator.userAgent)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price)
  }

  return (
    <div className="flex gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow duration-200">
      {/* Product Image */}
      <Link href={`/product/${id}`} className="flex-shrink-0">
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-lg overflow-hidden bg-gray-100">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-product.png'
            }}
          />
        </div>
      </Link>

      {/* Product Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <Link href={`/product/${id}`}>
            <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-red-600 transition-colors mb-1">
              {title}
            </h3>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <ShoppingBag className="w-4 h-4" />
            <span>Shop ID: {shopId}</span>
          </div>
        </div>

        {/* Price & Actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center font-semibold text-gray-900">{quantity}</span>
            <button
              onClick={handleIncrement}
              className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-red-600">
              {formatPrice(price * quantity)}
            </span>
            {quantity > 1 && (
              <span className="text-sm text-gray-500">
                {formatPrice(price)} each
              </span>
            )}
          </div>

          {/* Remove Button */}
          <button
            onClick={handleRemove}
            className="w-9 h-9 rounded-lg border border-red-200 flex items-center justify-center text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
            aria-label="Remove from cart"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CartItem
