import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import axiosInstance from '../../utils/axiosInstance';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentUploadProps {
  sellerId: string;
  onSuccess: () => void;
  onSkip?: () => void;
}

interface DocumentFormData {
  idCard: FileList;
  businessLicense?: FileList;
  taxCode?: FileList;
  otherDocuments?: FileList;
}

const SubmitDocuments = ({ sellerId, onSuccess, onSkip }: DocumentUploadProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<{
    idCard?: { file: File; url: string };
    businessLicense?: { file: File; url: string };
    taxCode?: { file: File; url: string };
    otherDocuments?: { file: File; url: string };
  }>({});

  const { register, handleSubmit, formState: { errors }, watch } = useForm<DocumentFormData>();

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Convert to base64 for ImageKit upload (assuming similar to product image upload)
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const originalFileName = file.name || `document-${Date.now()}.${file.type.split('/')[1]}`;
      
      const response = await axiosInstance.post('/product/api/upload-product-image', {
        fileData,
        originalFileName,
      });
      
      return {
        fileId: response.data.fileId,
        file_url: response.data.file_url,
      };
    },
  });

  const handleFileUpload = async (field: keyof typeof uploadedFiles, file: File) => {
    try {
      const result = await uploadFileMutation.mutateAsync(file);
      setUploadedFiles(prev => ({
        ...prev,
        [field]: { file, url: result.file_url },
      }));
      toast.success('File uploaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload file');
    }
  };

  const submitDocumentsMutation = useMutation({
    mutationFn: async (documents: any) => {
      const response = await axiosInstance.post('/seller/api/submit-seller-documents', {
        documents,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Documents submitted successfully! Waiting for admin review.');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit documents');
    },
  });

  const onSubmit = async (data: DocumentFormData) => {
    // Validate that at least ID card is uploaded
    if (!uploadedFiles.idCard) {
      toast.error('Please upload your ID card (CMND/CCCD)');
      return;
    }

    // Prepare documents object
    const documents: any = {
      idCard: {
        fileId: uploadedFiles.idCard.url,
        url: uploadedFiles.idCard.url,
        type: 'id_card',
      },
    };

    if (uploadedFiles.businessLicense) {
      documents.businessLicense = {
        fileId: uploadedFiles.businessLicense.url,
        url: uploadedFiles.businessLicense.url,
        type: 'business_license',
      };
    }

    if (uploadedFiles.taxCode) {
      documents.taxCode = {
        fileId: uploadedFiles.taxCode.url,
        url: uploadedFiles.taxCode.url,
        type: 'tax_code',
      };
    }

    if (uploadedFiles.otherDocuments) {
      documents.otherDocuments = {
        fileId: uploadedFiles.otherDocuments.url,
        url: uploadedFiles.otherDocuments.url,
        type: 'other',
      };
    }

    submitDocumentsMutation.mutate(documents);
  };

  const removeFile = (field: keyof typeof uploadedFiles) => {
    setUploadedFiles(prev => {
      const newState = { ...prev };
      delete newState[field];
      return newState;
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h3 className='text-2xl font-semibold text-center mb-4'>
          Submit Verification Documents
        </h3>
        <p className='text-sm text-gray-600 text-center mb-6'>
          Please upload the required documents for verification. Your account will be reviewed by our admin team.
        </p>

        {/* ID Card (Required) */}
        <div className='mb-4'>
          <label className='block text-gray-700 mb-2 font-medium'>
            ID Card / Citizen ID (CMND/CCCD) <span className='text-red-500'>*</span>
          </label>
          {uploadedFiles.idCard ? (
            <div className='flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded'>
              <CheckCircle size={20} className='text-green-600' />
              <span className='text-sm text-gray-700 flex-1'>{uploadedFiles.idCard.file.name}</span>
              <button
                type='button'
                onClick={() => removeFile('idCard')}
                className='text-red-600 hover:text-red-700'
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors'>
              <input
                type='file'
                accept='image/*,.pdf'
                className='hidden'
                id='idCard'
                {...register('idCard', { required: 'ID Card is required' })}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload('idCard', file);
                  }
                }}
              />
              <label htmlFor='idCard' className='cursor-pointer flex flex-col items-center'>
                <Upload size={32} className='text-gray-400 mb-2' />
                <span className='text-sm text-gray-600'>Click to upload ID Card</span>
                <span className='text-xs text-gray-400 mt-1'>JPG, PNG or PDF (Max 5MB)</span>
              </label>
            </div>
          )}
          {errors.idCard && (
            <p className='text-red-500 text-sm mt-1'>{String(errors.idCard.message)}</p>
          )}
        </div>

        {/* Business License (Optional) */}
        <div className='mb-4'>
          <label className='block text-gray-700 mb-2 font-medium'>
            Business License (Optional)
          </label>
          {uploadedFiles.businessLicense ? (
            <div className='flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded'>
              <CheckCircle size={20} className='text-green-600' />
              <span className='text-sm text-gray-700 flex-1'>{uploadedFiles.businessLicense.file.name}</span>
              <button
                type='button'
                onClick={() => removeFile('businessLicense')}
                className='text-red-600 hover:text-red-700'
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors'>
              <input
                type='file'
                accept='image/*,.pdf'
                className='hidden'
                id='businessLicense'
                {...register('businessLicense')}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload('businessLicense', file);
                  }
                }}
              />
              <label htmlFor='businessLicense' className='cursor-pointer flex flex-col items-center'>
                <Upload size={32} className='text-gray-400 mb-2' />
                <span className='text-sm text-gray-600'>Click to upload Business License</span>
                <span className='text-xs text-gray-400 mt-1'>JPG, PNG or PDF (Max 5MB)</span>
              </label>
            </div>
          )}
        </div>

        {/* Tax Code (Optional) */}
        <div className='mb-4'>
          <label className='block text-gray-700 mb-2 font-medium'>
            Tax Code Document (Optional)
          </label>
          {uploadedFiles.taxCode ? (
            <div className='flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded'>
              <CheckCircle size={20} className='text-green-600' />
              <span className='text-sm text-gray-700 flex-1'>{uploadedFiles.taxCode.file.name}</span>
              <button
                type='button'
                onClick={() => removeFile('taxCode')}
                className='text-red-600 hover:text-red-700'
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors'>
              <input
                type='file'
                accept='image/*,.pdf'
                className='hidden'
                id='taxCode'
                {...register('taxCode')}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload('taxCode', file);
                  }
                }}
              />
              <label htmlFor='taxCode' className='cursor-pointer flex flex-col items-center'>
                <Upload size={32} className='text-gray-400 mb-2' />
                <span className='text-sm text-gray-600'>Click to upload Tax Code</span>
                <span className='text-xs text-gray-400 mt-1'>JPG, PNG or PDF (Max 5MB)</span>
              </label>
            </div>
          )}
        </div>

        <div className='flex gap-3 mt-6'>
          <button
            type='submit'
            disabled={submitDocumentsMutation.isPending || !uploadedFiles.idCard}
            className='flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-md transition-colors duration-200'
          >
            {submitDocumentsMutation.isPending ? 'Submitting...' : 'Submit Documents'}
          </button>
          {onSkip && (
            <button
              type='button'
              onClick={onSkip}
              className='px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors'
            >
              Skip for now
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default SubmitDocuments;

