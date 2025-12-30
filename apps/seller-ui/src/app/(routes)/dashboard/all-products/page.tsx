'use client'
import React, { useMemo, useState } from 'react'
import {useReactTable, getCoreRowModel, getFilteredRowModel, flexRender} from '@tanstack/react-table'
import { Search, Pencil, Plus, Trash2, Send, History, X, ChevronDown, ChevronUp, AlertCircle, Package, Check, Edit2, EyeOff, Eye, DollarSign } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query' 
import DeleteConfirmationModal from 'apps/seller-ui/src/shared/components/modals/delete.confirmation.modal'
import toast from 'react-hot-toast'
import { Badge } from 'packages/components/ui/badge'

const fetchProducts = async () => {
  const res = await axiosInstance.get('/product/api/get-shop-products');
  return res?.data?.data?.products;
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

const updateVariationStock = async ({ productId, variationId, stock }: any) => {
  const res = await axiosInstance.put(`/product/api/update-variation-stock/${productId}/${variationId}`, { stock });
  return res?.data;
}

const updateVariationPrice = async ({ productId, variationId, price }: any) => {
  const res = await axiosInstance.put(`/product/api/update-variation-price/${productId}/${variationId}`, { price });
  return res?.data;
}

const updateProductStock = async ({ productId, stock }: any) => {
  const res = await axiosInstance.put(`/product/api/update-product-stock/${productId}`, { stock });
  return res?.data;
}

const updateProductPrice = async ({ productId, price }: any) => {
  const res = await axiosInstance.put(`/product/api/update-product-price/${productId}`, { price });
  return res?.data;
}

const bulkHideProducts = async (productIds: string[]) => {
  const res = await axiosInstance.post('/product/api/bulk-hide', { productIds });
  return res?.data;
}

const bulkDeleteProducts = async (productIds: string[]) => {
  const res = await axiosInstance.post('/product/api/bulk-delete', { productIds });
  return res?.data;
}

const fetchProductHistory = async (productId: string) => {
  const res = await axiosInstance.get(`/product/api/product-history/${productId}`);
  return res?.data;
}

const toggleHideProduct = async (productId: string) => {
  const res = await axiosInstance.put(`/product/api/toggle-hide-product/${productId}`);
  return res?.data;
}

const ProductList = () => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'out_of_stock' | 'draft' | 'deleted'>('all');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ productId: string, variationId?: string, field: 'price' | 'stock' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPriceValue, setBulkPriceValue] = useState('');
  const [bulkPriceType, setBulkPriceType] = useState<'set' | 'increase' | 'decrease'>('set');

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

  const updateVariationStockMutation = useMutation({
    mutationFn: updateVariationStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success('Stock updated successfully!');
      setEditingCell(null);
    },
    onError: () => toast.error('Failed to update stock'),
  });

  const updateVariationPriceMutation = useMutation({
    mutationFn: updateVariationPrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success('Price updated successfully!');
      setEditingCell(null);
    },
    onError: () => toast.error('Failed to update price'),
  });

  const updateProductStockMutation = useMutation({
    mutationFn: updateProductStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success('Stock updated successfully!');
      setEditingCell(null);
    },
    onError: () => toast.error('Failed to update stock'),
  });

  const updateProductPriceMutation = useMutation({
    mutationFn: updateProductPrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success('Price updated successfully!');
      setEditingCell(null);
    },
    onError: () => toast.error('Failed to update price'),
  });

  const bulkHideMutation = useMutation({
    mutationFn: bulkHideProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success('Products hidden successfully!');
      setSelectedProducts(new Set());
    },
    onError: () => toast.error('Failed to hide products'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success('Products deleted successfully!');
      setSelectedProducts(new Set());
    },
    onError: () => toast.error('Failed to delete products'),
  });

  const toggleHideMutation = useMutation({
    mutationFn: toggleHideProduct,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success(data?.message || 'Product visibility updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to toggle product visibility');
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['product-history', selectedProductForHistory],
    queryFn: () => selectedProductForHistory ? fetchProductHistory(selectedProductForHistory) : null,
    enabled: !!selectedProductForHistory && showHistoryModal,
  });

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p: any) => p.id)));
    }
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) {
      toast.error('Please enter a valid number');
      return;
    }

    if (editingCell.variationId) {
      // Update variation
      if (editingCell.field === 'stock') {
        updateVariationStockMutation.mutate({
          productId: editingCell.productId,
          variationId: editingCell.variationId,
          stock: Math.floor(value),
        });
      } else {
        updateVariationPriceMutation.mutate({
          productId: editingCell.productId,
          variationId: editingCell.variationId,
          price: value,
        });
      }
    } else {
      // Update product
      if (editingCell.field === 'stock') {
        updateProductStockMutation.mutate({
          productId: editingCell.productId,
          stock: Math.floor(value),
        });
      } else {
        updateProductPriceMutation.mutate({
          productId: editingCell.productId,
          price: value,
        });
      }
    }
  };

  const handleBulkHide = () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select products to hide');
      return;
    }
    bulkHideMutation.mutate(Array.from(selectedProducts));
  };

  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select products to delete');
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedProducts.size} product(s)?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedProducts));
    }
  };

  const handleBulkPriceChange = () => {
    // This would need backend implementation
    toast.success('Bulk price change feature coming soon!');
    setShowBulkPriceModal(false);
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by Tab
    if (activeTab === 'active') {
      filtered = products.filter((p: any) => p.status === 'active' && !p.isDeleted && p.stock > 0);
    } else if (activeTab === 'out_of_stock') {
      filtered = products.filter((p: any) => p.stock === 0 && !p.isDeleted);
    } else if (activeTab === 'draft') {
      filtered = products.filter((p: any) => p.status === 'draft' && !p.isDeleted);
    } else if (activeTab === 'deleted') {
      filtered = products.filter((p: any) => p.isDeleted);
    } else {
      // All (excluding deleted unless specifically in deleted tab)
      filtered = products.filter((p: any) => !p.isDeleted);
    }

    // Filter by Search
    if (globalFilter) {
      const lowerFilter = globalFilter.toLowerCase();
      filtered = filtered.filter((p: any) => 
        p.title?.toLowerCase().includes(lowerFilter) || 
        p.category?.toLowerCase().includes(lowerFilter)
      );
    }

    return filtered;
  }, [products, activeTab, globalFilter]);

  const columns = useMemo(
      () => [
        {
          id: 'select',
          header: () => (
            <input
              type="checkbox"
              checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
              onChange={toggleAllSelection}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          ),
          cell: ({ row }: any) => (
            <input
              type="checkbox"
              checked={selectedProducts.has(row.original.id)}
              onChange={() => toggleProductSelection(row.original.id)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          ),
        },
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
                {expandedRows[row.original.id] ? (
                  <ChevronUp size={16} className="text-gray-500" />
                ) : (
                  <ChevronDown size={16} className="text-gray-500" />
                )}
              </button>
            ) : null;
          },
        },
        {
          accessorKey: 'images',
          header: 'Product',
          cell: ({ row }: any) => {
            const imageUrl = row.original.images?.[0]?.url;
            const isDraft = row.original.status === 'draft';
            const sku = row.original.sku || `SKU-${row.original.id.slice(0, 8).toUpperCase()}`;
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
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{sku}</div>
                  <div className="flex gap-2 mt-1">
                    {isDraft && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">Draft</Badge>}
                    {row.original.variations?.length > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-gray-500">
                        {row.original.variations.length} Variants
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          },
        },
        {
          accessorKey: 'category',
          header: 'Category',
          cell: ({ row }: any) => (
            <span className="text-sm text-gray-600">{row.original.category || '-'}</span>
          ),
        },
        {
          accessorKey: 'price',
          header: 'Price',
          cell: ({ row }: any) => {
            const p = row.original;
            const hasVariations = p.variations?.length > 0;
            const isEditing = editingCell?.productId === p.id && editingCell?.field === 'price' && !editingCell?.variationId;
            
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
            
            if (isEditing) {
              return (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingCell(null);
                    }}
                    className="w-20 px-2 py-1 text-sm border border-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingCell(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                    <X size={14} />
                  </button>
                </div>
              );
            }
            
            return (
              <div
                className="group flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setEditingCell({ productId: p.id, field: 'price' });
                  setEditValue(String(p.sale_price || p.regular_price || ''));
                }}
              >
                <span className="text-sm font-medium text-gray-900">
                  ${p.sale_price || p.regular_price}
                </span>
                <Edit2 size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          },
        },
        {
          accessorKey: 'stock',
          header: 'Stock',
          cell: ({ row }: any) => {
            const p = row.original;
            const stock = p.stock;
            const isLowStock = stock < 10;
            const isOutOfStock = stock === 0;
            const isEditing = editingCell?.productId === p.id && editingCell?.field === 'stock' && !editingCell?.variationId;
            
            if (isEditing) {
              return (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingCell(null);
                    }}
                    className="w-20 px-2 py-1 text-sm border border-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingCell(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                    <X size={14} />
                  </button>
                </div>
              );
            }
            
            return (
              <div
                className="group flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setEditingCell({ productId: p.id, field: 'stock' });
                  setEditValue(String(stock));
                }}
              >
                <span className={`text-sm font-medium ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-gray-700'}`}>
                  {stock}
                </span>
                {isOutOfStock && <AlertCircle size={14} className="text-red-500" />}
                <Edit2 size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          },
        },
        {
          accessorKey: 'sold_out',
          header: 'Sales',
          cell: ({ row }: any) => (
            <span className="text-sm text-gray-600">{row.original.sold_out || 0}</span>
          ),
        },
        {
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }: any) => {
            const product = row.original;
            let status = 'active';
            let label = 'Active';
            
            if (product.isDeleted) {
              status = 'deleted';
              label = 'Deleted';
            } else if (product.status === 'draft') {
              status = 'draft';
              label = 'Draft';
            } else if (product.status === 'pending') {
              status = 'pending';
              label = 'Pending';
            } else if (product.status === 'hidden') {
              status = 'hidden';
              label = 'Hidden';
            } else if (product.status === 'rejected') {
              status = 'rejected';
              label = 'Rejected';
            } else if (product.status === 'banned') {
              status = 'banned';
              label = 'Banned';
            }
            
            const styles: Record<string, string> = {
              active: 'bg-green-100 text-green-700 border-green-200',
              draft: 'bg-gray-100 text-gray-700 border-gray-200',
              pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
              hidden: 'bg-blue-100 text-blue-700 border-blue-200',
              rejected: 'bg-orange-100 text-orange-700 border-orange-200',
              banned: 'bg-red-100 text-red-700 border-red-200',
              deleted: 'bg-red-100 text-red-700 border-red-200',
            };
            
            return (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
                {label}
              </span>
            );
          },
        },
        {
          id: 'actions',
          header: 'Actions',
          cell: ({ row }: any) => {
            const product = row.original;
            const isDeleted = product.isDeleted;
            const isDraft = product.status === 'draft';
            const isHidden = product.status === 'hidden';

            return (
              <div className="flex items-center gap-2">
                {!isDeleted && (
                  <>
                    <Link href={`/dashboard/create-product?edit=${product.id}`}>
                      <button className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit">
                        <Pencil size={16} />
                      </button>
                    </Link>
                    
                    {isDraft && (
                      <button 
                        onClick={() => submitDraftMutation.mutate(product.id)}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Submit for Review"
                      >
                        <Send size={16} />
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        setSelectedProductForHistory(product.id);
                        setShowHistoryModal(true);
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="View History"
                    >
                      <History size={16} />
                    </button>

                    {/* Toggle Hide/Show Product */}
                    <button
                      onClick={() => toggleHideMutation.mutate(product.id)}
                      disabled={toggleHideMutation.isPending}
                      className="relative inline-flex items-center focus:outline-none"
                      title={isHidden ? 'Show Product' : 'Hide Product'}
                    >
                      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                        isHidden ? 'bg-gray-300' : 'bg-green-500'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          isHidden ? 'translate-x-1' : 'translate-x-5'
                        }`} />
                      </div>
                    </button>
                  </>
                )}

                {isDeleted ? (
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowDeleteModal(true);
                    }}
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    title="Restore"
                  >
                    <History size={16} className="rotate-180" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowDeleteModal(true);
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          },
        },
      ],
      [expandedRows, selectedProducts, filteredProducts, editingCell, editValue, toggleHideMutation]
  );

  const table = useReactTable({
    data: filteredProducts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your product catalog</p>
        </div>
        <Link href="/dashboard/create-product">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium">
            <Plus size={18} />
            Add Product
          </button>
        </Link>
      </div>

      {/* Filters & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="border-b border-gray-200 px-6 pt-4">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { id: 'all', label: 'All Products' },
              { id: 'active', label: 'Active' },
              { id: 'out_of_stock', label: 'Out of Stock' },
              { id: 'draft', label: 'Drafts' },
              { id: 'deleted', label: 'Trash' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'text-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 flex items-center gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, SKU or category..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedProducts.size > 0 && (
        <div className="bg-indigo-600 text-white rounded-xl shadow-lg border border-indigo-700 px-6 py-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium">{selectedProducts.size} product(s) selected</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkHide}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
            >
              <EyeOff size={16} />
              Hide Selected
            </button>
            <button
              onClick={() => setShowBulkPriceModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
            >
              <DollarSign size={16} />
              Change Price
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedProducts(new Set())}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filters or add a new product.</p>
            <Link href="/dashboard/create-product">
              <button className="text-indigo-600 font-medium hover:underline">
                Create new product
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
                                {(row.original as any).variations.map((v: any, idx: number) => {
                                  const isPriceEditing = editingCell?.productId === (row.original as any).id && 
                                                        editingCell?.variationId === v.id && 
                                                        editingCell?.field === 'price';
                                  const isStockEditing = editingCell?.productId === (row.original as any).id && 
                                                        editingCell?.variationId === v.id && 
                                                        editingCell?.field === 'stock';
                                  
                                  return (
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
                                      <td className="px-4 py-2">
                                        {isPriceEditing ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit();
                                                if (e.key === 'Escape') setEditingCell(null);
                                              }}
                                              className="w-20 px-2 py-1 text-sm border border-indigo-500 rounded focus:outline-none"
                                              autoFocus
                                            />
                                            <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                              <Check size={14} />
                                            </button>
                                            <button onClick={() => setEditingCell(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                              <X size={14} />
                                            </button>
                                          </div>
                                        ) : (
                                          <div
                                            className="group flex items-center gap-2 cursor-pointer"
                                            onClick={() => {
                                              setEditingCell({ productId: (row.original as any).id, variationId: v.id, field: 'price' });
                                              setEditValue(String(v.price));
                                            }}
                                          >
                                            <span>${v.price}</span>
                                            <Edit2 size={12} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        {isStockEditing ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit();
                                                if (e.key === 'Escape') setEditingCell(null);
                                              }}
                                              className="w-20 px-2 py-1 text-sm border border-indigo-500 rounded focus:outline-none"
                                              autoFocus
                                            />
                                            <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                              <Check size={14} />
                                            </button>
                                            <button onClick={() => setEditingCell(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                              <X size={14} />
                                            </button>
                                          </div>
                                        ) : (
                                          <div
                                            className="group flex items-center gap-2 cursor-pointer"
                                            onClick={() => {
                                              setEditingCell({ productId: (row.original as any).id, variationId: v.id, field: 'stock' });
                                              setEditValue(String(v.stock));
                                            }}
                                          >
                                            <span className={v.stock === 0 ? 'text-red-600 font-medium' : ''}>{v.stock}</span>
                                            <Edit2 size={12} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
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

      {/* Modals */}
      {showDeleteModal && selectedProduct && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => {
            if (selectedProduct.isDeleted) {
              restoreMutation.mutate(selectedProduct.id);
            } else {
              deleteMutation.mutate(selectedProduct.id);
            }
          }}
          title={selectedProduct.isDeleted ? "Restore Product" : "Delete Product"}
          message={selectedProduct.isDeleted 
            ? "Are you sure you want to restore this product? It will be visible in your shop again."
            : "Are you sure you want to move this product to trash? You can restore it later."}
          isRestoring={selectedProduct.isDeleted}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Product History</h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="text-center py-8">Loading history...</div>
              ) : historyData?.length > 0 ? (
                <div className="space-y-4">
                  {historyData.map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 text-sm border-b pb-4 last:border-0">
                      <div className="text-gray-500 w-32 flex-shrink-0">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.action}</p>
                        <p className="text-gray-600 mt-1">{item.description}</p>
                        <p className="text-xs text-gray-400 mt-1">by {item.user?.name || 'System'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No history available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Price Change Modal */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Bulk Price Change</h3>
              <button onClick={() => setShowBulkPriceModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
                <select
                  value={bulkPriceType}
                  onChange={(e) => setBulkPriceType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="set">Set Price</option>
                  <option value="increase">Increase by Amount</option>
                  <option value="decrease">Decrease by Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {bulkPriceType === 'set' ? 'New Price' : 'Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={bulkPriceValue}
                    onChange={(e) => setBulkPriceValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBulkPriceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkPriceChange}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductList