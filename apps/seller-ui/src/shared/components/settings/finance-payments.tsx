'use client'
import React, { useState } from 'react'
import { CreditCard, ExternalLink, CheckCircle, XCircle, Loader } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import toast from 'react-hot-toast'

const fetchStripeAccount = async () => {
  const res = await axiosInstance.get('/seller/api/get-stripe-account')
  return res.data.seller
}

const createStripeLink = async (sellerId: string) => {
  const res = await axiosInstance.post('/seller/api/create-stripe-account', {
    sellerId
  })
  return res.data
}

const FinancePayments = () => {
  const { data: stripeAccount, isLoading, refetch } = useQuery({
    queryKey: ['stripe-account'],
    queryFn: fetchStripeAccount,
  })

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      const sellerRes = await axiosInstance.get('/api/logged-in-seller')
      const sellerId = sellerRes.data.seller.id
      return createStripeLink(sellerId)
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank')
        toast.success('Redirecting to Stripe onboarding...')
        setTimeout(() => {
          refetch()
        }, 2000)
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create Stripe account link')
    },
  })

  const handleConnectStripe = () => {
    createLinkMutation.mutate()
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading payment information...</div>
  }

  const isConnected = stripeAccount?.hasStripeAccount || stripeAccount?.stripeId

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`p-6 rounded-lg border-2 ${isConnected ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          {isConnected ? (
            <CheckCircle size={24} className="text-green-600" />
          ) : (
            <XCircle size={24} className="text-yellow-600" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">
              {isConnected ? 'Stripe Account Connected' : 'Stripe Account Not Connected'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {isConnected
                ? 'Your Stripe account is connected and ready to receive payments.'
                : 'Connect your Stripe account to start receiving payments from customers.'}
            </p>
          </div>
        </div>

        {isConnected && stripeAccount?.stripeId && (
          <div className="mt-4 p-3 bg-white rounded border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Stripe Account ID</p>
            <p className="text-sm font-mono text-gray-900">{stripeAccount.stripeId}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-4">
        {!isConnected ? (
          <button
            onClick={handleConnectStripe}
            disabled={createLinkMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {createLinkMutation.isPending ? (
              <>
                <Loader size={18} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CreditCard size={18} />
                Connect Stripe Account
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => refetch()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Refresh Status
            </button>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <ExternalLink size={18} />
              Open Stripe Dashboard
            </a>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">About Stripe</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Stripe is a secure payment processor used to handle customer payments</li>
          <li>You'll receive payments directly to your connected Stripe account</li>
          <li>Stripe charges a small transaction fee per payment</li>
          <li>You can manage payouts and settings in your Stripe dashboard</li>
        </ul>
      </div>
    </div>
  )
}

export default FinancePayments

