'use client'
import React from 'react'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useStore } from '../../../store'
import useUser from '../../../hooks/useUser'

interface CartItemProps {
  id: string
  title: string
  price: number
  image: string
  quantity: number
  shopId: string
  variationId?: string | null
  sku?: string
  variationName?: string | null
}

const CartItem: React.FC<CartItemProps> = ({ id, title, price, image, quantity, shopId, variationId, sku, variationName }) => {
  const updateCartQuantity = useStore((state: any) => state.updateCartQuantity)
  const removeFromCart = useStore((state: any) => state.removeFromCart)
  const { user } = useUser()

  const handleIncrement = () => {
    updateCartQuantity(id, variationId, quantity + 1, user, window.location.pathname, navigator.userAgent)
  }

  const handleDecrement = () => {
    if (quantity > 1) {
      updateCartQuantity(id, variationId, quantity - 1, user, window.location.pathname, navigator.userAgent)
    }
  }

  const handleRemove = () => {
    removeFromCart(id, variationId, user, window.location.pathname, navigator.userAgent)
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
    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
      {/* Product Image */}
      <Link href={`/product/${id}`} className="flex-shrink-0 relative">
        <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-product.png'
            }}
          />
        </div>
      </Link>

      {/* Product Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          <div className="flex justify-between items-start gap-4">
            <Link href={`/product/${id}`} className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors mb-2">
                {title}
              </h3>
            </Link>
            <button
              onClick={handleRemove}
              className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all"
              aria-label="Remove item"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
              <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium text-gray-600">Shop ID: {shopId.slice(0, 8)}...</span>
            </div>
            {variationName && (
              <div className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 font-medium">
                {variationName}
              </div>
            )}
            {sku && (
              <div className="bg-gray-50 text-gray-600 px-2.5 py-1 rounded-md border border-gray-100 font-mono text-xs flex items-center">
                SKU: {sku}
              </div>
            )}
          </div>
        </div>

        {/* Price & Actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap mt-2">
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg border border-gray-200">
            <button
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-md bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-600 hover:text-blue-600"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center font-semibold text-gray-900">{quantity}</span>
            <button
              onClick={handleIncrement}
              className="w-8 h-8 rounded-md bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-600"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Price */}
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">
              {formatPrice(price * quantity)}
            </div>
            {quantity > 1 && (
              <div className="text-sm text-gray-500 font-medium">
                {formatPrice(price)} each
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartItem
