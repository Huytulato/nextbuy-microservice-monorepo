'use client'
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../utils/axiosInstance';
import { Clock, CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const fetchPendingSellers = async () => {
  const res = await axiosInstance.get('/admin/api/get-pending-sellers');
  return res?.data?.sellers || [];
};

const approveSeller = async (sellerId: string, adminNotes?: string) => {
  const res = await axiosInstance.post(`/admin/api/approve-seller/${sellerId}`, {
    adminNotes,
  });
  return res?.data;
};

const rejectSeller = async (sellerId: string, rejectionReason: string, adminNotes?: string) => {
  const res = await axiosInstance.post(`/admin/api/reject-seller/${sellerId}`, {
    rejectionReason,
    adminNotes,
  });
  return res?.data;
};

const PendingSellersPage = () => {
  const queryClient = useQueryClient();
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ['pending-sellers'],
    queryFn: fetchPendingSellers,
  });

  const approveMutation = useMutation({
    mutationFn: ({ sellerId, adminNotes }: { sellerId: string; adminNotes?: string }) =>
      approveSeller(sellerId, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-sellers'] });
      toast.success('Seller approved successfully');
      setShowModal(false);
      setSelectedSeller(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve seller');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      sellerId,
      rejectionReason,
      adminNotes,
    }: {
      sellerId: string;
      rejectionReason: string;
      adminNotes?: string;
    }) => rejectSeller(sellerId, rejectionReason, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-sellers'] });
      toast.success('Seller rejected');
      setShowModal(false);
      setSelectedSeller(null);
      setRejectionReason('');
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject seller');
    },
  });

  const handleApprove = (seller: any) => {
    setSelectedSeller(seller);
    setActionType('approve');
    setShowModal(true);
  };

  const handleReject = (seller: any) => {
    setSelectedSeller(seller);
    setActionType('reject');
    setShowModal(true);
  };

  const handleSubmitAction = () => {
    if (!selectedSeller) return;

    if (actionType === 'approve') {
      approveMutation.mutate({
        sellerId: selectedSeller.id,
        adminNotes: adminNotes || undefined,
      });
    } else if (actionType === 'reject') {
      if (!rejectionReason.trim()) {
        toast.error('Please provide a rejection reason');
        return;
      }
      rejectMutation.mutate({
        sellerId: selectedSeller.id,
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
        <h2 className='text-2xl font-semibold text-gray-900 mb-2'>Pending Sellers</h2>
        <p className='text-gray-600'>Review and approve or reject seller verification requests</p>
      </div>

      {sellers.length === 0 ? (
        <div className='bg-white border border-gray-200 rounded-lg p-8 text-center'>
          <Clock size={48} className='text-gray-400 mx-auto mb-4' />
          <p className='text-gray-600 text-lg'>No pending sellers at the moment</p>
        </div>
      ) : (
        <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50 border-b border-gray-200'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Seller
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Email
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Submitted At
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Resubmissions
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {sellers.map((seller: any) => (
                  <tr key={seller.id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-gray-900'>{seller.name}</div>
                      <div className='text-sm text-gray-500'>{seller.phone_number}</div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900'>{seller.email}</div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900'>
                        {seller.submittedAt
                          ? new Date(seller.submittedAt).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900'>{seller.resubmissionCount || 0}</div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => {
                            setSelectedSeller(seller);
                            setShowModal(true);
                            setActionType(null);
                          }}
                          className='text-blue-600 hover:text-blue-900 flex items-center gap-1'
                        >
                          <Eye size={16} />
                          View
                        </button>
                        <button
                          onClick={() => handleApprove(seller)}
                          className='text-green-600 hover:text-green-900 flex items-center gap-1'
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(seller)}
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
      )}

      {/* Modal */}
      {showModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'>
            <h3 className='text-xl font-semibold mb-4'>
              {actionType === null
                ? 'Seller Details'
                : actionType === 'approve'
                ? 'Approve Seller'
                : 'Reject Seller'}
            </h3>

            {selectedSeller && (
              <div className='space-y-4 mb-6'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Name</label>
                  <p className='text-gray-900'>{selectedSeller.name}</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
                  <p className='text-gray-900'>{selectedSeller.email}</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Phone</label>
                  <p className='text-gray-900'>{selectedSeller.phone_number}</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Country</label>
                  <p className='text-gray-900'>{selectedSeller.country}</p>
                </div>
                {selectedSeller.documents && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2'>
                      <FileText size={16} />
                      Documents
                    </label>
                    <div className='space-y-2'>
                      {Object.entries(selectedSeller.documents as Record<string, any>).map(
                        ([key, doc]: [string, any]) => (
                          <div key={key} className='flex items-center gap-2 p-2 bg-gray-50 rounded'>
                            <span className='text-sm text-gray-700 capitalize'>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            {doc.url && (
                              <a
                                href={doc.url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='ml-auto text-blue-600 hover:text-blue-700 text-sm'
                              >
                                View Document
                              </a>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  setSelectedSeller(null);
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

export default PendingSellersPage;

