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
  return res?.data?.orders || [];
};

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
          <span className="text-slate-100 font-medium">#{String(row.original.id).slice(-6).toUpperCase()}</span>
        ),
      },
      {
        id: 'buyer',
        header: 'Buyer',
        cell: ({ row }: any) => (
          <div className="flex flex-col">
            <span className="text-slate-100">{row.original.user?.name || '—'}</span>
            <span className="text-xs text-slate-400">{row.original.user?.email || ''}</span>
          </div>
        ),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }: any) => (
          <span className="text-slate-100">${Number(row.original.total || 0).toFixed(2)}</span>
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
              className="p-2 rounded-md hover:bg-white/5 transition-colors"
              title="View order"
            >
              <Eye size={16} className="text-blue-300" />
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
    <div className="w-full min-h-screen -m-6 p-8 bg-gradient-to-b from-[#070d1f] to-[#040713] text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-2xl font-semibold">All Orders</h2>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center mb-6 text-sm">
        <Link href="/dashboard" className="text-slate-400 hover:text-blue-300 transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={16} className="text-slate-600 mx-1" />
        <span className="text-slate-300">All Orders</span>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center bg-white/5 border border-white/10 p-3 rounded-lg">
        <Search size={18} className="text-slate-400 mr-3" />
        <input
          type="text"
          placeholder="Search orders..."
          className="w-full bg-transparent text-white placeholder-slate-500 outline-none"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider"
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-white/10">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
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


