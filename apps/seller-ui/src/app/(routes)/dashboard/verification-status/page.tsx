'use client'
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../../utils/axiosInstance';
import { CheckCircle, XCircle, Clock, AlertCircle, Upload, FileText } from 'lucide-react';
import Link from 'next/link';
import SubmitDocuments from '../../../../shared/modules/submit-documents';
import toast from 'react-hot-toast';

const fetchSellerInfo = async () => {
  const res = await axiosInstance.get('/api/logged-in-seller');
  return res?.data?.seller;
};

const VerificationStatusPage = () => {
  const queryClient = useQueryClient();
  const { data: seller, isLoading } = useQuery({
    queryKey: ['seller-info'],
    queryFn: fetchSellerInfo,
  });

  const verificationStatus = seller?.verificationStatus || 'UNVERIFIED';
  const rejectionReason = seller?.rejectionReason;
  const submittedAt = seller?.submittedAt;
  const reviewedAt = seller?.reviewedAt;
  const resubmissionCount = seller?.resubmissionCount || 0;

  const getStatusConfig = () => {
    switch (verificationStatus) {
      case 'APPROVED':
        return {
          icon: <CheckCircle size={32} className='text-green-600' />,
          title: 'Verification Approved',
          description: 'Your account has been verified and approved. You can now create your shop and start selling.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
        };
      case 'PENDING':
        return {
          icon: <Clock size={32} className='text-yellow-600' />,
          title: 'Verification Pending',
          description: 'Your documents are under review. We will notify you once the review is complete.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
        };
      case 'REJECTED':
        return {
          icon: <XCircle size={32} className='text-red-600' />,
          title: 'Verification Rejected',
          description: 'Your verification request was rejected. Please review the reason and resubmit your documents.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
        };
      default:
        return {
          icon: <AlertCircle size={32} className='text-gray-600' />,
          title: 'Verification Required',
          description: 'Please submit your verification documents to start selling.',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
        };
    }
  };

  const statusConfig = getStatusConfig();

  if (isLoading) {
    return (
      <div className='w-full min-h-screen p-8 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen p-8'>
      <div className='max-w-4xl mx-auto'>
        <h2 className='text-2xl font-semibold text-gray-900 mb-6'>Verification Status</h2>

        {/* Status Card */}
        <div className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-2 rounded-lg p-6 mb-6`}>
          <div className='flex items-start gap-4'>
            {statusConfig.icon}
            <div className='flex-1'>
              <h3 className={`text-xl font-semibold ${statusConfig.textColor} mb-2`}>
                {statusConfig.title}
              </h3>
              <p className={`${statusConfig.textColor} opacity-80`}>
                {statusConfig.description}
              </p>
            </div>
          </div>
        </div>

        {/* Rejection Reason */}
        {verificationStatus === 'REJECTED' && rejectionReason && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
            <h4 className='font-semibold text-red-800 mb-2'>Rejection Reason:</h4>
            <p className='text-red-700'>{rejectionReason}</p>
          </div>
        )}

        {/* Verification Details */}
        <div className='bg-white border border-gray-200 rounded-lg p-6 mb-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Verification Details</h3>
          <div className='space-y-3'>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Status:</span>
              <span className='font-medium text-gray-900'>{verificationStatus}</span>
            </div>
            {submittedAt && (
              <div className='flex justify-between'>
                <span className='text-gray-600'>Submitted At:</span>
                <span className='font-medium text-gray-900'>
                  {new Date(submittedAt).toLocaleString()}
                </span>
              </div>
            )}
            {reviewedAt && (
              <div className='flex justify-between'>
                <span className='text-gray-600'>Reviewed At:</span>
                <span className='font-medium text-gray-900'>
                  {new Date(reviewedAt).toLocaleString()}
                </span>
              </div>
            )}
            {resubmissionCount > 0 && (
              <div className='flex justify-between'>
                <span className='text-gray-600'>Resubmission Count:</span>
                <span className='font-medium text-gray-900'>{resubmissionCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Documents Section */}
        {seller?.documents && (
          <div className='bg-white border border-gray-200 rounded-lg p-6 mb-6'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2'>
              <FileText size={20} />
              Submitted Documents
            </h3>
            <div className='space-y-2'>
              {Object.entries(seller.documents as Record<string, any>).map(([key, doc]: [string, any]) => (
                <div key={key} className='flex items-center gap-2 p-2 bg-gray-50 rounded'>
                  <FileText size={16} className='text-gray-600' />
                  <span className='text-sm text-gray-700 capitalize'>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='ml-auto text-blue-600 hover:text-blue-700 text-sm'
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {verificationStatus === 'UNVERIFIED' || verificationStatus === 'REJECTED' ? (
          <div className='bg-white border border-gray-200 rounded-lg p-6'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Submit Documents</h3>
            <SubmitDocuments
              sellerId={seller?.id || ''}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['seller-info'] });
                toast.success('Documents submitted successfully!');
              }}
            />
          </div>
        ) : verificationStatus === 'APPROVED' ? (
          <div className='bg-white border border-gray-200 rounded-lg p-6'>
            <p className='text-gray-700 mb-4'>
              Your account is verified. You can now create your shop and start selling products.
            </p>
            <Link
              href='/dashboard'
              className='inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors'
            >
              Go to Dashboard
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VerificationStatusPage;

