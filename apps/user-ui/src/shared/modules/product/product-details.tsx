"use client";
import React, { useState, useMemo, useEffect } from 'react'
import { useStore } from '../../../store'
import useUser from '../../../hooks/useUser'

const ProductDetails = ({ProductDetails}: {ProductDetails: any}) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(ProductDetails?.sizes?.[0] || 'XS');
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [selectedVariation, setSelectedVariation] = useState<any>(null);
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
    
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

    // Initialize selected attributes from variation groups
    useEffect(() => {
        if (ProductDetails?.hasVariations && ProductDetails?.variationGroups?.length > 0) {
            const initialAttributes: Record<string, string> = {};
            ProductDetails.variationGroups.forEach((group: any) => {
                if (group.options && group.options.length > 0) {
                    initialAttributes[group.name] = group.options[0];
                }
            });
            setSelectedAttributes(initialAttributes);
        } else if (ProductDetails?.hasVariations && ProductDetails?.variations?.length === 1) {
            // Auto-select if only one variation (default variation)
            const defaultVariation = ProductDetails.variations[0];
            if (defaultVariation?.attributes) {
                setSelectedAttributes(defaultVariation.attributes);
            }
        }
    }, [ProductDetails]);

    // Find matching variation based on selected attributes
    useEffect(() => {
        if (ProductDetails?.hasVariations && ProductDetails?.variations?.length > 0) {
            // If no variation groups but has variations, check for default variation
            if (ProductDetails?.variationGroups?.length === 0 && ProductDetails?.variations?.length === 1) {
                const defaultVariation = ProductDetails.variations[0];
                if (defaultVariation?.attributes?.default === 'default') {
                    setSelectedVariation(defaultVariation);
                    return;
                }
            }
            
            // If attributes are selected, find matching variation
            if (Object.keys(selectedAttributes).length > 0) {
                const matchingVariation = ProductDetails.variations.find((v: any) => {
                    if (!v.attributes) return false;
                    // Skip default attribute when matching
                    const filteredAttributes = Object.fromEntries(
                        Object.entries(selectedAttributes).filter(([key]) => key !== 'default')
                    );
                    const filteredVariationAttributes = Object.fromEntries(
                        Object.entries(v.attributes).filter(([key]) => key !== 'default')
                    );
                    
                    // If both are empty after filtering, it's a match (default variation)
                    if (Object.keys(filteredAttributes).length === 0 && Object.keys(filteredVariationAttributes).length === 0) {
                        return true;
                    }
                    
                    return Object.entries(filteredAttributes).every(
                        ([key, value]) => filteredVariationAttributes[key] === value
                    );
                });
                setSelectedVariation(matchingVariation || null);
            } else {
                setSelectedVariation(null);
            }
        } else {
            setSelectedVariation(null);
        }
    }, [selectedAttributes, ProductDetails]);

    // Get current price and stock based on variation or product
    const currentPrice = selectedVariation?.price || ProductDetails?.price || 0;
    const currentStock = selectedVariation?.stock || ProductDetails?.stock || 0;
    const currentSku = selectedVariation?.sku || `SKU-${ProductDetails?.id?.slice(0, 8).toUpperCase()}`;

    const handleQuantityChange = (type: 'increment' | 'decrement') => {
        if (type === 'increment') {
            setQuantity(prev => {
                const maxStock = selectedVariation?.stock || ProductDetails?.stock || 0;
                return prev < maxStock ? prev + 1 : prev;
            });
        } else if (type === 'decrement' && quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

    const calculateDiscount = () => {
        const originalPrice = ProductDetails?.originalPrice || ProductDetails?.regular_price || 0;
        if (originalPrice && currentPrice) {
            const discount = ((originalPrice - currentPrice) / originalPrice) * 100;
            return Math.round(discount);
        }
        return 0;
    };

    // Transform product for store
    const transformProductForStore = () => {
        // Format variation name (exclude 'default' attribute)
        let variationName = null;
        if (selectedVariation?.attributes) {
            const attrs = Object.entries(selectedVariation.attributes)
                .filter(([key]) => key !== 'default')
                .map(([, value]) => value);
            if (attrs.length > 0) {
                variationName = attrs.join(' / ');
            }
        }
        
        return {
            id: ProductDetails.id,
            title: ProductDetails.title,
            price: currentPrice,
            image: ProductDetails.images?.[0] || '/placeholder-product.png',
            quantity: quantity,
            shopId: ProductDetails.shopId,
            variationId: selectedVariation?.id || null,
            variationName: variationName,
            variationAttributes: selectedVariation?.attributes || null,
            sku: currentSku,
        };
    }

    // Handle add to cart
    const handleAddToCart = () => {
        if (currentStock === 0) {
            alert('This product is out of stock');
            return;
        }
        if (!ProductDetails?.id || !ProductDetails?.shopId) {
            alert('Product information is missing');
            return;
        }
        
        // If product has variations, ensure one is selected
        if (ProductDetails?.hasVariations) {
            if (!selectedVariation) {
                alert('Please select all product options (variations) before adding to cart');
                return;
            }
            // Double check: if variation groups exist, ensure all are selected
            if (ProductDetails?.variationGroups?.length > 0) {
                const allSelected = ProductDetails.variationGroups.every((group: any) => 
                    selectedAttributes[group.name] !== undefined
                );
                if (!allSelected) {
                    alert('Please select all product options before adding to cart');
                    return;
                }
            }
        }
        
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
                                    ${currentPrice}
                                </span>
                                {(ProductDetails?.originalPrice || ProductDetails?.regular_price) && currentPrice < (ProductDetails?.originalPrice || ProductDetails?.regular_price || 0) && (
                                    <>
                                        <span className="text-lg text-gray-500 line-through">
                                            ${ProductDetails?.originalPrice || ProductDetails?.regular_price}
                                        </span>
                                        <span className="text-orange-500 font-semibold">
                                            -{calculateDiscount()}%
                                        </span>
                                    </>
                                )}
                            </div>
                            {selectedVariation && (
                                <div className="mt-2 text-sm text-gray-500">
                                    <span className="font-mono">{currentSku}</span>
                                </div>
                            )}
                        </div>

                        {/* Variation Selectors */}
                        {ProductDetails?.hasVariations && ProductDetails?.variationGroups?.length > 0 && (
                            <div className="mb-6 space-y-4">
                                {ProductDetails.variationGroups.map((group: any) => (
                                    <div key={group.name}>
                                        <label className="block text-gray-700 font-semibold mb-2">{group.name}:</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {group.options.map((option: string) => {
                                                const isSelected = selectedAttributes[group.name] === option;
                                                // Check if this option is available (has stock)
                                                const testAttributes = { ...selectedAttributes, [group.name]: option };
                                                const matchingVar = ProductDetails.variations?.find((v: any) => 
                                                    v.attributes && Object.entries(testAttributes).every(
                                                        ([k, val]) => v.attributes[k] === val
                                                    )
                                                );
                                                const isAvailable = matchingVar && matchingVar.stock > 0;
                                                
                                                return (
                                                    <button
                                                        key={option}
                                                        onClick={() => setSelectedAttributes(prev => ({ ...prev, [group.name]: option }))}
                                                        disabled={!isAvailable}
                                                        className={`px-4 py-2 rounded font-medium transition-all ${
                                                            isSelected
                                                                ? 'bg-gray-900 text-white'
                                                                : isAvailable
                                                                ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                                                        }`}
                                                    >
                                                        {option}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Legacy Size Selector (for products without variations) */}
                        {!ProductDetails?.hasVariations && ProductDetails?.sizes && ProductDetails?.sizes?.length > 0 && (
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
                                    currentStock > 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                }`}>
                                    {currentStock > 0
                                        ? `In Stock (${currentStock} available)`
                                        : 'Out of Stock'}
                                </span>
                            </div>
                            {ProductDetails?.hasVariations && !selectedVariation && (
                                <div className="text-sm text-amber-600 mt-1">
                                    ⚠️ Please select all options to check availability
                                </div>
                            )}
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
                                        disabled={quantity >= currentStock}
                                        className={`px-4 py-2 text-gray-600 hover:bg-gray-100 ${
                                            quantity >= currentStock ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
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
                                disabled={currentStock === 0 || isAddingToCart || (ProductDetails?.hasVariations && !selectedVariation)}
                                className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                                    currentStock > 0 && !isAddingToCart && (!ProductDetails?.hasVariations || selectedVariation)
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