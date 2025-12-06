'use client'
import { ChevronRight, Delete, Plus, Trash, X } from 'lucide-react'
import React, { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import { toast } from 'react-hot-toast'
import { useForm } from 'react-hook-form';
import Input from 'packages/components/input'
import { Controller } from 'react-hook-form'
import { Axios, AxiosError } from 'axios'
import DeleteDiscountCodeModal from 'apps/seller-ui/src/shared/components/modals/delete.discount-code'

const page = () => {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDiscountCode, setSelectedDiscountCode] = useState<any>();
  const queryClient = useQueryClient();
  const { data: discountCodes = [], isLoading} = useQuery({
    queryKey: ['shop-discounts'],
    queryFn: async () => {
      const res = await axiosInstance.get('/product/api/get-discount-codes');
      return res?.data?.discount_codes || [];
    },
  });

  const { register, handleSubmit, reset, control, formState: { errors } } =  useForm(
    {
    defaultValues: {
      public_name: '',
      discountType: 'Percentage',
      discountValue: '',
      discountCode: '',
    }
});

  const createDiscountCodeMutation = useMutation(
    {
      mutationFn: async (data) => {
        await axiosInstance.post('/product/api/create-discount-codes', data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['shop-discounts'] });
        reset();
        setShowModal(false);      }
    }
  );

  const deleteDiscountCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/product/api/delete-discount-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-discounts'] });
    }
  });

  const handleDeleteClick = async (discount: any) => {
    setSelectedDiscountCode(discount);
    setShowDeleteModal(true);
  }

  const onSubmit = (data: any) => {
    if(discountCodes.length >= 8){
      toast.error(("You have reached the maximum limit of 8 discount codes."));
      return;
    }
    createDiscountCodeMutation.mutate(data);
  }

  return (
    <div className="w-full min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className='text-2xl text-white font-semibold'>
          Discount Codes
        </h2>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} /> Create Discount Code
        </button>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center mb-6 text-sm">
        <Link href={"/dashboard"} className="text-blue-500 hover:underline">
          Dashboard
        </Link>
        <ChevronRight size={20} className="inline mx-2 text-gray-500" />
        <span className="text-gray-300">Discount Codes</span>
      </div>

      <div className='mt-8 bg-white p-6 rounded-lg shadow-lg'>
        <h3 className='text-xl text-black font-medium mb-4'>
          Your Discount Codes
        </h3>
        {isLoading ? (
          <p className='text-gray-400'>Loading discount codes...</p>
        ) : (
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-white-800">
                <th className='p-3 text-left'>Title</th>
                <th className='p-3 text-left'>Type</th>
                <th className='p-3 text-left'>Value</th>
                <th className='p-3 text-left'>Code</th>
                <th className='p-3 text-left'>Actions</th>                
              </tr>
            </thead>
            <tbody>
              {discountCodes?.map((discount: any) => (
                <tr key={discount.id} className="border-b border-gray-700">
                  <td className='p-3'>{discount.public_name}</td>
                  <td className='p-3'>{discount.discountType}</td>
                  <td className='p-3'>{discount.discountValue}</td>
                  <td className='p-3'>{discount.discountCode}</td>
                  <td className='p-3'>
                    <button 
                      onClick={() => handleDeleteClick(discount)}
                      className='text-red-500 hover:underline'
                    >
                      <Trash size={18} /> Delete
                    </button>
                  </td>
                </tr>
              ))}

              {
                !isLoading && discountCodes.length === 0 && (
                  <p className='text-gray-400 p-3'>
                    No discount codes available.
                  </p>
                )
              }
            </tbody>
          </table>
        )}
      </div>

      {/* Create Discount Modal*/}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {/* Thêm max-h và overflow để không bị mất nội dung nếu màn hình nhỏ */}
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
            
            {/* Header Modal: Tiêu đề và nút đóng X */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Create Discount Code</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* FORM BẮT ĐẦU (Nằm gọn trong khung trắng) */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Title */}
              <div>
                <Input
                  label="Title"
                  placeholder="e.g. Summer Sale"
                  {...register("public_name", { required: "Title is required" })}
                />
                {errors.public_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.public_name.message as string}</p>
                )}
              </div>

              {/* Discount Type */}
              <div>
                <label className="block mb-1 font-medium text-gray-700">Discount Type</label>
                <Controller
                  control={control}
                  name="discountType"
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="Percentage">Percentage (%)</option>
                      <option value="Fixed Amount">Fixed Amount ($)</option>
                    </select>
                  )}
                />
              </div>

              {/* Discount Value */}
              <div>
                <Input
                  label="Discount Value"
                  type="number"
                  min={1}
                  placeholder="e.g. 10"
                  {...register("discountValue", { required: "Discount value is required" })}
                />
                {errors.discountValue && (
                  <p className="text-red-500 text-xs mt-1">{errors.discountValue.message as string}</p>
                )}
              </div>

              {/* Discount Code */}
              <div>
                <Input
                  label="Discount Code"
                  placeholder="e.g. SUMMER2024"
                  {...register("discountCode", { required: "Discount code is required" })}
                />
                {errors.discountCode && (
                  <p className="text-red-500 text-xs mt-1">{errors.discountCode.message as string}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={createDiscountCodeMutation.isPending}
                className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createDiscountCodeMutation.isPending ? (
                  'Creating...'
                ) : (
                  <>
                    <Plus size={18} /> Create Discount Code
                  </>
                )}
              </button>

              {/* Error Message from API */}
              {createDiscountCodeMutation.isError && (
                <p className="text-red-500 text-xs mt-2 text-center">
                  {(
                    createDiscountCodeMutation.error as AxiosError<{
                      message: string;
                    }>
                  ).response?.data?.message || "Something went wrong. Please try again."}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDiscountCode && (
        <DeleteDiscountCodeModal
          discount={selectedDiscountCode}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => {
            deleteDiscountCodeMutation.mutate(selectedDiscountCode.id);
            setShowDeleteModal(false);
          }}
        />
      )}
    </div>
  )
}

export default page