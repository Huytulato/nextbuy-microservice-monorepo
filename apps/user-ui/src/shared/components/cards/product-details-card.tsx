'use client'
import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Heart, ShoppingCart, Share2, Minus, Plus, Check, Truck, Shield, 
  RotateCcw, Package, ChevronRight, Copy, CheckCircle, Star, 
  Clock, Award, Percent, MessageCircle
} from 'lucide-react'
import { Rating, RatingSummary, RatingBadge, calculateRatingBreakdown } from '../ratings'

// Types aligned with ProductCard
interface ProductImage {
  id: string
  url: string
  file_id: string
}

interface ProductShop {
  id: string
  name: string
  rating?: number
  avatar?: ProductImage
}

interface ProductSpecification {
  key: string
  value: string
}

interface ProductProperty {
  name: string
  value: string
}

interface Product {
  id: string
  title: string
  slug: string
  category: string
  subCategory?: string
  short_description: string
  detailed_description: string
  images: ProductImage[]
  video_url?: string
  tags?: string[]
  brand?: string
  colors: string[]
  sizes: string[]
  starting_date?: string
  ending_date?: string
  stock: number
  sale_price: number
  regular_price: number
  ratings: number
  warranty?: string
  custom_specifications?: ProductSpecification[]
  custom_properties?: ProductProperty[]
  cashOnDelivery?: string
  shops?: ProductShop
  reviewCount?: number
  reviews?: { rating: number; comment: string; userName: string; date: string }[]
}

interface ProductDetailsCardProps {
  product: Product
  onAddToCart?: (product: Product, quantity: number, selectedColor?: string, selectedSize?: string) => void
  onAddToWishlist?: (product: Product) => void
  onBuyNow?: (product: Product, quantity: number, selectedColor?: string, selectedSize?: string) => void
}

const ProductDetailsCard: React.FC<ProductDetailsCardProps> = ({
  product,
  onAddToCart,
  onAddToWishlist,
  onBuyNow,
}) => {
  // State
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState<string | null>(product.colors?.[0] || null)
  const [selectedSize, setSelectedSize] = useState<string | null>(product.sizes?.[0] || null)
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description')
  const [isImageZoomed, setIsImageZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })

  // Calculations
  const discountPercent = product.regular_price > product.sale_price 
    ? Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)
    : 0

  const savings = product.regular_price - product.sale_price

  const isInStock = product.stock > 0
  const isLowStock = product.stock > 0 && product.stock <= 5

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  // Rating breakdown for reviews section
  const ratingBreakdown = useMemo(() => {
    if (product.reviews) {
      return calculateRatingBreakdown(product.reviews)
    }
    return []
  }, [product.reviews])

  // Handlers
  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity)
    }
  }

  const handleAddToCart = () => {
    setIsAddingToCart(true)
    onAddToCart?.(product, quantity, selectedColor || undefined, selectedSize || undefined)
    setTimeout(() => setIsAddingToCart(false), 1500)
  }

  const handleBuyNow = () => {
    onBuyNow?.(product, quantity, selectedColor || undefined, selectedSize || undefined)
  }

  const handleAddToWishlist = () => {
    setIsWishlisted(!isWishlisted)
    onAddToWishlist?.(product)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleImageZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomPosition({ x, y })
  }

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-red-600 transition-colors">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/products?category=${product.category}`} className="hover:text-red-600 transition-colors">
          {product.category}
        </Link>
        {product.subCategory && (
          <>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/products?category=${product.category}&subcategory=${product.subCategory}`} className="hover:text-red-600 transition-colors">
              {product.subCategory}
            </Link>
          </>
        )}
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column - Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div 
            className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-zoom-in"
            onMouseEnter={() => setIsImageZoomed(true)}
            onMouseLeave={() => setIsImageZoomed(false)}
            onMouseMove={handleImageZoom}
          >
            <img 
              src={product.images[selectedImage]?.url || '/placeholder-product.png'}
              alt={product.title}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isImageZoomed ? 'scale-150' : ''
              }`}
              style={isImageZoomed ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : {}}
            />

            {/* Badges */}
            {discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1.5 rounded-full font-bold text-sm flex items-center gap-1">
                <Percent className="w-4 h-4" />
                {discountPercent}% OFF
              </div>
            )}

            {!isInStock && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="bg-white text-gray-900 font-bold px-6 py-3 rounded-xl">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    index === selectedImage 
                      ? 'border-red-600 ring-2 ring-red-100' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img 
                    src={image.url}
                    alt={`${product.title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Product Info */}
        <div className="space-y-6">
          {/* Brand & Title */}
          <div>
            {product.brand && (
              <Link 
                href={`/products?brand=${product.brand}`}
                className="inline-block text-sm font-semibold text-red-600 hover:text-red-700 mb-2"
              >
                {product.brand}
              </Link>
            )}
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
              {product.title}
            </h1>
          </div>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-4 flex-wrap">
            <Rating 
              rating={product.ratings} 
              size="md" 
              showValue 
              variant="detailed"
              showCount
              reviewCount={product.reviewCount || product.reviews?.length || 0}
            />
            {product.ratings >= 4 && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                <Award className="w-3.5 h-3.5" />
                Top Rated
              </span>
            )}
          </div>

          {/* Shop */}
          {product.shops && (
            <Link 
              href={`/shop/${product.shops.id}`}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                {product.shops.avatar ? (
                  <img src={product.shops.avatar.url} alt={product.shops.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                    {product.shops.name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{product.shops.name}</p>
                {product.shops.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-500">{product.shops.rating.toFixed(1)} Shop Rating</span>
                  </div>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          )}

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl lg:text-4xl font-bold text-red-600">
                {formatPrice(product.sale_price)}
              </span>
              {discountPercent > 0 && (
                <>
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(product.regular_price)}
                  </span>
                  <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                    Save {formatPrice(savings)}
                  </span>
                </>
              )}
            </div>
            
            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {isInStock ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className={`font-medium ${isLowStock ? 'text-orange-600' : 'text-green-600'}`}>
                    {isLowStock ? `Only ${product.stock} left in stock - order soon!` : 'In Stock'}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-500">Currently unavailable</span>
                </>
              )}
            </div>
          </div>

          {/* Short Description */}
          <p className="text-gray-600 leading-relaxed">
            {product.short_description}
          </p>

          {/* Color Selection */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Color</span>
                {selectedColor && (
                  <span className="text-sm text-gray-500 capitalize">{selectedColor}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                      selectedColor === color 
                        ? 'border-red-600 ring-2 ring-red-100 scale-110' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {selectedColor === color && (
                      <Check className={`w-5 h-5 ${
                        ['white', '#fff', '#ffffff', 'yellow', '#ffff00'].includes(color.toLowerCase()) 
                          ? 'text-gray-900' 
                          : 'text-white'
                      }`} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Size</span>
                <Link href="/size-guide" className="text-sm text-red-600 hover:text-red-700">
                  Size Guide
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[48px] h-12 px-4 rounded-lg font-medium transition-all duration-200 ${
                      selectedSize === size 
                        ? 'bg-red-600 text-white border-2 border-red-600' 
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600 hover:text-red-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          {isInStock && (
            <div className="space-y-3">
              <span className="font-semibold text-gray-900">Quantity</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-16 text-center font-semibold text-lg">
                    {quantity}
                  </span>
                  <button 
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                    className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  {product.stock} available
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button 
              onClick={handleAddToCart}
              disabled={!isInStock || isAddingToCart}
              className="flex-1 h-14 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:cursor-not-allowed"
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
              onClick={handleBuyNow}
              disabled={!isInStock}
              className="flex-1 h-14 bg-[#ffbf34] hover:bg-[#e6ac2f] disabled:bg-gray-300 text-gray-900 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:cursor-not-allowed"
            >
              Buy Now
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button 
              onClick={handleAddToWishlist}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isWishlisted 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              <span className="font-medium">{isWishlisted ? 'Saved' : 'Save'}</span>
            </button>
            <button 
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {isCopied ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-600">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium">Share</span>
                </>
              )}
            </button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Free Shipping</p>
                <p className="text-xs text-gray-500">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Secure Payment</p>
                <p className="text-xs text-gray-500">100% protected</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Easy Returns</p>
                <p className="text-xs text-gray-500">30-day return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{product.warranty || 'Warranty'}</p>
                <p className="text-xs text-gray-500">Manufacturer guarantee</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-12 border-t border-gray-200 pt-8">
        {/* Tab Headers */}
        <div className="flex gap-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('description')}
            className={`pb-4 font-semibold transition-colors relative ${
              activeTab === 'description' 
                ? 'text-red-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Description
            {activeTab === 'description' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('specifications')}
            className={`pb-4 font-semibold transition-colors relative ${
              activeTab === 'specifications' 
                ? 'text-red-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Specifications
            {activeTab === 'specifications' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 font-semibold transition-colors relative flex items-center gap-2 ${
              activeTab === 'reviews' 
                ? 'text-red-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Reviews
            {(product.reviewCount || product.reviews?.length) && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {product.reviewCount || product.reviews?.length}
              </span>
            )}
            {activeTab === 'reviews' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-8">
          {/* Description Tab */}
          {activeTab === 'description' && (
            <div className="prose prose-gray max-w-none">
              <div 
                className="text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.detailed_description }}
              />
              
              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/products?tag=${tag}`}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-gray-200 transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Specifications Tab */}
          {activeTab === 'specifications' && (
            <div className="space-y-6">
              {/* Custom Specifications */}
              {product.custom_specifications && product.custom_specifications.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Product Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.custom_specifications.map((spec, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                        <span className="text-gray-500">{spec.key}</span>
                        <span className="font-medium text-gray-900">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Properties */}
              {product.custom_properties && product.custom_properties.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Additional Properties</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.custom_properties.map((prop, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                        <span className="text-gray-500">{prop.name}</span>
                        <span className="font-medium text-gray-900">{prop.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4">General Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Category</span>
                    <span className="font-medium text-gray-900">{product.category}</span>
                  </div>
                  {product.subCategory && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-500">Subcategory</span>
                      <span className="font-medium text-gray-900">{product.subCategory}</span>
                    </div>
                  )}
                  {product.brand && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-500">Brand</span>
                      <span className="font-medium text-gray-900">{product.brand}</span>
                    </div>
                  )}
                  {product.warranty && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-500">Warranty</span>
                      <span className="font-medium text-gray-900">{product.warranty}</span>
                    </div>
                  )}
                  {product.cashOnDelivery && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-500">Cash on Delivery</span>
                      <span className="font-medium text-gray-900">{product.cashOnDelivery}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-8">
              {/* Rating Summary */}
              {product.reviews && product.reviews.length > 0 ? (
                <>
                  <RatingSummary 
                    averageRating={product.ratings}
                    totalReviews={product.reviews.length}
                    breakdown={ratingBreakdown}
                  />

                  {/* Review List */}
                  <div className="space-y-6 pt-6 border-t border-gray-200">
                    {product.reviews.slice(0, 5).map((review, index) => (
                      <div key={index} className="pb-6 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600">
                            {review.userName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{review.userName}</p>
                            <div className="flex items-center gap-2">
                              <Rating rating={review.rating} size="xs" />
                              <span className="text-xs text-gray-500">{review.date}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>

                  {product.reviews.length > 5 && (
                    <button className="w-full py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                      View All {product.reviews.length} Reviews
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="font-semibold text-gray-900 mb-2">No Reviews Yet</h4>
                  <p className="text-gray-500 mb-6">Be the first to review this product</p>
                  <button className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors">
                    Write a Review
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductDetailsCard