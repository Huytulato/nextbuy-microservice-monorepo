"use client";
import React, { useState, useMemo } from 'react'
import { useStore } from '../../../store'
import useUser from '../../../hooks/useUser'

const ProductDetails = ({ProductDetails}: {ProductDetails: any}) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(ProductDetails?.sizes?.[0] || 'XS');
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    
    // Zustand store selectors
    const addToWishlist = useStore((state: any) => state.addToWishlist)
    const removeFromWishlist = useStore((state: any) => state.removeFromWishlist)
    const addToCart = useStore((state: any) => state.addToCart)
    const wishlist = useStore((state: any) => state.wishlist)
    
    // Get user for tracking
    const { user } = useUser()
    
    // Check if product is in wishlist
    const isWishlisted = useMemo(() => {
        return ProductDetails?.id ? wishlist.some((item: any) => item.id === ProductDetails.id) : false
    }, [wishlist, ProductDetails?.id])

    const handleQuantityChange = (type: 'increment' | 'decrement') => {
        if (type === 'increment') {
            setQuantity(prev => prev + 1);
        } else if (type === 'decrement' && quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

    const calculateDiscount = () => {
        if (ProductDetails?.originalPrice && ProductDetails?.price) {
            const discount = ((ProductDetails.originalPrice - ProductDetails.price) / ProductDetails.originalPrice) * 100;
            return Math.round(discount);
        }
        return 0;
    };

    // Transform product for store
    const transformProductForStore = () => ({
        id: ProductDetails.id,
        title: ProductDetails.title,
        price: ProductDetails.price,
        image: ProductDetails.images?.[0] || '/placeholder-product.png',
        quantity: quantity,
        shopId: ProductDetails.shopId,
    })

    // Handle add to cart
    const handleAddToCart = () => {
        if (!ProductDetails?.stock || ProductDetails.stock === 0) return;
        if (!ProductDetails?.id || !ProductDetails?.shopId) return;
        
        setIsAddingToCart(true)
        
        const storeProduct = transformProductForStore()
        addToCart(storeProduct, user, window.location.pathname, navigator.userAgent)
        
        setTimeout(() => setIsAddingToCart(false), 1200)
    }

    // Handle add to wishlist (toggle)
    const handleToggleWishlist = () => {
        if (!ProductDetails?.id || !ProductDetails?.shopId) return;
        
        const storeProduct = transformProductForStore()
        
        if (isWishlisted) {
            removeFromWishlist(ProductDetails.id, user, window.location.pathname, navigator.userAgent)
        } else {
            addToWishlist(storeProduct, user, window.location.pathname, navigator.userAgent)
        }
    }

    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                    <span
                        key={i}
                        className={`text-lg ${
                            i < Math.floor(rating)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                        }`}
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-lg p-6 mb-8">
                    {/* Left side - Product Image */}
                    <div className="flex flex-col items-center">
                        <div className="relative mb-4 w-full flex justify-center">
                            {ProductDetails?.images?.[0] ? (
                                <div className="group relative w-full max-w-md overflow-hidden border rounded-lg">
                                <img
                                    src={ProductDetails?.images?.[0]}
                                    alt={ProductDetails?.title}
                                    className="w-full h-auto transition-transform duration-300 group-hover:scale-150 cursor-zoom-in"
                                />
                                </div>

                            ) : (
                                <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <span className="text-gray-400">No image available</span>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Images */}
                        {ProductDetails?.images && ProductDetails?.images?.length > 1 && (
                            <div className="flex gap-2 mt-4">
                                {ProductDetails?.images?.map((img: string, idx: number) => (
                                    <img
                                        key={idx}
                                        src={img}
                                        alt={`Product ${idx}`}
                                        className="w-16 h-16 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-500"
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right side - Product Info */}
                    <div className="flex flex-col">
                        {/* Title and Wishlist */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    {ProductDetails?.title || 'test'}
                                </h1>
                            </div>
                            <button
                                onClick={handleToggleWishlist}
                                className="text-2xl ml-4 focus:outline-none transition-transform hover:scale-110"
                                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                            >
                                {isWishlisted ? '❤️' : '🤍'}
                            </button>
                        </div>

                        {/* Rating and Reviews */}
                        <div className="flex items-center gap-3 mb-4">
                            {renderStars(ProductDetails?.rating || 0)}
                            <span className="text-blue-600 text-sm font-medium">
                                ({ProductDetails?.reviewCount || 0} Reviews)
                            </span>
                        </div>

                        {/* Brand */}
                        <div className="mb-4">
                            <span className="text-gray-600 text-sm">
                                Brand: <span className="font-semibold">{ProductDetails?.brand || 'No Brand'}</span>
                            </span>
                        </div>

                        {/* Price Section */}
                        <div className="mb-6">
                            <div className="flex items-baseline gap-3">
                                <span className="text-4xl font-bold text-orange-500">
                                    ${ProductDetails?.price || '0'}
                                </span>
                                {ProductDetails?.originalPrice && (
                                    <>
                                        <span className="text-lg text-gray-500 line-through">
                                            ${ProductDetails?.originalPrice}
                                        </span>
                                        <span className="text-orange-500 font-semibold">
                                            -{calculateDiscount()}%
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Size Selector */}
                        {ProductDetails?.sizes && ProductDetails?.sizes?.length > 0 && (
                            <div className="mb-6">
                                <label className="block text-gray-700 font-semibold mb-2">Size:</label>
                                <div className="flex gap-2">
                                    {ProductDetails?.sizes?.map((size: string) => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size)}
                                            className={`px-4 py-2 rounded font-medium transition-all ${
                                                selectedSize === size
                                                    ? 'bg-gray-900 text-white'
                                                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                                            }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Stock Info */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2">
                                <span className={`font-semibold ${
                                    ProductDetails?.stock > 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                }`}>
                                    {ProductDetails?.stock > 0
                                        ? `In Stock (Stock ${ProductDetails?.stock})`
                                        : 'Out of Stock'}
                                </span>
                            </div>
                        </div>

                        {/* Quantity Selector */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-semibold mb-2">Quantity:</label>
                            <div className="flex items-center gap-4">
                                <div className="flex border border-gray-300 rounded-lg">
                                    <button
                                        onClick={() => handleQuantityChange('decrement')}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        value={quantity}
                                        readOnly
                                        className="w-12 text-center border-l border-r border-gray-300 bg-white"
                                    />
                                    <button
                                        onClick={() => handleQuantityChange('increment')}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Add to Cart Button */}
                        <div className="mb-6">
                            <button
                                onClick={handleAddToCart}
                                disabled={ProductDetails?.stock === 0 || isAddingToCart}
                                className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                                    ProductDetails?.stock > 0 && !isAddingToCart
                                        ? 'bg-orange-500 hover:bg-orange-600'
                                        : 'bg-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {isAddingToCart ? '✓ Added!' : '🛒 Add to Cart'}
                            </button>
                        </div>

                        {/* Divider */}
                        <hr className="my-6" />

                        {/* Additional Info */}
                        <div className="space-y-4">
                            {/* Delivery */}
                            <div className="flex gap-3">
                                <span className="text-2xl">📍</span>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Delivery Option</h3>
                                    <p className="text-gray-600 text-sm">
                                        {ProductDetails?.deliveryLocation || 'Petaling Jaya, Malaysia'}
                                    </p>
                                </div>
                            </div>

                            {/* Return & Warranty */}
                            <div className="flex gap-3">
                                <span className="text-2xl">🔄</span>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Return & Warranty</h3>
                                    <p className="text-gray-600 text-sm">
                                        {ProductDetails?.returnDays || '7'} Days Returns
                                    </p>
                                    <p className="text-gray-600 text-sm">
                                        Warranty {ProductDetails?.warranty || 'not available'}
                                    </p>
                                </div>
                            </div>

                            {/* Seller Info */}
                            <div className="flex gap-3">
                                <span className="text-2xl">🏪</span>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Sold by</h3>
                                    <p className="text-gray-600 text-sm font-medium">
                                        {ProductDetails?.seller || 'Becodemy'}
                                    </p>
                                    <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                                        💬 Chat Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description Section */}
                {ProductDetails?.description && (
                    <div className="bg-white rounded-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Description</h2>
                        <p className="text-gray-600 leading-relaxed">
                            {ProductDetails?.description}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ProductDetails;