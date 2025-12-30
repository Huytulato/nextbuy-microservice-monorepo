'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Package, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const fetchProducts = async () => {
  const res = await axiosInstance.get('/product/api/get-shop-products');
  return res?.data?.data?.products || [];
}

const fetchProduct = async (productId: string) => {
  const res = await axiosInstance.get(`/product/api/get-shop-products`);
  const products = res?.data?.data?.products || [];
  return products.find((p: any) => p.id === productId);
}

const updateEventDates = async ({ productId, starting_date, ending_date }: any) => {
  const res = await axiosInstance.put(`/product/api/update-event-dates/${productId}`, {
    starting_date,
    ending_date
  });
  return res?.data;
}

const CreateEventPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const queryClient = useQueryClient();

  const [selectedProductId, setSelectedProductId] = useState<string>(productId || '');
  const [startingDate, setStartingDate] = useState('');
  const [endingDate, setEndingDate] = useState('');

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["shop-products"],
    queryFn: fetchProducts,
  });

  // Fetch selected product details if editing
  const { data: selectedProduct, isLoading: productLoading } = useQuery({
    queryKey: ["product", selectedProductId],
    queryFn: () => fetchProduct(selectedProductId),
    enabled: !!selectedProductId,
  });

  // Set dates when product is selected
  useEffect(() => {
    if (selectedProduct && selectedProduct.starting_date && selectedProduct.ending_date) {
      const startDate = new Date(selectedProduct.starting_date);
      const endDate = new Date(selectedProduct.ending_date);
      setStartingDate(startDate.toISOString().split('T')[0]);
      setEndingDate(endDate.toISOString().split('T')[0]);
    }
  }, [selectedProduct]);

  const updateMutation = useMutation({
    mutationFn: updateEventDates,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shop-events"] });
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success(data?.message || 'Event dates updated successfully!');
      router.push('/dashboard/all-events');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update event dates');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      toast.error('Please select a product');
      return;
    }

    if (!startingDate || !endingDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    const startDate = new Date(startingDate);
    const endDate = new Date(endingDate);

    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }

    updateMutation.mutate({
      productId: selectedProductId,
      starting_date: startDate.toISOString(),
      ending_date: endDate.toISOString(),
    });
  };

  const selectedProductData = products.find((p: any) => p.id === selectedProductId);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/all-events" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back to Events
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {productId ? 'Edit Event' : 'Create Event'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {productId ? 'Update event dates for your product' : 'Select a product and set event dates'}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Product <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={!!productId}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
              required
            >
              <option value="">-- Select a product --</option>
              {products
                .filter((p: any) => !p.isDeleted)
                .map((product: any) => (
                  <option key={product.id} value={product.id}>
                    {product.title} {product.status === 'draft' ? '(Draft)' : ''}
                  </option>
                ))}
            </select>
            {selectedProductId && selectedProductData && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  {selectedProductData.images?.[0]?.url && (
                    <img
                      src={selectedProductData.images[0].url}
                      alt={selectedProductData.title}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{selectedProductData.title}</p>
                    <p className="text-sm text-gray-500">{selectedProductData.category}</p>
                    <p className="text-sm font-medium text-indigo-600 mt-1">
                      ${selectedProductData.sale_price || selectedProductData.regular_price}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={startingDate}
                onChange={(e) => setStartingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">When the event starts</p>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={endingDate}
                onChange={(e) => setEndingDate(e.target.value)}
                min={startingDate || new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">When the event ends</p>
          </div>

          {/* Info Box */}
          {startingDate && endingDate && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Event Duration:</strong> {new Date(startingDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} - {new Date(endingDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/dashboard/all-events"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending || !selectedProductId || !startingDate || !endingDate}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Save size={18} />
              {updateMutation.isPending ? 'Saving...' : productId ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">About Events</h3>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Events are products with special start and end dates</li>
          <li>Events help promote products during specific time periods</li>
          <li>You can update event dates anytime</li>
          <li>Products without event dates won't appear in events list</li>
        </ul>
      </div>
    </div>
  )
}

export default CreateEventPage

