'use client'
import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Heart, ShoppingCart, Percent, Check, Truck, TrendingUp, Clock, Store } from 'lucide-react'
import { Rating } from '../ratings'
import { useStore } from '../../../store'

// Types matching Prisma schema exactly
interface ProductImage {
  id: string
  file_id: string
  url: string
  productsId?: string
}

interface ProductShop {
  id: string
  name: string
  rating: number
  avatar?: ProductImage | null
}

// Product type matching Prisma products model
interface Product {
  id: string
  title: string
  slug: string
  category: string
  subCategory: string
  short_description: string
  detailed_description: string
  images: ProductImage[]
  video_url?: string | null
  tags: string[]
  brand?: string | null
  colors: string[]
  sizes: string[]
  starting_date: string | Date
  ending_date: string | Date
  stock: number
  sale_price: number
  regular_price: number
  ratings: number
  warranty?: string | null
  custom_specifications?: Record<string, string>[] | null
  custom_properties: Record<string, string>[]
  isDeleted: boolean
  cashOnDelivery?: string | null
  discount_codes: string[]
  status: 'active' | 'pending' | 'draft'
  deletedAt?: string | Date | null
  createdAt: string | Date
  updateAt: string | Date
  shopId: string
  shops?: ProductShop
}

interface ProductCardProps {
  product: Product
  variant?: 'default' | 'compact' | 'horizontal' | 'featured'
  showQuickActions?: boolean
  onAddToCart?: (product: Product) => void
  onAddToWishlist?: (product: Product) => void
  priority?: boolean // for Image optimization
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  variant = 'default',
  showQuickActions = true,
  onAddToCart,
  onAddToWishlist,
  priority = false
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // Zustand store selectors
  const addToWishlist = useStore((state: any) => state.addToWishlist)
  const removeFromWishlist = useStore((state: any) => state.removeFromWishlist)
  const addToCart = useStore((state: any) => state.addToCart)
  const wishlist = useStore((state: any) => state.wishlist)
  const cart = useStore((state: any) => state.cart)
  
  // Derived state
  const isWishlisted = wishlist.some((item: any) => item.id === product.id)
  const isInCart = cart.some((item: any) => item.id === product.id)

  // Calculate discount percentage
  const discountPercent = useMemo(() => {
    if (product.regular_price > product.sale_price) {
      return Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)
    }
    return 0
  }, [product.regular_price, product.sale_price])

  // Check if product sale is active (within date range)
  const isSaleActive = useMemo(() => {
    const now = new Date()
    const startDate = new Date(product.starting_date)
    const endDate = new Date(product.ending_date)
    return now >= startDate && now <= endDate
  }, [product.starting_date, product.ending_date])

  // Check if sale is ending soon (within 24 hours)
  const isSaleEndingSoon = useMemo(() => {
    const now = new Date()
    const endDate = new Date(product.ending_date)
    const hoursLeft = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursLeft > 0 && hoursLeft <= 24
  }, [product.ending_date])

  // Format price with locale
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price)
  }

  // Get primary image URL with fallback
  const getImageUrl = (index: number = 0) => {
    if (imageError || !product.images || product.images.length === 0) {
      return '/placeholder-product.png'
    }
    return product.images[index]?.url || '/placeholder-product.png'
  }

  // Transform product for store
  const transformProductForStore = () => ({
    id: product.id,
    title: product.title,
    price: product.sale_price,
    image: product.images[0]?.url || '/placeholder-product.png',
    quantity: 1,
    shopId: product.shopId,
  })

  // Handle add to cart
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isInStock || !isSaleActive) return
    
    setIsAddingToCart(true)
    
    // Call Zustand action
    const storeProduct = transformProductForStore()
    addToCart(storeProduct, null, window.location.pathname, navigator.userAgent)
    
    // Optional callback for parent component
    onAddToCart?.(product)
    
    setTimeout(() => setIsAddingToCart(false), 1200)
  }

  // Handle add to wishlist (toggle)
  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const storeProduct = transformProductForStore()
    
    if (isWishlisted) {
      removeFromWishlist(product.id, null, window.location.pathname, navigator.userAgent)
    } else {
      addToWishlist(storeProduct, null, window.location.pathname, navigator.userAgent)
    }
    
    // Optional callback for parent component
    onAddToWishlist?.(product)
  }

  // Handle product view tracking
  const handleProductView = () => {
    // Track product view event
    import('../../../utils/trackEvent').then(({ trackEvent, getEventMetadata }) => {
      trackEvent({
        userId: 'guest', // Will be replaced with actual user ID when available
        action: 'product_view',
        productId: product.id,
        shopId: product.shopId,
        metadata: {
          price: product.sale_price,
          ...getEventMetadata(),
        },
      });
    });
  }

  // Stock status
  const isInStock = product.stock > 0
  const isLowStock = product.stock > 0 && product.stock <= 5
  const isOnSale = discountPercent > 0 && isSaleActive

  // Check special tags
  const isNew = useMemo(() => {
    const createdDate = new Date(product.createdAt)
    const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceCreated <= 7 || product.tags.includes('new')
  }, [product.createdAt, product.tags])

  const isTrending = product.tags.includes('trending') || product.tags.includes('hot')
  const isBestSeller = product.tags.includes('bestseller') || product.tags.includes('best-seller')

  // Default variant - standard product card
  if (variant === 'default') {
    return (
      <div 
        className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setCurrentImageIndex(0)
        }}
      >
        {/* Image Container */}
        <Link 
          href={`/product/${product.slug}`} 
          className="block relative aspect-square overflow-hidden bg-gray-50"
          onClick={handleProductView}
        >
          {/* Main Image */}
          <img 
            src={getImageUrl(currentImageIndex)}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
            loading={priority ? 'eager' : 'lazy'}
          />

          {/* Image Navigation Dots */}
          {product.images.length > 1 && isHovered && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
              {product.images.slice(0, 5).map((_, index) => (
                <button
                  key={index}
                  onMouseEnter={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentImageIndex 
                      ? 'bg-white w-5 shadow-md' 
                      : 'bg-white/60 hover:bg-white/80'
                  }`}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
              {product.images.length > 5 && (
                <span className="text-white text-xs font-medium bg-black/40 px-1.5 py-0.5 rounded">
                  +{product.images.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Top Left Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {isOnSale && (
              <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                <Percent className="w-3 h-3" />
                {discountPercent}%
              </span>
            )}
            {isNew && (
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                NEW
              </span>
            )}
            {isTrending && (
              <span className="inline-flex items-center gap-1 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                <TrendingUp className="w-3 h-3" />
                HOT
              </span>
            )}
            {isBestSeller && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                BEST
              </span>
            )}
          </div>

          {/* Top Right - Stock & Time Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
            {isLowStock && isInStock && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                {product.stock} left
              </span>
            )}
            {isSaleEndingSoon && isOnSale && (
              <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm animate-pulse">
                <Clock className="w-3 h-3" />
                Ending soon
              </span>
            )}
          </div>

          {/* Out of Stock Overlay */}
          {(!isInStock || !isSaleActive) && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
              <span className="bg-gray-900/90 text-white font-semibold px-4 py-2 rounded-xl">
                {!isInStock ? 'Out of Stock' : 'Sale Ended'}
              </span>
            </div>
          )}

          {/* Quick Actions Overlay */}
          {showQuickActions && isInStock && isSaleActive && (
            <div className={`absolute inset-0 bg-gradient-to-t from-black/30 to-transparent flex items-end justify-center pb-12 gap-2 transition-opacity duration-300 z-20 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              <button 
                onClick={handleAddToWishlist}
                onMouseDown={(e) => e.preventDefault()}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 z-30 relative ${
                  isWishlisted 
                    ? 'bg-red-600 text-white' 
                    : 'bg-white text-red-600 hover:bg-red-50'
                }`}
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>

              <button 
                onClick={handleAddToCart}
                onMouseDown={(e) => e.preventDefault()}
                disabled={isAddingToCart}
                className="h-10 px-5 bg-red-600 rounded-full flex items-center justify-center gap-2 shadow-lg text-white font-medium hover:bg-red-700 transition-all duration-200 disabled:opacity-70 z-30 relative"
              >
                {isAddingToCart ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Added!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span className="text-sm">Add</span>
                  </>
                )}
              </button>
            </div>
          )}
        </Link>

        {/* Product Info */}
        <div className="p-4 space-y-2">
          {/* Category & Brand Row */}
          <div className="flex items-center justify-between gap-2">
            <Link 
              href={`/products?category=${encodeURIComponent(product.category)}`}
              className="text-xs text-gray-500 uppercase tracking-wide hover:text-red-600 transition-colors truncate"
            >
              {product.category}
            </Link>
            {product.brand && (
              <Link
                href={`/products?brand=${encodeURIComponent(product.brand)}`}
                className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors truncate"
              >
                {product.brand}
              </Link>
            )}
          </div>

          {/* Title */}
          <Link href={`/product/${product.slug}`} onClick={handleProductView}>
            <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-red-600 transition-colors leading-snug">
              {product.title}
            </h3>
          </Link>

          {/* Shop Info */}
          {product.shops && (
            <Link 
              href={`/shop/${product.shops.id}`}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              <Store className="w-3 h-3" />
              <span className="truncate">{product.shops.name}</span>
              {product.shops.rating > 0 && (
                <span className="flex items-center gap-0.5 text-amber-500">
                  <span>•</span>
                  <span>{product.shops.rating.toFixed(1)}★</span>
                </span>
              )}
            </Link>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2">
            <Rating rating={product.ratings} size="sm" showValue variant="compact" />
          </div>

          {/* Colors & Sizes Preview */}
          <div className="flex items-center gap-3">
            {product.colors.length > 0 && (
              <div className="flex items-center gap-1">
                {product.colors.slice(0, 4).map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-full border border-gray-200 shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                {product.colors.length > 4 && (
                  <span className="text-xs text-gray-400">+{product.colors.length - 4}</span>
                )}
              </div>
            )}
            {product.sizes.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{product.sizes.length} sizes</span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-xl font-bold text-red-600">
              {formatPrice(product.sale_price)}
            </span>
            {isOnSale && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.regular_price)}
              </span>
            )}
          </div>

          {/* Tags Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.sale_price >= 50 && (
              <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                <Truck className="w-3 h-3" />
                Free Ship
              </span>
            )}
            {product.cashOnDelivery === 'yes' && (
              <span className="text-xs text-blue-600 font-medium">COD</span>
            )}
            {product.warranty && (
              <span className="text-xs text-gray-500">{product.warranty}</span>
            )}
          </div>
        </div>

        {/* Mobile Add to Cart */}
        {isInStock && isSaleActive && (
          <div className="px-4 pb-4 lg:hidden">
            <button 
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {isAddingToCart ? (
                <>
                  <Check className="w-5 h-5" />
                  Added!
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </>
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100">
        <Link href={`/product/${product.slug}`} className="block" onClick={handleProductView}>
          <div className="relative aspect-square overflow-hidden bg-gray-50">
            <img 
              src={getImageUrl(0)}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            
            {isOnSale && (
              <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                -{discountPercent}%
              </span>
            )}
            
            <button 
              onClick={handleAddToWishlist}
              className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all ${
                isWishlisted ? 'bg-red-600 text-white' : 'bg-white/90 text-gray-600 hover:bg-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>

            {(!isInStock || !isSaleActive) && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {!isInStock ? 'Sold Out' : 'Ended'}
                </span>
              </div>
            )}
          </div>

          <div className="p-3 space-y-1">
            <h3 className="font-medium text-sm text-gray-900 line-clamp-1 group-hover:text-red-600 transition-colors">
              {product.title}
            </h3>
            
            <Rating rating={product.ratings} size="xs" showValue variant="compact" />
            
            <div className="flex items-baseline gap-1.5 pt-0.5">
              <span className="font-bold text-red-600">{formatPrice(product.sale_price)}</span>
              {isOnSale && (
                <span className="text-xs text-gray-400 line-through">{formatPrice(product.regular_price)}</span>
              )}
            </div>
          </div>
        </Link>
      </div>
    )
  }

  // Horizontal variant
  if (variant === 'horizontal') {
    return (
      <div className="flex gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
        <Link 
          href={`/product/${product.slug}`} 
          className="relative flex-shrink-0 w-28 h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-gray-50"
          onClick={handleProductView}
        >
          <img 
            src={getImageUrl(0)}
            alt={product.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
          {isOnSale && (
            <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{discountPercent}%
            </span>
          )}
        </Link>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase">{product.category}</span>
              {product.brand && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-red-600 font-medium">{product.brand}</span>
                </>
              )}
            </div>
            
            <Link href={`/product/${product.slug}`} onClick={handleProductView}>
              <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-red-600 transition-colors text-sm md:text-base">
                {product.title}
              </h3>
            </Link>
            
            <Rating rating={product.ratings} size="xs" showValue />
          </div>

          <div className="flex items-center justify-between gap-3 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-red-600">{formatPrice(product.sale_price)}</span>
              {isOnSale && (
                <span className="text-sm text-gray-400 line-through">{formatPrice(product.regular_price)}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleAddToWishlist}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                  isWishlisted 
                    ? 'bg-red-600 border-red-600 text-white' 
                    : 'border-gray-200 text-gray-500 hover:border-red-600 hover:text-red-600'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
              
              {isInStock && isSaleActive && (
                <button 
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-70"
                >
                  {isAddingToCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isAddingToCart ? 'Added' : 'Add'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Featured variant - larger card for hero sections
  if (variant === 'featured') {
    return (
      <div 
        className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setCurrentImageIndex(0)
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Section */}
          <Link 
            href={`/product/${product.slug}`} 
            className="relative aspect-square md:aspect-auto md:min-h-[300px] overflow-hidden bg-gray-50"
            onClick={handleProductView}
          >
            <img 
              src={getImageUrl(currentImageIndex)}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImageError(true)}
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {isOnSale && (
                <span className="inline-flex items-center gap-1 bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg">
                  <Percent className="w-4 h-4" />
                  {discountPercent}% OFF
                </span>
              )}
              {isTrending && (
                <span className="inline-flex items-center gap-1 bg-purple-600 text-white font-bold px-3 py-1.5 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                  Trending
                </span>
              )}
            </div>

            {/* Image Nav */}
            {product.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {product.images.slice(0, 5).map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentImageIndex(index)
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === currentImageIndex ? 'bg-white w-6' : 'bg-white/60 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}
          </Link>

          {/* Content Section */}
          <div className="p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Link 
                  href={`/products?category=${encodeURIComponent(product.category)}`}
                  className="text-sm text-gray-500 hover:text-red-600"
                >
                  {product.category}
                </Link>
                <span className="text-gray-300">›</span>
                <Link 
                  href={`/products?category=${encodeURIComponent(product.category)}&subcategory=${encodeURIComponent(product.subCategory)}`}
                  className="text-sm text-gray-500 hover:text-red-600"
                >
                  {product.subCategory}
                </Link>
              </div>

              <Link href={`/product/${product.slug}`} onClick={handleProductView}>
                <h2 className="text-2xl font-bold text-gray-900 hover:text-red-600 transition-colors">
                  {product.title}
                </h2>
              </Link>

              {product.brand && (
                <Link
                  href={`/products?brand=${encodeURIComponent(product.brand)}`}
                  className="inline-block text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  by {product.brand}
                </Link>
              )}

              <p className="text-gray-600 line-clamp-2">
                {product.short_description}
              </p>

              <Rating rating={product.ratings} size="md" showValue variant="detailed" />

              {/* Colors & Sizes */}
              <div className="space-y-3">
                {product.colors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Colors:</span>
                    <div className="flex gap-1.5">
                      {product.colors.slice(0, 6).map((color, i) => (
                        <div 
                          key={i} 
                          className="w-6 h-6 rounded-full border-2 border-gray-200" 
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {product.colors.length > 6 && (
                        <span className="text-sm text-gray-400">+{product.colors.length - 6}</span>
                      )}
                    </div>
                  </div>
                )}
                {product.sizes.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Sizes:</span>
                    <div className="flex gap-1 flex-wrap">
                      {product.sizes.map((size, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Price & Actions */}
            <div className="space-y-4 mt-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-red-600">
                  {formatPrice(product.sale_price)}
                </span>
                {isOnSale && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      {formatPrice(product.regular_price)}
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      Save {formatPrice(product.regular_price - product.sale_price)}
                    </span>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || !isInStock || !isSaleActive}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {isAddingToCart ? (
                    <>
                      <Check className="w-5 h-5" />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </>
                  )}
                </button>
                <button 
                  onClick={handleAddToWishlist}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-all ${
                    isWishlisted 
                      ? 'bg-red-50 border-red-600 text-red-600' 
                      : 'border-gray-200 text-gray-500 hover:border-red-600 hover:text-red-600'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Extra Info */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {product.sale_price >= 50 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Truck className="w-4 h-4" />
                    Free Shipping
                  </span>
                )}
                {product.warranty && (
                  <span>{product.warranty} Warranty</span>
                )}
                {isInStock && (
                  <span className={isLowStock ? 'text-orange-500' : 'text-green-600'}>
                    {isLowStock ? `Only ${product.stock} left` : 'In Stock'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default ProductCard