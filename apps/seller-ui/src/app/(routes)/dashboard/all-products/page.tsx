'use client'
import React, { useMemo, useState } from 'react'
import {useReactTable, getCoreRowModel, getFilteredRowModel, flexRender} from '@tanstack/react-table'
import { Search, Pencil, Star, Plus, ChevronRight, Eye, Trash2, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query' 
import DeleteConfirmationModal from 'apps/seller-ui/src/shared/components/modals/delete.confirmation.modal'



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

const ProductList = () => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>();

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

  const columns = useMemo(
      () => [
        {
          accessorKey: 'images',
          header: 'Image',
          cell: ({ row }: any) => {
            const imageUrl = row.original.images?.[0]?.url;
            return (
              <div className="w-12 h-12 rounded-md overflow-hidden bg-white-700 flex items-center justify-center">
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
                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
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
            <span className="text-white font-medium">
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
              <span className={`${stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stockText}
              </span>
            );
          },
        },
        {
          accessorKey: "category",
          header: "Category",
          cell: ({ row }: any) => (
            <span className="text-gray-300 capitalize">
              {row.original.category || 'N/A'}
            </span>
          ),
        },
        {
          accessorKey: "ratings",
          header: "Rating",
          cell: ({ row }: any) => {
            const rating = row.original.ratings || 0;
            return (
              <div className="flex items-center gap-1">
                <Star fill="#fbbf24" size={16} className="text-yellow-400" />
                <span className="text-white font-medium">{rating.toFixed(1)}</span>
              </div>
            );
          },
        },
        {
          id: "actions",
          header: "Actions",
          cell: ({ row }: any) => (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.open(`${process.env.NEXT_PUBLIC_USER_UI_LINK || ''}/product/${row.original.slug}`, '_blank');
                }}
                className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
                title="View Product"
              >
                <Eye size={16} className="text-blue-400" />
              </button>
              <Link
                href={`/dashboard/create-product?edit=${row.original.id}`}
                className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
                title="Edit Product"
              >
                <Pencil size={16} className="text-yellow-400" />
              </Link>
              <button
                onClick={() => {
                  setAnalyticsData(row.original);
                  setShowAnalytics(true);
                }}
                className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
                title="View Analytics"
              >
                <BarChart3 size={16} className="text-green-400" />
              </button>
              <button
                onClick={() => openDeleteModal(row.original)}
                className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
                title="Delete Product"
              >
                <Trash2 size={16} className="text-red-400" />
              </button>
            </div>
          ),
        },
      ], []
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
        <h2 className="text-2xl text-white font-semibold">All Products</h2>
        <Link
        href="/dashboard/create-product"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
        <Plus size={18} /> Add Product
        </Link>
      </div>
      {/* Breadcrumbs */}
      <div className="flex items-center mb-6 text-sm">
        <Link href={"/dashboard"} className="text-gray-400 hover:text-blue-400 transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={16} className="text-gray-500 mx-1" />
        <span className="text-gray-300">All Products</span>
      </div>
      {/* Search Bar */}
      <div className="mb-6 flex items-center bg-gray-800 border border-gray-700 p-3 rounded-lg">
        <Search size={18} className="text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Search products..."
          className="w-full bg-transparent text-white placeholder-gray-500 outline-none"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      {/* Products Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="mb-4">No products found</p>
            <Link
              href="/dashboard/create-product"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              <Plus size={18} />
              Create your first product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white-900 border-b border-gray-700">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
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
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-700/50 transition-colors"
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
    </div>
  )
}

export default ProductList