'use client'
import React, { useMemo, useState } from 'react'
import {useReactTable, getCoreRowModel, getFilteredRowModel, flexRender} from '@tanstack/react-table'
import { Search, Pencil, Star, Plus, ChevronRight, Eye, Trash2, BarChart3, Send, History, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query' 
import DeleteConfirmationModal from 'apps/seller-ui/src/shared/components/modals/delete.confirmation.modal'
import toast from 'react-hot-toast'



const fetchProducts = async () => {
  const res = await axiosInstance.get('/product/api/get-shop-products');
  return res?.data?.products;
}

const deleteProduct = async (productId: string) => {
  const res = await axiosInstance.delete(`/product/api/delete-product/${productId}`);
  return res?.data;
}

const restoreProduct = async (productId: string) => {
  const res = await axiosInstance.put(`/product/api/restore-deleted-product/${productId}`);
  return res?.data;
}

const submitDraftProduct = async (productId: string) => {
  const res = await axiosInstance.post(`/product/api/submit-draft/${productId}`);
  return res?.data;
}

const fetchProductHistory = async (productId: string) => {
  const res = await axiosInstance.get(`/product/api/product-history/${productId}`);
  return res?.data;
}

const ProductList = () => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<string | null>(null);

  // Note: analytics UI is not implemented yet, but keep the state for future work.
  void analyticsData;
  void showAnalytics;
  const queryClient = useQueryClient();  
  const { data: products = [], isLoading} = useQuery({
      queryKey: ["shop-products"],
      queryFn: fetchProducts,
      staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      setShowDeleteModal(false);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      setShowDeleteModal(false);
    },
  });

  const submitDraftMutation = useMutation({
    mutationFn: submitDraftProduct,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success(data?.message || 'Draft submitted for review successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit draft');
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['product-history', selectedProductForHistory],
    queryFn: () => selectedProductForHistory ? fetchProductHistory(selectedProductForHistory) : null,
    enabled: !!selectedProductForHistory && showHistoryModal,
  });

  const columns = useMemo(
      () => [
        {
          accessorKey: 'images',
          header: 'Image',
          cell: ({ row }: any) => {
            const imageUrl = row.original.images?.[0]?.url;
            return (
              <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                {imageUrl ? (
                  <Image 
                    src={imageUrl} 
                    alt={row.original.title || 'Product image'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-500 text-xs">No Image</div>
                )}
              </div>
            );
          },
        },
        {
          accessorKey: "title",
          header: "Product Name",
          cell: ({ row }: any) => {
            const truncatedTitle =
              row.original.title && row.original.title.length > 30
                ? `${row.original.title.substring(0, 30)}...`
                : row.original.title || 'Untitled Product';

            return (
              <Link
                href={`${process.env.NEXT_PUBLIC_USER_UI_LINK || ''}/product/${row.original.slug}`}
                target="_blank"
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                title={row.original.title}
              >
                {truncatedTitle}
              </Link>
            );            
          }
        },
        {
          accessorKey: "price",
          header: "Price",
          cell: ({ row }: any) => (
            <span className="text-gray-900 font-medium">
              ${parseFloat(row.original.sale_price || 0).toFixed(2)}
            </span>
          ),
        },
        {
          accessorKey: "stock",
          header: "Stock",
          cell: ({ row }: any) => {
            const stock = row.original.stock || 0;
            const stockText = stock > 0 ? `${stock} left` : 'Out of stock';
            return (
              <span className={`${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stockText}
              </span>
            );
          },
        },
        {
          accessorKey: "category",
          header: "Category",
          cell: ({ row }: any) => (
            <span className="text-gray-700 capitalize">
              {row.original.category || 'N/A'}
            </span>
          ),
        },
        {
          accessorKey: "status",
          header: "Status",
          cell: ({ row }: any) => {
            const status = row.original.status || 'pending';
            const statusConfig: Record<string, { label: string; className: string }> = {
              active: { label: 'Active', className: 'bg-green-100 text-green-800' },
              pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
              rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
              draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
            };
            const config = statusConfig[status] || statusConfig.pending;
            return (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
                {config.label}
              </span>
            );
          },
        },
        {
          accessorKey: "ratings",
          header: "Rating",
          cell: ({ row }: any) => {
            const rating = row.original.ratings || 0;
            return (
              <div className="flex items-center gap-1">
                <Star fill="#fbbf24" size={16} className="text-yellow-400" />
                <span className="text-gray-900 font-medium">{rating.toFixed(1)}</span>
              </div>
            );
          },
        },
        {
          id: "actions",
          header: "Actions",
          cell: ({ row }: any) => {
            const status = row.original.status || 'pending';
            const rejectionReason = row.original.rejectionReason;
            return (
              <div className="flex items-center gap-2">
                {/* Submit Draft Button - Only show for draft products */}
                {status === 'draft' && (
                  <button
                    onClick={() => submitDraftMutation.mutate(row.original.id)}
                    className="p-1.5 rounded-md hover:bg-green-50 transition-colors"
                    title="Submit for Review"
                    disabled={submitDraftMutation.isPending}
                  >
                    <Send size={16} className="text-green-500" />
                  </button>
                )}
                <button
                  onClick={() => {
                    window.open(`${process.env.NEXT_PUBLIC_USER_UI_LINK || ''}/product/${row.original.slug}`, '_blank');
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="View Product"
                  disabled={status !== 'active'}
                >
                  <Eye size={16} className={status === 'active' ? "text-blue-400" : "text-gray-300"} />
                </button>
                <Link
                  href={`/dashboard/create-product?edit=${row.original.id}`}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="Edit Product"
                >
                  <Pencil size={16} className="text-yellow-400" />
                </Link>
                <button
                  onClick={() => {
                    setAnalyticsData(row.original);
                    setShowAnalytics(true);
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="View Analytics"
                >
                  <BarChart3 size={16} className="text-green-400" />
                </button>
                <button
                  onClick={() => {
                    setSelectedProductForHistory(row.original.id);
                    setShowHistoryModal(true);
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="View History"
                >
                  <History size={16} className="text-purple-400" />
                </button>
                <button
                  onClick={() => openDeleteModal(row.original)}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="Delete Product"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
                {status === 'rejected' && rejectionReason && (
                  <div className="ml-2" title={rejectionReason}>
                    <span className="text-xs text-red-600 cursor-help" title={rejectionReason}>
                      Rejected
                    </span>
                  </div>
                )}
              </div>
            );
          },
        },
      ], [submitDraftMutation]
  );

    const table = useReactTable({
      data: products,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      globalFilterFn: "includesString",
      state: { globalFilter },
      onGlobalFilterChange: setGlobalFilter,
    });

    const openDeleteModal = (product: any) => {
      setSelectedProduct(product);
      setShowDeleteModal(true);
    }
  return (
    <div className='w-full min-h-screen p-8'>
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-2xl text-gray-900 font-semibold">All Products</h2>
        <Link
        href="/dashboard/create-product"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
        <Plus size={18} /> Add Product
        </Link>
      </div>
      {/* Breadcrumbs */}
      <div className="flex items-center mb-6 text-sm">
        <Link href={"/dashboard"} className="text-gray-600 hover:text-blue-600 transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={16} className="text-gray-400 mx-1" />
        <span className="text-gray-700">All Products</span>
      </div>
      {/* Search Bar */}
      <div className="mb-6 flex items-center bg-white border border-gray-300 p-3 rounded-lg shadow-sm">
        <Search size={18} className="text-gray-500 mr-3" />
        <input
          type="text"
          placeholder="Search products..."
          className="w-full bg-transparent text-gray-900 placeholder-gray-400 outline-none"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p className="mb-4">No products found</p>
            <Link
              href="/dashboard/create-product"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Plus size={18} />
              Create your first product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal 
          product={selectedProduct}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => {
            if (selectedProduct?.isDeleted) {
              restoreMutation.mutate(selectedProduct?.id);
            } else {
              deleteMutation.mutate(selectedProduct?.id);
            }
          }}
          onRestore={() => restoreMutation.mutate(selectedProduct?.id)}
        />
      )}

      {/* Product History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History size={24} />
                  Product History
                </h2>
                {historyData?.product && (
                  <p className="text-sm mt-1 opacity-90">{historyData.product.title}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedProductForHistory(null);
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              {historyLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : historyData?.history && historyData.history.length > 0 ? (
                <div className="space-y-4">
                  {historyData.history.map((entry: any, index: number) => (
                    <div
                      key={entry.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {entry.changeType === 'auto_moderation' && '🤖 Auto-Moderation'}
                              {entry.changeType === 'moderation_approve' && '✅ Approved'}
                              {entry.changeType === 'moderation_reject' && '❌ Rejected'}
                              {entry.changeType === 'edit' && '✏️ Edited'}
                              {entry.changeType === 'edit_requires_review' && '🔄 Edited (Requires Review)'}
                            </span>
                            {entry.changes?.status && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                entry.changes.status === 'active' ? 'bg-green-100 text-green-800' :
                                entry.changes.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                entry.changes.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.changes.status}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            By: <span className="font-medium">{entry.changedByName}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Reason */}
                      {entry.reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <span className="font-medium text-red-800">Reason: </span>
                          <span className="text-red-700">{entry.reason}</span>
                        </div>
                      )}

                      {/* Changes Detail */}
                      {entry.changes && Object.keys(entry.changes).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-purple-600 cursor-pointer hover:text-purple-800">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.changes, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <History size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No history available for this product</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}    
    </div>
  )
}

export default ProductList