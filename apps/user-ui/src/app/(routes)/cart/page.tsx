'use client'
import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ShoppingCart, ShoppingBag, ArrowLeft } from 'lucide-react'
import { useStore } from '../../../store'
import CartItem from '../../../shared/components/cart/cart-item'
import CartSummary from '../../../shared/components/cart/cart-summary'
import { useRouter } from 'next/navigation'
import useUser from 'apps/user-ui/src/hooks/useUser'
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance'
import toast from 'react-hot-toast'

const CartPage = () => {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const cart = useStore((state: any) => state.cart);
  const clearCart = useStore((state: any) => state.clearCart);

  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Online Payment");
  const [loading, setLoading] = useState(false);

  // Auth check: redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Generate cart hash for session reuse detection
  const cartHash = useMemo(() => {
    if (cart.length === 0) return '';
    const normalized = cart
      .map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        sale_price: item.price || item.sale_price, // Map price to sale_price for consistency
        shopId: item.shopId,
        selectedOptions: item.selectedOptions || [],
      }))
      .sort((a: any, b: any) => a.id.localeCompare(b.id));
    return JSON.stringify(normalized);
  }, [cart]);

  const createPaymentSession = async () => {
    if (!user?.id) {
      toast.error("Please log in to continue checkout.");
      router.push('/login');
      return;
    }

    if (!selectedAddressId) {
      toast.error("Please select a shipping address.");
      return;
    }

    setLoading(true);
    try {
      // Map cart items to ensure sale_price field exists (backend expects sale_price)
      const cartWithSalePrice = cart.map((item: any) => ({
        ...item,
        sale_price: item.price || item.sale_price, // Map price to sale_price for backend
      }));

      const res = await axiosInstance.post(
        "/order/api/create-payment-session",
        {
          cart: cartWithSalePrice,
          selectedAddressId,
          coupon: {},
        }
      );

      const sessionId = res.data.sessionId;
      // Store sessionId in localStorage for reuse detection on return
      if (sessionId) {
        localStorage.setItem('lastSessionId', sessionId);
        localStorage.setItem('lastCartHash', cartHash);
      }
      router.push(`/checkout?sessionId=${sessionId}`);
    } catch (error: any) {
      console.error('Session creation error:', error);
      toast.error("Failed to create payment session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart();
      // Clear session cache on cart clear
      localStorage.removeItem('lastSessionId');
      localStorage.removeItem('lastCartHash');
    }
  }

  // Show loading or redirect while checking auth
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth gate: if not logged in, show message
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Please Log In</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You need to be logged in to view and manage your cart.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-8 py-3 border-2 border-blue-600 hover:border-blue-700 text-blue-600 font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }



  // Empty cart state
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Looks like you haven't added any items to your cart yet. Start shopping to fill it up!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" />
                Start Shopping
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
              <ShoppingCart className="w-8 h-8" />
              Shopping Cart
              <span className="text-xl text-gray-500 font-normal">
                ({cart.reduce((total: number, item: any) => total + (item.quantity || 1), 0)} items)
              </span>
            </h1>
            <button
              onClick={handleClearCart}
              className="px-4 py-2 text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Clear Cart
            </button>
          </div>
        </div>

        {/* Cart Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item: any) => (
              <CartItem
                key={item.id}
                id={item.id}
                title={item.title}
                price={item.price}
                image={item.image}
                quantity={item.quantity || 1}
                shopId={item.shopId}
              />
            ))}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <CartSummary 
              selectedAddressId={selectedAddressId}
              onAddressChange={setSelectedAddressId}
              selectedPaymentMethod={selectedPaymentMethod}
              onPaymentMethodChange={setSelectedPaymentMethod}
              onCheckout={createPaymentSession}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
