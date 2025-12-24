'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useOrderDetails } from 'apps/user-ui/src/hooks/useOrders';
import OrderTrackingStepper from 'apps/user-ui/src/shared/components/order-tracking-stepper';
import { Loader2, ArrowLeft } from 'lucide-react';

const OrderDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { order, isLoading } = useOrderDetails(orderId);

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'paid') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (statusLower === 'pending') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    if (statusLower === 'failed' || statusLower === 'cancelled') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString();
  };

  const items = useMemo(() => {
    const raw = order?.items || [];
    return Array.isArray(raw) ? raw : [];
  }, [order?.items]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order not found</p>
          <button
            onClick={() => router.push('/profile?active=My+Orders')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to My Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-14">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/profile?active=My+Orders')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Orders
        </button>

        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Order #{String(order.id).slice(-6).toUpperCase()}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(order.status)}`}>
              Payment Status: {order.status || 'Pending'}
            </span>
            <div className="text-gray-600">
              <span className="font-medium">Total:</span>{' '}
              <span className="text-gray-800 font-semibold">${Number(order.total || 0).toFixed(2)}</span>
            </div>
            <div className="text-gray-600">
              <span className="font-medium">Date:</span>{' '}
              <span className="text-gray-800">{formatDate(order.createdAt)}</span>
            </div>
          </div>

          {/* Order Tracking Stepper */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Tracking</h2>
            <OrderTrackingStepper currentStatus={order.deliveryStatus || 'ordered'} />
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h2>
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items found</p>
            ) : (
              items.map((item: any) => {
                const product = item.product;
                const imageUrl = product?.images?.[0]?.url || product?.images?.[0];
                const options = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product?.title || 'Product'}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xs text-gray-400">No Image</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 truncate">
                        {product?.title || 'Product'}
                      </h3>
                      <div className="text-sm text-gray-600 mt-1">
                        <span>Quantity: {item.quantity}</span>
                        {options.length > 0 && (
                          <span className="ml-3">
                            {options
                              .map((o: any) => {
                                if (typeof o === 'string') return o;
                                if (o?.name && o?.value) return `${o.name}: ${o.value}`;
                                if (o?.label && o?.value) return `${o.label}: ${o.value}`;
                                return '';
                              })
                              .filter(Boolean)
                              .join(' • ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">
                        ${Number(item.price || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Shipping Address</h2>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="space-y-1 text-sm">
                <div className="font-medium text-gray-800">{order.shippingAddress.fullName}</div>
                <div className="text-gray-600">{order.shippingAddress.phone}</div>
                <div className="text-gray-600">
                  {order.shippingAddress.address}, {order.shippingAddress.city},{' '}
                  {order.shippingAddress.province} {order.shippingAddress.postalCode}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsPage;

