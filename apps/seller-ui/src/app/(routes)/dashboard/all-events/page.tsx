'use client'
import React, { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table'
import { Search, Calendar, Package, Eye, Edit, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Badge } from 'packages/components/ui/badge'

const fetchEvents = async () => {
  const res = await axiosInstance.get('/product/api/get-shop-events');
  return res?.data?.events || [];
}

const EventList = () => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["shop-events"],
    queryFn: fetchEvents,
    staleTime: 1000 * 60 * 5,
  });

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (globalFilter) {
      const lowerFilter = globalFilter.toLowerCase();
      filtered = filtered.filter((e: any) =>
        e.title?.toLowerCase().includes(lowerFilter) ||
        e.category?.toLowerCase().includes(lowerFilter)
      );
    }

    return filtered;
  }, [events, globalFilter]);

  const getEventStatus = (event: any) => {
    const now = new Date();
    const startDate = new Date(event.starting_date);
    const endDate = new Date(event.ending_date);

    if (now < startDate) return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    if (now > endDate) return { status: 'ended', label: 'Ended', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-700 border-green-200' };
  };

  const columns = useMemo(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }: any) => {
          const hasVariations = row.original.variations && row.original.variations.length > 0;
          return hasVariations ? (
            <button
              onClick={() => toggleRowExpanded(row.original.id)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              {expandedRows[row.original.id] ? '▼' : '▶'}
            </button>
          ) : null;
        },
      },
      {
        accessorKey: 'images',
        header: 'Event Product',
        cell: ({ row }: any) => {
          const imageUrl = row.original.images?.[0]?.url;
          return (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 relative">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={row.original.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900 line-clamp-1 max-w-[200px]" title={row.original.title}>
                  {row.original.title}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{row.original.category}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'starting_date',
        header: 'Start Date',
        cell: ({ row }: any) => (
          <div className="text-sm text-gray-600">
            {new Date(row.original.starting_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        ),
      },
      {
        accessorKey: 'ending_date',
        header: 'End Date',
        cell: ({ row }: any) => (
          <div className="text-sm text-gray-600">
            {new Date(row.original.ending_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        ),
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }: any) => {
          const p = row.original;
          const hasVariations = p.variations?.length > 0;
          
          if (hasVariations) {
            const prices = p.variations.map((v: any) => v.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            return (
              <span className="text-sm font-medium text-gray-900">
                ${minPrice === maxPrice ? minPrice : `${minPrice} - $${maxPrice}`}
              </span>
            );
          }
          
          return (
            <span className="text-sm font-medium text-gray-900">
              ${p.sale_price || p.regular_price}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: any) => {
          const eventStatus = getEventStatus(row.original);
          return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${eventStatus.color}`}>
              {eventStatus.label}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: any) => {
          const event = row.original;
          return (
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/create-event?productId=${event.id}`}>
                <button
                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Edit Event"
                >
                  <Edit size={16} />
                </button>
              </Link>
              <Link href={`/dashboard/create-product?edit=${event.id}`}>
                <button
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Edit Product"
                >
                  <Package size={16} />
                </button>
              </Link>
            </div>
          );
        },
      },
    ],
    [expandedRows]
  );

  const table = useReactTable({
    data: filteredEvents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your promotional events</p>
        </div>
        <Link href="/dashboard/create-event">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium">
            <Plus size={18} />
            Create Event
          </button>
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 flex items-center gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search events by name or category..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No events found</h3>
            <p className="text-gray-500 mb-4">Create your first event to promote products with special dates.</p>
            <Link href="/dashboard/create-event">
              <button className="text-indigo-600 font-medium hover:underline">
                Create new event
              </button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-gray-50/50 border-b border-gray-200">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100">
                {table.getRowModel().rows.map(row => (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {/* Expanded Row for Variations */}
                    {expandedRows[(row.original as any).id] && (row.original as any).variations && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={columns.length} className="px-6 py-4">
                          <div className="ml-12 border rounded-lg overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                  <th className="px-4 py-2 text-left">Variation</th>
                                  <th className="px-4 py-2 text-left">SKU</th>
                                  <th className="px-4 py-2 text-left">Price</th>
                                  <th className="px-4 py-2 text-left">Stock</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {(row.original as any).variations.map((v: any) => (
                                  <tr key={v.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">
                                      <div className="flex gap-1 flex-wrap items-center">
                                        {v.attributes && typeof v.attributes === 'object' && Object.keys(v.attributes).length > 0 ? (
                                          Object.entries(v.attributes).map(([key, val]: any) => (
                                            <span key={key} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                                              {key}: {val}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-xs text-gray-500">Default</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{v.sku}</td>
                                    <td className="px-4 py-2">${v.price}</td>
                                    <td className="px-4 py-2">{v.stock}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default EventList

