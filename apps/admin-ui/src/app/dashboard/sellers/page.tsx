'use client'
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Breadcrumbs from '../../../shared/components/breadcrumbs';
import SearchBar from '../../../shared/components/search-bar';
import Table from '../../../shared/components/table';
import Pagination from '../../../shared/components/pagination';
import axiosInstance from '../../../utils/axiosInstance';
import { format } from 'date-fns';
import { Download, User } from 'lucide-react';
import Link from 'next/link';

interface Seller {
  id: string;
  name: string;
  email: string;
  shops?: { name: string }[];
  address?: string;
  createdAt: string;
}

export default function SellersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sellers', page],
    queryFn: async () => {
      const response = await axiosInstance.get('/admin/api/get-all-sellers');
      return response.data.sellers || [];
    },
  });

  const filteredSellers = (data || []).filter((seller: Seller) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      seller.name.toLowerCase().includes(searchLower) ||
      seller.email.toLowerCase().includes(searchLower) ||
      seller.shops?.[0]?.name?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil((filteredSellers.length || 0) / limit);
  const paginatedSellers = filteredSellers.slice((page - 1) * limit, page * limit);

  const handleExportCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Shop Name', 'Address', 'Joined'].join(','),
      ...filteredSellers.map((seller: Seller) =>
        [
          seller.name,
          seller.email,
          seller.shops?.[0]?.name || 'N/A',
          seller.address || 'N/A',
          format(new Date(seller.createdAt), 'MM/dd/yyyy'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sellers.csv';
    a.click();
  };

  const columns = [
    {
      key: 'avatar',
      header: 'Avatar',
      render: (seller: Seller) => (
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
          <User className="text-purple-600" size={20} />
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (seller: Seller) => <span className="font-medium text-gray-900">{seller.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (seller: Seller) => seller.email,
    },
    {
      key: 'shopName',
      header: 'Shop Name',
      render: (seller: Seller) => (
        <Link
          href={`/dashboard/shops/${seller.shops?.[0]?.name || ''}`}
          className="text-blue-600 hover:underline"
        >
          {seller.shops?.[0]?.name || 'N/A'}
        </Link>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (seller: Seller) => seller.address || 'N/A',
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (seller: Seller) => format(new Date(seller.createdAt), 'MM/dd/yyyy'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Sellers</h1>
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'All Sellers' },
            ]}
          />
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <SearchBar
            placeholder="Search sellers..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-md"
          />
        </div>

        <Table
          columns={columns}
          data={paginatedSellers}
          isLoading={isLoading}
          emptyMessage="No sellers found"
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
