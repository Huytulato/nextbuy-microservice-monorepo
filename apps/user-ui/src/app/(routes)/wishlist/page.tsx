'use client'
import React from 'react'
import Link from 'next/link'
import { Heart, ShoppingBag, ArrowLeft, ShoppingCart, Trash2 } from 'lucide-react'
import { useStore } from '../../../store'

const WishlistPage = () => {
  const wishlist = useStore((state: any) => state.wishlist)
  const removeFromWishlist = useStore((state: any) => state.removeFromWishlist)
  const addToCart = useStore((state: any) => state.addToCart)
  const cart = useStore((state: any) => state.cart)

  const handleRemoveFromWishlist = (id: string) => {
    removeFromWishlist(id, null, window.location.pathname, navigator.userAgent)
  }

  const handleMoveToCart = (item: any) => {
    // Add to cart
    addToCart(item, null, window.location.pathname, navigator.userAgent)
    // Remove from wishlist
    removeFromWishlist(item.id, null, window.location.pathname, navigator.userAgent)
  }

  const isInCart = (id: string) => {
    return cart.some((item: any) => item.id === id)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price)
  }

  // Empty wishlist state
  if (wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Your Wishlist is Empty</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Save your favorite items here by clicking the heart icon on products you love!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" />
                Browse Products
              </Link>
              <Link
                href="/"
                className="px-8 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Heart className="w-8 h-8 text-red-600 fill-red-600" />
              My Wishlist
              <span className="text-xl text-gray-500 font-normal">
                ({wishlist.length} {wishlist.length === 1 ? 'item' : 'items'})
              </span>
            </h1>
          </div>
        </div>

        {/* Wishlist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((item: any) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200 group"
            >
              {/* Product Image */}
              <Link href={`/product/${item.id}`} className="block relative aspect-square bg-gray-100">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-product.png'
                  }}
                />
                {/* Remove Button - Top Right */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleRemoveFromWishlist(item.id)
                  }}
                  className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors shadow-md z-10"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Link>

              {/* Product Info */}
              <div className="p-4">
                <Link href={`/product/${item.id}`}>
                  <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-red-600 transition-colors mb-2 min-h-[3rem]">
                    {item.title}
                  </h3>
                </Link>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold text-red-600">
                    {formatPrice(item.price)}
                  </span>
                </div>

                {/* Actions */}
                {isInCart(item.id) ? (
                  <Link
                    href="/cart"
                    className="w-full py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    View in Cart
                  </Link>
                ) : (
                  <button
                    onClick={() => handleMoveToCart(item)}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        {wishlist.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              View Cart ({cart.length})
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default WishlistPage
