'use client'
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../utils/axiosInstance';
import { Clock, CheckCircle, XCircle, Eye, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

const fetchPendingProducts = async (page: number = 1, limit: number = 10) => {
  const res = await axiosInstance.get(`/admin/api/get-pending-products?page=${page}&limit=${limit}`);
  return res?.data;
};

const approveProduct = async (productId: string, adminNotes?: string) => {
  const res = await axiosInstance.post(`/admin/api/approve-product/${productId}`, {
    adminNotes,
  });
  return res?.data;
};

const rejectProduct = async (productId: string, rejectionReason: string, adminNotes?: string) => {
  const res = await axiosInstance.post(`/admin/api/reject-product/${productId}`, {
    rejectionReason,
    adminNotes,
  });
  return res?.data;
};

const PendingProductsPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pending-products', page],
    queryFn: () => fetchPendingProducts(page, 10),
  });

  const products = data?.products || [];
  const totalProducts = data?.totalProducts || 0;
  const totalPages = Math.ceil(totalProducts / 10);

  const approveMutation = useMutation({
    mutationFn: ({ productId, adminNotes }: { productId: string; adminNotes?: string }) =>
      approveProduct(productId, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-products'] });
      toast.success('Product approved successfully');
      setShowModal(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve product');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      productId,
      rejectionReason,
      adminNotes,
    }: {
      productId: string;
      rejectionReason: string;
      adminNotes?: string;
    }) => rejectProduct(productId, rejectionReason, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-products'] });
      toast.success('Product rejected');
      setShowModal(false);
      setSelectedProduct(null);
      setRejectionReason('');
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject product');
    },
  });

  const handleApprove = (product: any) => {
    setSelectedProduct(product);
    setActionType('approve');
    setShowModal(true);
  };

  const handleReject = (product: any) => {
    setSelectedProduct(product);
    setActionType('reject');
    setShowModal(true);
  };

  const handleSubmitAction = () => {
    if (!selectedProduct) return;

    if (actionType === 'approve') {
      approveMutation.mutate({
        productId: selectedProduct.id,
        adminNotes: adminNotes || undefined,
      });
    } else if (actionType === 'reject') {
      if (!rejectionReason.trim()) {
        toast.error('Please provide a rejection reason');
        return;
      }
      rejectMutation.mutate({
        productId: selectedProduct.id,
        rejectionReason,
        adminNotes: adminNotes || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className='w-full min-h-screen p-8 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen p-8'>
      <div className='mb-6'>
        <h2 className='text-2xl font-semibold text-gray-900 mb-2'>Pending Products</h2>
        <p className='text-gray-600'>Review and approve or reject products waiting for moderation</p>
      </div>

      {products.length === 0 ? (
        <div className='bg-white border border-gray-200 rounded-lg p-8 text-center'>
          <Clock size={48} className='text-gray-400 mx-auto mb-4' />
          <p className='text-gray-600 text-lg'>No pending products at the moment</p>
        </div>
      ) : (
        <>
          <div className='bg-white border border-gray-200 rounded-lg overflow-hidden mb-4'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 border-b border-gray-200'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                      Product
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                      Shop
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                      Category
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                      Submitted At
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                      Score
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {products.map((product: any) => (
                    <tr key={product.id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-3'>
                          {product.images?.[0]?.url ? (
                            <Image
                              src={product.images[0].url}
                              alt={product.title}
                              width={48}
                              height={48}
                              className='rounded object-cover'
                            />
                          ) : (
                            <div className='w-12 h-12 bg-gray-100 rounded flex items-center justify-center'>
                              <ImageIcon size={20} className='text-gray-400' />
                            </div>
                          )}
                          <div>
                            <div className='text-sm font-medium text-gray-900'>{product.title}</div>
                            <div className='text-sm text-gray-500'>
                              ${product.sale_price?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-900'>{product.shops?.name || 'N/A'}</div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-900 capitalize'>{product.category || 'N/A'}</div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-900'>
                          {product.submittedAt
                            ? new Date(product.submittedAt).toLocaleDateString()
                            : 'N/A'}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-900'>
                          {product.moderationScore !== null && product.moderationScore !== undefined
                            ? product.moderationScore.toFixed(1)
                            : 'N/A'}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                        <div className='flex items-center gap-2'>
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowModal(true);
                              setActionType(null);
                            }}
                            className='text-blue-600 hover:text-blue-900 flex items-center gap-1'
                          >
                            <Eye size={16} />
                            View
                          </button>
                          <button
                            onClick={() => handleApprove(product)}
                            className='text-green-600 hover:text-green-900 flex items-center gap-1'
                          >
                            <CheckCircle size={16} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(product)}
                            className='text-red-600 hover:text-red-900 flex items-center gap-1'
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between'>
              <div className='text-sm text-gray-700'>
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalProducts)} of {totalProducts} products
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className='px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && selectedProduct && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto'>
            <h3 className='text-xl font-semibold mb-4'>
              {actionType === null
                ? 'Product Details'
                : actionType === 'approve'
                ? 'Approve Product'
                : 'Reject Product'}
            </h3>

            <div className='space-y-4 mb-6'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Title</label>
                  <p className='text-gray-900'>{selectedProduct.title}</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Category</label>
                  <p className='text-gray-900 capitalize'>{selectedProduct.category}</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Price</label>
                  <p className='text-gray-900'>
                    ${selectedProduct.sale_price?.toFixed(2)} / ${selectedProduct.regular_price?.toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Stock</label>
                  <p className='text-gray-900'>{selectedProduct.stock || 0}</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Shop</label>
                  <p className='text-gray-900'>{selectedProduct.shops?.name || 'N/A'}</p>
                </div>
                {selectedProduct.moderationScore !== null && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Moderation Score</label>
                    <p className='text-gray-900'>{selectedProduct.moderationScore.toFixed(1)}</p>
                  </div>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Short Description</label>
                <p className='text-gray-900'>{selectedProduct.short_description}</p>
              </div>

              {selectedProduct.detailed_description && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Detailed Description</label>
                  <div
                    className='text-gray-900 prose max-w-none'
                    dangerouslySetInnerHTML={{ __html: selectedProduct.detailed_description }}
                  />
                </div>
              )}

              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Images</label>
                  <div className='grid grid-cols-4 gap-2'>
                    {selectedProduct.images.map((img: any, idx: number) => (
                      <Image
                        key={idx}
                        src={img.url}
                        alt={`${selectedProduct.title} - Image ${idx + 1}`}
                        width={150}
                        height={150}
                        className='rounded object-cover'
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {actionType && (
              <div className='space-y-4 mb-6'>
                {actionType === 'reject' && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Rejection Reason <span className='text-red-500'>*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className='w-full border border-gray-300 rounded-md p-2'
                      rows={3}
                      placeholder='Please provide a reason for rejection...'
                      required
                    />
                  </div>
                )}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className='w-full border border-gray-300 rounded-md p-2'
                    rows={2}
                    placeholder='Add any additional notes...'
                  />
                </div>
              </div>
            )}

            <div className='flex gap-3 justify-end'>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedProduct(null);
                  setActionType(null);
                  setRejectionReason('');
                  setAdminNotes('');
                }}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                {actionType ? 'Cancel' : 'Close'}
              </button>
              {actionType && (
                <button
                  onClick={handleSubmitAction}
                  disabled={
                    (actionType === 'reject' && !rejectionReason.trim()) ||
                    approveMutation.isPending ||
                    rejectMutation.isPending
                  }
                  className={`px-4 py-2 rounded-md text-white ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {approveMutation.isPending || rejectMutation.isPending
                    ? 'Processing...'
                    : actionType === 'approve'
                    ? 'Approve'
                    : 'Reject'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingProductsPage;

