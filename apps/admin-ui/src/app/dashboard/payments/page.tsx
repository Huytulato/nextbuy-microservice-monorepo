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

interface Payment {
  id: string;
  orderId: string;
  amount: number;
  paymentStatus: string;
  createdAt: string;
  user?: { name: string; email: string };
}

export default function PaymentsPage() {
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

  const filteredPayments = (data || []).filter((payment: Payment) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.id.toLowerCase().includes(searchLower) ||
      payment.orderId?.toLowerCase().includes(searchLower) ||
      payment.user?.name?.toLowerCase().includes(searchLower) ||
      payment.user?.email?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil((filteredPayments.length || 0) / limit);
  const paginatedPayments = filteredPayments.slice((page - 1) * limit, page * limit);

  const columns = [
    {
      key: 'id',
      header: 'Payment ID',
      render: (payment: Payment) => (
        <span className="font-mono text-blue-600">#{payment.id.slice(-6)}</span>
      ),
    },
    {
      key: 'orderId',
      header: 'Order ID',
      render: (payment: Payment) => payment.orderId || 'N/A',
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (payment: Payment) => payment.user?.name || payment.user?.email || 'N/A',
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (payment: Payment) => (
        <span className="font-medium">${payment.amount?.toFixed(2) || '0.00'}</span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment Status',
      render: (payment: Payment) => (
        <StatusBadge status={payment.paymentStatus || 'pending'} />
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (payment: Payment) =>
        format(new Date(payment.createdAt), 'dd/MM/yyyy'),
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
          data={paginatedPayments}
          isLoading={isLoading}
          emptyMessage="No payments found"
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
