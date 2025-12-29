import React from 'react'
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { shopCategories } from '../../utils/categories';

const CreateShop = ({
  sellerId,
  setActiveStep,
}: {
  sellerId: string;
  setActiveStep: (step: number) => void;
}) => {
  // Build API base with safe fallback
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const API = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const shopCreationMutation = useMutation({
    mutationFn: async (data: any) => {
      // Map form fields to backend expected names
      const payload = {
        name: data.shopName,
        bio: data.shopBio,
        category: data.shopCategory,
        address: data.shopAddress,
        opening_hours: data.shopOpeningHours,
        website: data.shopWebsite || '',
        sellerId,
      };
      const response = await axios.post(
        `${API_BASE}/seller/api/create-shop`, 
        payload, 
        {
          withCredentials: true // Quan trọng nhất: Cho phép gửi Cookie
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setActiveStep(3);
    },
  });

  const onSubmit = (data: any) => {
    shopCreationMutation.mutate(data);
  };

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).length;
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h3 className='text-2xl font-semibold text-center mb-4'>
          Setup new shop
        </h3>

        <label className='block text-gray-700 mb-1'>Name *</label>
        <input
          type='text'
          placeholder='Enter shop name'
          className='w-full border border-gray-300 p-2 rounded mb-3'
          {...register('shopName', { required: 'Shop name is required' })}
        />
        {errors.shopName && (
          <p className='text-red-500 text-sm mb-3'>
            {String(errors.shopName.message)}
          </p>
        )}

        <label className='block text-gray-700 mb-1'>Bio (max 100 words)*</label>
        <textarea
          placeholder='Enter shop bio'
          className='w-full border border-gray-300 p-2 rounded mb-3'
          {...register('shopBio', { required: 'Shop bio is required', validate: (value) => countWords(value) <= 100 || 'Bio cannot exceed 100 words' })}
        />
        {errors.shopBio && (
          <p className='text-red-500 text-sm mb-3'>
            {String(errors.shopBio.message)}
          </p>
        )}

        <label className='block text-gray-700 mb-1'>Address *</label>
        <input
          type='text'
          placeholder='Enter shop address'
          className='w-full border border-gray-300 p-2 rounded mb-3'
          {...register('shopAddress', { required: 'Shop address is required' })}
        />
        {errors.shopAddress && (
          <p className='text-red-500 text-sm mb-3'>
            {String(errors.shopAddress.message)}
          </p>
        )}

        <label className='block text-gray-700 mb-1'>Opening Hours *</label>
        <input
          type='text'
          placeholder='Enter shop opening hours'
          className='w-full border border-gray-300 p-2 rounded mb-3'
          {...register('shopOpeningHours', { required: 'Shop opening hours are required' })}
        />
        {errors.shopOpeningHours && (
          <p className='text-red-500 text-sm mb-3'>
            {String(errors.shopOpeningHours.message)}
          </p>
        )}

        <label className='block text-gray-700 mb-1'>Website</label>
        <input
          type='text'
          placeholder='https://yourshop.com'
          className='w-full border border-gray-300 p-2 rounded mb-3'
          {...register('shopWebsite',{
            pattern: {
              value: /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/[\w-./?%&=]*)?$/,
              message: 'Enter a valid URL',
            },
          })}
        />
        {errors.shopWebsite && (
          <p className='text-red-500 text-sm mb-3'>
            {String(errors.shopWebsite.message)}
          </p>
        )}

        <label className='block text-gray-700 mb-1'>Category *</label>
        <select 
          className='w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1' 
          {...register('shopCategory', { required: 'Shop category is required' })}
        >
          <option value=''>Select category</option>
          {
            shopCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))
          }
        </select>
        {errors.shopCategory && (
          <p className='text-red-500 text-sm mb-3'>
            {String(errors.shopCategory.message)}
          </p>
        )}
        <button
          type='submit'
          className='w-full bg-blue-600 text-white p-2 rounded mt-4 hover:bg-blue-700 transition'
        >
          Create Shop
        </button>
      </form>
    </div>
  )
}

export default CreateShop