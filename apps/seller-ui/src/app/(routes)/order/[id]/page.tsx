'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance';

type DeliveryStatus = 'ordered' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered';

const DELIVERY_STEPS: { key: DeliveryStatus; label: string }[] = [
  { key: 'ordered', label: 'Ordered' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const statusBadge = (status?: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid' || s === 'completed') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (s === 'pending') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (s === 'failed' || s === 'cancelled') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
};

const fetchOrder = async (id: string) => {
  const res = await axiosInstance.get(`/order/api/order-details/${id}`);
  return res?.data?.order;
};

const updateDelivery = async (id: string, deliveryStatus: DeliveryStatus) => {
  const res = await axiosInstance.put(`/order/api/order-delivery-status/${id}`, { deliveryStatus });
  return res?.data?.order;
};

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const orderId = params.id;
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['seller-order', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
    staleTime: 1000 * 30,
  });

  const deliveryStatus: DeliveryStatus = (order?.deliveryStatus || 'ordered') as DeliveryStatus;
  const activeStepIndex = Math.max(0, DELIVERY_STEPS.findIndex((s) => s.key === deliveryStatus));

  const mutation = useMutation({
    mutationFn: (nextStatus: DeliveryStatus) => updateDelivery(orderId, nextStatus),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(['seller-order', orderId], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    },
  });

  const items = useMemo(() => {
    const raw = order?.items || [];
    return Array.isArray(raw) ? raw : [];
  }, [order?.items]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[#070d1f] to-[#040713] text-white p-8">
      <Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
        <ChevronLeft size={18} />
        Go Back to Dashboard
      </Link>

      {isLoading ? (
        <div className="mt-10 text-slate-400">Loading order...</div>
      ) : !order ? (
        <div className="mt-10 text-slate-400">Order not found.</div>
      ) : (
        <div className="mt-8 max-w-5xl">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-semibold">Order #{String(order.id).slice(-6).toUpperCase()}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${statusBadge(order.status)}`}>
                  Payment: {(order.status || 'unknown').toString()}
                </span>
                <span className="text-slate-400">Total Paid: <span className="text-slate-200">${Number(order.total || 0).toFixed(2)}</span></span>
                <span className="text-slate-400">Date: <span className="text-slate-200">{formatDate(order.createdAt)}</span></span>
              </div>
            </div>

            <div className="min-w-[240px]">
              <label className="block text-sm text-slate-300 mb-2">Update Delivery Status:</label>
              <select
                value={deliveryStatus}
                onChange={(e) => mutation.mutate(e.target.value as DeliveryStatus)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                disabled={mutation.isPending}
              >
                {DELIVERY_STEPS.map((s) => (
                  <option key={s.key} value={s.key} className="text-black">
                    {s.label}
                  </option>
                ))}
              </select>
              {mutation.isPending && <div className="mt-2 text-xs text-slate-400">Updating...</div>}
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-8">
            <div className="flex items-center justify-between gap-3">
              {DELIVERY_STEPS.map((step, idx) => {
                const done = idx <= activeStepIndex;
                return (
                  <div key={step.key} className="flex-1">
                    <div className="text-xs mb-2 text-slate-400">{step.label}</div>
                    <div className="relative flex items-center">
                      <div className={`h-[2px] w-full ${idx === 0 ? 'opacity-0' : done ? 'bg-blue-500' : 'bg-white/10'}`} />
                      <div className="absolute -left-1">
                        <div className={`w-3.5 h-3.5 rounded-full border ${done ? 'bg-blue-500 border-blue-400' : 'bg-[#070d1f] border-white/20'}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping */}
          <div className="mt-10">
            <h2 className="text-lg font-semibold mb-3">Shipping Address</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-slate-200">
              {order.shippingAddress ? (
                <div className="space-y-1 text-sm">
                  <div className="text-slate-100 font-medium">{order.shippingAddress.fullName}</div>
                  <div className="text-slate-300">{order.shippingAddress.phone}</div>
                  <div className="text-slate-300">
                    {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                    {order.shippingAddress.postalCode}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-sm">No shipping address found.</div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="mt-10">
            <h2 className="text-lg font-semibold mb-3">Order Items</h2>
            <div className="space-y-3">
              {items.map((item: any) => {
                const product = item.product;
                const imageUrl = product?.images?.[0]?.url;
                const options = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];

                return (
                  <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                        {imageUrl ? (
                          <Image src={imageUrl} alt={product?.title || 'product'} width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-xs text-slate-500">No Image</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-slate-100 font-medium truncate">{product?.title || 'Item'}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Quantity: {item.quantity}
                          {options.length > 0 ? (
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
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="text-slate-100 font-medium">${Number(item.price || 0).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

