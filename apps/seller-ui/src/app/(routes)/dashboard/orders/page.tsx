'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronRight, Eye, Search } from 'lucide-react';
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance';

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
  return res?.data?.data?.orders || [];
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

export default function OrdersPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: fetchSellerOrders,
    staleTime: 1000 * 60,
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Order ID',
        cell: ({ row }: any) => (
          <span className="text-gray-900 font-medium">#{String(row.original.id).slice(-6).toUpperCase()}</span>
        ),
      },
      {
        id: 'buyer',
        header: 'Buyer',
        cell: ({ row }: any) => (
          <div className="flex flex-col">
            <span className="text-gray-900">{row.original.user?.name || '—'}</span>
            <span className="text-xs text-gray-600">{row.original.user?.email || ''}</span>
          </div>
        ),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }: any) => (
          <span className="text-gray-900">${Number(row.original.total || 0).toFixed(2)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: any) => (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${statusBadge(row.original.status)}`}>
            {(row.original.status || 'unknown').toString()}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }: any) => (
          <span className="text-slate-300">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/order/${row.original.id}`}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title="View order"
            >
              <Eye size={16} className="text-blue-600" />
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="w-full min-h-screen -m-6 p-8 bg-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-2xl font-semibold text-gray-900">All Orders</h2>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center mb-6 text-sm">
        <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={16} className="text-gray-400 mx-1" />
        <span className="text-gray-700">All Orders</span>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center bg-white border border-gray-300 p-3 rounded-lg shadow-sm">
        <Search size={18} className="text-gray-500 mr-3" />
        <input
          type="text"
          placeholder="Search orders..."
          className="w-full bg-transparent text-gray-900 placeholder-gray-400 outline-none"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-gray-600">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-gray-600">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


