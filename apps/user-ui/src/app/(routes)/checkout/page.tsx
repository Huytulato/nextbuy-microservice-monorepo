'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter} from 'next/navigation'
import { loadStripe, Appearance } from '@stripe/stripe-js'
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { XCircle, Loader } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from 'apps/user-ui/src/shared/components/checkout/checkoutForm';
import useUser from 'apps/user-ui/src/hooks/useUser';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CheckoutPage = () => {
  const [clientSecret, setClientSecret] = useState("");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [coupon, setCoupon] = useState();
  const [totalAmount, setTotalAmount] = useState(0);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const sessionId = searchParams.get("sessionId");

  // Auth check: redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    const fetchSessionAndClientSecret = async () => {
      // Wait for auth check
      if (userLoading) return;

      if (!sessionId) {
        setError("No session ID provided. Redirecting to cart...");
        setLoading(false);
        setTimeout(() => router.push("/cart"), 2000);
        return;
      }

      try {
        // Verify payment session from backend
        const verifyRes = await axiosInstance.get(
          `/order/api/verifying-payment-session?sessionId=${sessionId}`,
          { withCredentials: true }
        );

        const sessionData = verifyRes.data.session;

        if (!sessionData) {
          throw new Error("Session data not found");
        }

        const { totalAmount: amt, sellers: sel, cart, coupon: coup, status } = sessionData;

        // Check if session is expired or already completed
        if (status === 'completed') {
          setError("This payment session has already been completed. Starting a new checkout...");
          setTimeout(() => router.push("/cart"), 2500);
          setLoading(false);
          return;
        }

        if (!sel || sel.length === 0 || amt === undefined || amt === null) {
          throw new Error("Invalid session data.");
        }

        setCartItems(cart);
        setCoupon(coup);
        setTotalAmount(amt);
        setSellers(sel);

        const sellerStripeAccountId = sel[0].stripeId;

        // Create payment intent
        const intentRes = await axiosInstance.post(
          "/order/api/create-payment-intent",
          {
            amount: coup?.discountAmount ? amt - coup.discountAmount : amt,
            sellerStripeAccountId,
            sessionId,
          },
          { withCredentials: true }
        );

        setClientSecret(intentRes.data.clientSecret);
      } catch (err: any) {
        console.error("Checkout error:", err);
        
        // Handle specific errors
        if (err.response?.status === 404) {
          setError("Payment session expired. Please create a new checkout.");
          setTimeout(() => router.push("/cart"), 2000);
        } else if (err.response?.status === 401) {
          setError("You are not authorized. Please log in again.");
          setTimeout(() => router.push("/login"), 2000);
        } else {
          setError("Failed to initialize payment. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndClientSecret();
  }, [sessionId, userLoading]);
  
  const appearance: Appearance = {
    theme: 'stripe',
  };

  // Loading state
  if (loading || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <div className="w-full text-center">
          <div className="flex justify-center mb-4">
            <Loader className="text-blue-600 w-10 h-10 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Loading checkout...
          </h2>
          <p className="text-sm text-gray-600">
            Please wait while we prepare your payment.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <div className="w-full text-center max-w-md">
          <div className="flex justify-center mb-4">
            <XCircle className="text-red-500 w-10 h-10" />
          </div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Checkout Error
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push("/cart")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  // Success state - render Stripe checkout
  return (
    clientSecret ? (
      <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
        <CheckoutForm 
          cartItems={cartItems} 
          coupon={coupon} 
          sessionId={sessionId}
          totalAmount={totalAmount}
        />
      </Elements>
    ) : null
  );
};

export default CheckoutPage;