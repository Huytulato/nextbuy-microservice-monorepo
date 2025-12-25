'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

type OrderRow = {
  id: string;
  total: number;
  status: string;
  deliveryStatus?: string;
  createdAt?: string;
};

const fetchSellerOrders = async (): Promise<OrderRow[]> => {
  const res = await axiosInstance.get('/order/api/seller-orders');
  return res?.data?.orders || [];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

export default function PaymentsPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders-payments'],
    queryFn: fetchSellerOrders,
    staleTime: 1000 * 60,
  });

  const paymentStats = useMemo(() => {
    const paidOrders = orders.filter(
      (o) => o.status?.toLowerCase() === 'paid' || o.status?.toLowerCase() === 'completed'
    );
    const pendingOrders = orders.filter(
      (o) => o.status?.toLowerCase() === 'pending'
    );

    const totalEarnings = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingEarnings = pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Platform takes 5% fee, seller gets 95%
    const sellerEarnings = totalEarnings * 0.95;
    const platformFee = totalEarnings * 0.05;

    return {
      totalEarnings: sellerEarnings,
      platformFee,
      pendingEarnings: pendingEarnings * 0.95,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount: pendingOrders.length,
    };
  }, [orders]);

  const recentPayments = useMemo(() => {
    return orders
      .filter((o) => o.status?.toLowerCase() === 'paid' || o.status?.toLowerCase() === 'completed')
      .slice(0, 10);
  }, [orders]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-2">Track your earnings and payment history</p>
      </div>

      {/* Payment Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Earnings</p>
            <DollarSign className="text-green-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(paymentStats.totalEarnings)}
          </p>
          <p className="text-xs text-gray-500 mt-1">After platform fee (5%)</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Platform Fee</p>
            <TrendingUp className="text-blue-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(paymentStats.platformFee)}
          </p>
          <p className="text-xs text-gray-500 mt-1">5% of total sales</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <Clock className="text-amber-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(paymentStats.pendingEarnings)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {paymentStats.pendingOrdersCount} pending orders
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <CheckCircle className="text-emerald-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {paymentStats.paidOrdersCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">Paid orders</p>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Payments</h2>
        </div>
        <div className="overflow-x-auto">
          {recentPayments.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <DollarSign className="mx-auto mb-2 text-gray-400" size={48} />
                <p className="text-lg mb-1">No payments yet</p>
                <p className="text-sm">Your earnings will appear here once orders are completed</p>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Earnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform Fee
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentPayments.map((payment) => {
                  const sellerEarning = (payment.total || 0) * 0.95;
                  const platformFee = (payment.total || 0) * 0.05;
                  
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{payment.id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payment.total || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {formatCurrency(sellerEarning)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(platformFee)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
