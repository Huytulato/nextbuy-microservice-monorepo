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
  onCheckout?: () => void;
  loading?: boolean;
}

const CartSummary: React.FC<CartSummaryProps> = ({
  selectedAddressId = "",
  onAddressChange,
  selectedPaymentMethod = "Online Payment",
  onPaymentMethodChange,
  onCheckout,
  loading = false,
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-blue-600" />
        Order Summary
      </h2>

      {/* Subtotal */}
      <div className="flex items-center justify-between text-gray-600 mb-6">
        <span>Subtotal ({itemsCount} items)</span>
        <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
      </div>

      {/* Have a Coupon? */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-gray-400" />
          Promo Code
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter code"
            disabled={promoApplied}
            className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm transition-all"
          />
          <button
            onClick={handleApplyPromo}
            disabled={promoApplied || !promoCode.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            Apply
          </button>
        </div>
        {promoApplied && (
          <p className="text-sm text-green-600 mt-2 flex items-center gap-1.5 bg-green-50 p-2 rounded-lg border border-green-100">
            <Tag className="w-3.5 h-3.5" />
            Promo code applied successfully!
          </p>
        )}
      </div>

      <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
        {/* Select Shipping Address */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gray-400" />
            Shipping Address
          </label>
          <select
            value={selectedAddressId}
            onChange={(e) => onAddressChange?.(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
          >
            {!addressesData || addressesData.length === 0 ? (
              <option value="">No addresses available</option>
            ) : (
              addressesData.map((addr: any) => (
                <option key={addr.id} value={addr.id}>
                  {addr.fullName} - {addr.address}
                </option>
              ))
            )}
          </select>
          {selectedAddress && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
              <p className="font-medium">{selectedAddress.fullName}</p>
              <p className="mt-0.5 opacity-80">{selectedAddress.address}, {selectedAddress.city}, {selectedAddress.postalCode}</p>
            </div>
          )}
        </div>

        {/* Select Payment Method */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Payment Method
          </label>
          <select
            value={selectedPaymentMethod}
            onChange={(e) => onPaymentMethodChange?.(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
          >
            <option value="Online Payment">Online Payment (Stripe)</option>
            <option value="Cash on Delivery">Cash on Delivery</option>
          </select>
        </div>
      </div>

      {/* Shipping Info */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between text-gray-600 text-sm">
          <span className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-gray-400" />
            Shipping Fee
          </span>
          <span className="font-medium text-gray-900">
            {shippingFee === 0 ? <span className="text-green-600">FREE</span> : formatPrice(shippingFee)}
          </span>
        </div>
        
        {discount > 0 && (
          <div className="flex items-center justify-between text-green-600 text-sm">
            <span>Discount (10%)</span>
            <span className="font-medium">-{formatPrice(discount)}</span>
          </div>
        )}

        {amountUntilFreeShipping > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-700 flex items-start gap-2">
            <div className="mt-0.5">ℹ️</div>
            <p>Add <span className="font-bold">{formatPrice(amountUntilFreeShipping)}</span> more to your cart to qualify for free shipping!</p>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between mb-6 pt-4 border-t border-gray-100">
        <span className="text-lg font-bold text-gray-900">Total</span>
        <div className="text-right">
          <span className="text-2xl font-bold text-blue-600 block">{formatPrice(total)}</span>
          <span className="text-xs text-gray-500 font-medium">Including VAT</span>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        disabled={!selectedAddressId || loading}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 mb-3"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Proceed to Checkout
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      <Link
        href="/products"
        className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
      >
        Continue Shopping
      </Link>

      {/* Security Badge */}
      <div className="mt-6 pt-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Secure checkout · SSL encrypted
        </p>
      </div>
    </div>
  )
}

export default CartSummary
