'use client'
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Breadcrumbs from '../../../shared/components/breadcrumbs';
import SearchBar from '../../../shared/components/search-bar';
import Table from '../../../shared/components/table';
import Pagination from '../../../shared/components/pagination';
import StatusBadge from '../../../shared/components/status-badge';
import axiosInstance from '../../../utils/axiosInstance';
import Image from 'next/image';

interface Product {
  id: string;
  title: string;
  images?: { url: string }[];
  category: string;
  sale_price: number;
  stock: number;
  status: string;
}

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, limit],
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/admin/api/get-all-products?page=${page}&limit=${limit}`
      );
      return {
        products: response.data.products || [],
        totalProducts: response.data.totalProducts || 0,
      };
    },
  });

  const filteredProducts = (data?.products || []).filter((product: Product) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.title.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil((data?.totalProducts || 0) / limit);

  const columns = [
    {
      key: 'image',
      header: 'Image',
      render: (product: Product) => (
        <div className="w-12 h-12 relative">
          {product.images && product.images[0] ? (
            <Image
              src={product.images[0].url}
              alt={product.title}
              fill
              className="object-cover rounded"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
              <span className="text-xs text-gray-500">No Image</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Name',
      render: (product: Product) => (
        <span className="font-medium text-gray-900">{product.title}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (product: Product) => product.category,
    },
    {
      key: 'sale_price',
      header: 'Price',
      render: (product: Product) => `$${product.sale_price?.toFixed(2) || '0.00'}`,
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (product: Product) => (
        <span className={product.stock > 0 ? 'text-gray-900' : 'text-red-600'}>
          {product.stock || 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (product: Product) => <StatusBadge status={product.status || 'inactive'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product: Product) => (
        <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'All Products' },
          ]}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <SearchBar
            placeholder="Search products..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-md"
          />
        </div>

        <Table
          columns={columns}
          data={filteredProducts}
          isLoading={isLoading}
          emptyMessage="No products found"
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
