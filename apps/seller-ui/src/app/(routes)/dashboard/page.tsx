'use client'
import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, ShoppingCart, Package, Clock, Eye, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'

type OrderRow = {
  id: string;
  total: number;
  status: string;
  deliveryStatus?: string;
  createdAt?: string;
  user?: {
    name?: string;
    email?: string;
    avatar?: any;
  };
};

const fetchSellerOrders = async (): Promise<OrderRow[]> => {
  const res = await axiosInstance.get('/order/api/seller-orders');
  return res?.data?.orders || [];
};

const fetchProducts = async () => {
  const res = await axiosInstance.get('/product/api/get-shop-products');
  return res?.data?.products || [];
};

const statusBadge = (status?: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid' || s === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'failed' || s === 'cancelled') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
};

const formatCurrency = (amount: number) => {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function DashboardPage() {
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: fetchSellerOrders,
    staleTime: 1000 * 60,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['shop-products'],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5,
  });

  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter(o => ['paid', 'completed'].includes(o.status.toLowerCase()))
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    
    const totalOrders = orders.length;
    const totalProducts = products.length;
    const pendingOrders = orders.filter(o => o.status.toLowerCase() === 'pending').length;

    return {
      totalRevenue,
      totalOrders,
      totalProducts,
      pendingOrders,
    };
  }, [orders, products]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 10);
  }, [orders]);

  const isLoading = ordersLoading || productsLoading;

  return (
    <div className='w-full min-h-screen p-8'>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <div className="flex items-center text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue Card */}
        <Link href="/dashboard/orders" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </Link>

        {/* Total Orders Card */}
        <Link href="/dashboard/orders" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.totalOrders}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="text-blue-600" size={24} />
            </div>
          </div>
        </Link>

        {/* Total Products Card */}
        <Link href="/dashboard/all-products" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.totalProducts}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="text-purple-600" size={24} />
            </div>
          </div>
        </Link>

        {/* Pending Orders Card */}
        <Link href="/dashboard/orders" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.pendingOrders}
              </p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="text-amber-600" size={24} />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            <p className="text-sm text-gray-600">Latest orders from your shop</p>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ChevronRight size={16} />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-600">Loading orders...</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p>No orders found</p>
            <p className="text-sm mt-2">Start selling to see your orders here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{String(order.id).slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900">{order.user?.name || '—'}</span>
                        <span className="text-xs text-gray-500">{order.user?.email || ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatCurrency(Number(order.total) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${statusBadge(order.status)}`}>
                        {(order.status || 'unknown').toString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/order/${order.id}`}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Eye size={16} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
