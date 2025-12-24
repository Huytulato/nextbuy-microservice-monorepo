'use client'
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Breadcrumbs from '../../../shared/components/breadcrumbs';
import SearchBar from '../../../shared/components/search-bar';
import Table from '../../../shared/components/table';
import Pagination from '../../../shared/components/pagination';
import StatusBadge from '../../../shared/components/status-badge';
import axiosInstance from '../../../utils/axiosInstance';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  shop?: { name: string };
  user?: { name: string };
  adminFee?: number;
  sellerEarnings?: number;
  paymentStatus?: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, limit],
    queryFn: async () => {
      const response = await axiosInstance.get('/order/api/admin-orders');
      return response.data.orders || [];
    },
  });

  const filteredOrders = (data || []).filter((order: Order) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.shop?.name?.toLowerCase().includes(searchLower) ||
      order.user?.name?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil((filteredOrders.length || 0) / limit);
  const paginatedOrders = filteredOrders.slice((page - 1) * limit, page * limit);

  const columns = [
    {
      key: 'id',
      header: 'Order ID',
      render: (order: Order) => (
        <span className="font-mono text-blue-600">#{order.id.slice(-6)}</span>
      ),
    },
    {
      key: 'shop',
      header: 'Shop',
      render: (order: Order) => order.shop?.name || 'N/A',
    },
    {
      key: 'buyer',
      header: 'Buyer',
      render: (order: Order) => order.user?.name || 'N/A',
    },
    {
      key: 'adminFee',
      header: 'Admin Fee (10%)',
      render: (order: Order) => (
        <span className="text-green-600 font-medium">
          ${order.adminFee?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      key: 'sellerEarnings',
      header: 'Seller Earnings',
      render: (order: Order) => `$${order.sellerEarnings?.toFixed(2) || '0.00'}`,
    },
    {
      key: 'paymentStatus',
      header: 'Payment Status',
      render: (order: Order) => (
        <StatusBadge status={order.paymentStatus || 'pending'} />
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (order: Order) =>
        format(new Date(order.createdAt), 'dd/MM/yyyy'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (order: Order) => (
        <Link href={`/order/${order.id}`}>
          <button className="text-blue-600 hover:text-blue-800">
            <Eye size={18} />
          </button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Orders</h1>
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'All Orders' },
          ]}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <SearchBar
            placeholder="Search orders..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-md"
          />
        </div>

        <Table
          columns={columns}
          data={paginatedOrders}
          isLoading={isLoading}
          emptyMessage="No orders found"
        />

        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
