'use client'
import React, { useMemo, useState } from 'react'
import {useReactTable, getCoreRowModel, getFilteredRowModel, flexRender} from '@tanstack/react-table'
import { Search, Pencil, Star, Plus, ChevronRight, Image } from 'lucide-react'
import Link from 'next/link'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query' 
import { access } from 'fs'
import { headers } from 'next/headers'
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
          cell: ({ row }: any) => (
            <Image 
              src={row.original.images[0]?.url} 
              alt={row.original.images[0]?.url}
              width={200}
              height={200}
              className="w-12 h-12 object-cover rounded-md"
            />
          ),
        },
        {
            accessorKey: "name",
            header: "Product Name",
            cell: ({ row }: any) => {
                const truncatedTitle =
                    row.original.title.length > 25
                        ? `${row.original.title.substring(0, 25)}...`
                        : row.original.title;

                return (
                    <Link
                        href={`${process.env.NEXT_PUBLIC_USER_UI_LINK}/product/${row.original.slug}`}
                        className="text-blue-400 hover:underline"
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
          cell: ({ row }: any) => <span>${row.original.sale_price}</span>,
        },
        {
          accessorKey: "category",
          header: "Category",
        },
        {
          accessorKey: "rating",
          header: "Rating",
          cell: ({ row }: any) => (
          <div className="flex items-center gap-1 text-yellow-400">
          <Star fill="#fde047" size={18} />{" "}
          <span className="text-white">{row.original.ratings || 5}</span>
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
      <div className="flex items-center mb-4">
        <Link href={"/dashboard"} className="text-blue-400 cursor-pointer">
          Dashboard
        </Link>
        <ChevronRight size={20} className="text-gray-200" />
        <span className="text-black">All Products</span>
      </div>
      {/* Search Bar */}
      <div className="mb-4 flex items-center bg-white p-2 rounded-md flex-1">
        <Search size={18} className="text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search products..."
          className="w-full bg-transparent text-black outline-none"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      {/* Products Table */}
      {showDeleteModal && (
          <DeleteConfirmationModal 
            product={selectedProduct}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={() => deleteMutation.mutate(selectedProduct?.id)}
            onRestore={() => restoreMutation.mutate(selectedProduct?.id)}
          />
      )}    
    </div>
  )
}

export default ProductList