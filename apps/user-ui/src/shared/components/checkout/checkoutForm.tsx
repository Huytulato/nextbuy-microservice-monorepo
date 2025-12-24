import React, { useEffect } from 'react'
import { PaymentElement, useStripe } from '@stripe/react-stripe-js'
import { useElements } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'


const CheckoutForm = ({
  clientSecret,
  cartItems,
  coupon,
  sessionId,
  totalAmount,
}:{
  clientSecret: string;
  cartItems: any[];
  coupon: any;
  sessionId: string | null;
  totalAmount?: number;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"success" | "failed" | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (stripe && elements) {
      setIsReady(true);
      console.log('Stripe Elements ready');
    } else {
      console.log('Waiting for Stripe Elements...', { stripe: !!stripe, elements: !!elements });
    }
  }, [stripe, elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrMsg(null);

    if (!stripe || !elements) {
      setLoading(false);
      return;
    }

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?sessionId=${sessionId}`,
      },
    });

    if (result.error) {
      setStatus("failed");
      setErrMsg(result.error.message || "Payment failed. Please try again.");
    } else {
      setStatus("success");
    } 
    setLoading(false);
  }

  // Calculate total as fallback if totalAmount prop is not provided
  const total = cartItems.reduce((sum, item) => sum + (item.sale_price || item.price || 0) * item.quantity, 0);

  return (
      <div className="flex justify-center items-center min-h-[80vh] px-4 my-10">
          <form className="bg-white w-full max-w-lg p-8 rounded-md shadow space-y-6" onSubmit={handleSubmit}>
              <h2 className="text-3xl font-bold text-center mb-2">
                  Secure Payment Checkout
              </h2>

              {/* Dynamic Order Summary */}
              <div className="bg-gray-100 p-4 rounded-md text-sm text-gray-700 space-y-2">
                  {cartItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm pb-1">
                          <span>
                              {item.quantity} x {item.title}
                          </span>
                          <span>${(item.quantity * (item.sale_price || item.price || 0)).toFixed(2)}</span>
                      </div>
                  ))}

                  <div className="flex justify-between font-semibold pt-2 border-t border-gray-300">
                      {coupon && coupon?.discountAmount !== 0 && (
                          <>
                              <span>Discount</span>
                              <span className="text-green-600">
                                  -${(coupon?.discountAmount)?.toFixed(2)}
                              </span>
                          </>
                      )}
                  </div>

                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
                      <span>Total</span>
                      <span>
                        ${(totalAmount ? (totalAmount - (coupon?.discountAmount || 0)) : (total - (coupon ? coupon.discountAmount : 0))).toFixed(2)}
                      </span>
                  </div>
              </div>

              {!isReady ? (
                <div className="py-6 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading payment form...</p>
                </div>
              ) : (
                <div className="py-4">
                  <PaymentElement />
                </div>
              )}

              <button
                  type="submit"
                  disabled={!stripe || !elements || !isReady || loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                  {loading ? (
                      <span className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin w-5 h-5" />
                          Processing...
                      </span>
                  ) : (
                      "Pay Now"
                  )}
              </button>

              {errMsg && (
                  <div className="flex items-center gap-2 text-red-600 text-sm justify-center">
                      <XCircle className="w-5 h-5" />
                      {errMsg}
                  </div>
              )}

              {status === "success" && (
                  <div className="flex items-center gap-2 text-green-600 text-sm justify-center">
                      <CheckCircle className="w-5 h-5" />
                      Payment successful!
                  </div>
              )}

              {status === "failed" && (
                  <div className="flex items-center gap-2 text-red-600 text-sm justify-center">
                      <XCircle className="w-5 h-5" />
                      Payment failed. Please try again.
                  </div>
              )}
          </form>
      </div>
  );
}

export default CheckoutForm