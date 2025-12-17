'use client'
import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { ShoppingCart, Tag, Truck, ArrowRight, MapPin, CreditCard } from 'lucide-react'
import { useStore } from '../../../store'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../../utils/axiosInstance'

interface CartSummaryProps {
  selectedAddressId?: string;
  onAddressChange?: (addressId: string) => void;
  selectedPaymentMethod?: string;
  onPaymentMethodChange?: (method: string) => void;
}

const CartSummary: React.FC<CartSummaryProps> = ({
  selectedAddressId = "",
  onAddressChange,
  selectedPaymentMethod = "Online Payment",
  onPaymentMethodChange,
}) => {
  const cart = useStore((state: any) => state.cart)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)

  // Fetch shipping addresses
  const { data: addressesData } = useQuery({
    queryKey: ["shipping-addresses"],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get("/api/shipping-addresses");
        return res.data.addresses || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Get selected address
  const selectedAddress = useMemo(() => {
    if (!addressesData || !selectedAddressId) {
      // Return default address if available
      return addressesData?.find((addr: any) => addr.isDefault) || null;
    }
    return addressesData.find((addr: any) => addr.id === selectedAddressId) || null;
  }, [addressesData, selectedAddressId]);

  // Set default address on mount
  React.useEffect(() => {
    if (addressesData && addressesData.length > 0 && !selectedAddressId && onAddressChange) {
      const defaultAddr = addressesData.find((addr: any) => addr.isDefault);
      if (defaultAddr) {
        onAddressChange(defaultAddr.id);
      } else if (addressesData[0]) {
        onAddressChange(addressesData[0].id);
      }
    }
  }, [addressesData, selectedAddressId, onAddressChange]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price)
  }

  // Calculate totals
  const subtotal = cart.reduce((total: number, item: any) => total + (item.price * (item.quantity || 1)), 0)
  const itemsCount = cart.reduce((total: number, item: any) => total + (item.quantity || 1), 0)
  
  // Shipping logic
  const freeShippingThreshold = 50
  const shippingFee = subtotal >= freeShippingThreshold ? 0 : 5
  const amountUntilFreeShipping = Math.max(0, freeShippingThreshold - subtotal)
  
  // Discount (mockup - can be implemented later)
  const discount = promoApplied ? subtotal * 0.1 : 0 // 10% discount
  
  const total = subtotal + shippingFee - discount

  const handleApplyPromo = () => {
    if (promoCode.trim().toLowerCase() === 'save10') {
      setPromoApplied(true)
    } else {
      alert('Invalid promo code')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <ShoppingCart className="w-5 h-5" />
        Order Summary
      </h2>


      {/* Subtotal */}
      <div className="flex items-center justify-between text-gray-600 mb-4 pb-4 border-b border-gray-200">
        <span>Subtotal</span>
        <span className="font-semibold">{formatPrice(subtotal)}</span>
      </div>

      {/* Have a Coupon? */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          <Tag className="w-4 h-4" />
          Have a Coupon?
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter code"
            disabled={promoApplied}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleApplyPromo}
            disabled={promoApplied || !promoCode.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Apply
          </button>
        </div>
        {promoApplied && (
          <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
            <Tag className="w-4 h-4" />
            Promo code applied!
          </p>
        )}
      </div>

      {/* Select Shipping Address */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          Select Shipping Address
        </label>
        <select
          value={selectedAddressId}
          onChange={(e) => onAddressChange?.(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {!addressesData || addressesData.length === 0 ? (
            <option value="">No addresses available</option>
          ) : (
            addressesData.map((addr: any) => (
              <option key={addr.id} value={addr.id}>
                {addr.fullName} - {addr.address}, {addr.city}, {addr.postalCode}, {addr.province}
                {addr.isDefault ? " (Default)" : ""}
              </option>
            ))
          )}
        </select>
        {selectedAddress && (
          <p className="text-xs text-gray-500 mt-1">
            {selectedAddress.fullName}, {selectedAddress.address}, {selectedAddress.city}
          </p>
        )}
      </div>

      {/* Select Payment Method */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          <CreditCard className="w-4 h-4" />
          Select Payment Method
        </label>
        <select
          value={selectedPaymentMethod}
          onChange={(e) => onPaymentMethodChange?.(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="Online Payment">Online Payment</option>
          <option value="Cash on Delivery">Cash on Delivery</option>
          <option value="Credit Card">Credit Card</option>
        </select>
      </div>

      {/* Shipping Info */}
      <div className="mb-4 pb-4 border-b border-gray-200 space-y-2">
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1">
            <Truck className="w-4 h-4" />
            Shipping
          </span>
          <span className="font-semibold">
            {shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}
          </span>
        </div>
        {amountUntilFreeShipping > 0 && (
          <p className="text-sm text-gray-500">
            Add {formatPrice(amountUntilFreeShipping)} more for free shipping!
          </p>
        )}
      </div>

      {/* Discount */}
      {discount > 0 && (
        <div className="flex items-center justify-between text-green-600 mb-4 pb-4 border-b border-gray-200">
          <span>Discount (10%)</span>
          <span className="font-semibold">-{formatPrice(discount)}</span>
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between text-lg font-bold text-gray-900 mb-6">
        <span>Total</span>
        <span className="text-2xl text-red-600">{formatPrice(total)}</span>
      </div>

      {/* Checkout Button */}
      <Link
        href="/checkout"
        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors mb-3"
      >
        Proceed to Checkout
        <ArrowRight className="w-5 h-5" />
      </Link>

      <Link
        href="/products"
        className="w-full py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        Continue Shopping
      </Link>

      {/* Security Badge */}
      <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        🔒 Secure checkout · SSL encrypted
      </div>
    </div>
  )
}

export default CartSummary
