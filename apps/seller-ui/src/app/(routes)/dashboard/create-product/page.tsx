'use client'
import ImagePlaceHolder from 'apps/seller-ui/src/shared/components/image-placeholder';
import { ChevronRight, Home, Save, Eye, Package, ImageIcon, Folder, ChevronDown, Divide, X, Image, Wand, DollarSign, Layers, Video } from 'lucide-react';
import React, { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form';
import Input from 'packages/components/input';
import ColorSelector from 'packages/components/color-selector';
import CustomSpecifications from 'packages/components/custom-specification';
import CustomProperties from 'packages/components/custom-properties';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance';
import axios from 'axios';
import RichTextEditor from 'packages/components/rich-text-editor';
import SizeSelector from 'packages/components/size-selector';
import { enhancements } from 'apps/seller-ui/src/utils/AI.enhancements';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';


interface UploadedImage {
  fileId?: string;
  file_url?: string;
}

const DashboardPage = () => {

  const { register, handleSubmit, formState: { errors }, watch, setValue, control } = useForm();

  const [openImageModal, setOpenImageModal] = useState(false);
  const [isChanged, setIsChanged] = useState(true);
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [pictureUploadingLoader, setPictureUploadingLoader] = useState(false);
  const [images, setImages] = useState<(UploadedImage | null)[]>([null]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { data, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URI}/product/api/get-categories`, {
          withCredentials: true
        });
        return res.data;
      } catch (error) {
        console.log('Error fetching product categories:', error);
        return { categories: [], subCategories: {} };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  const { data: discountCodes = [], isLoading: discountCodesLoading } = useQuery({
    queryKey: ['shop-discounts'],
    queryFn: async () => {
      const res = await axiosInstance.get('/product/api/get-discount-codes');
      return res?.data?.discount_codes || [];
    },
  });

  const categories = data?.categories || [];
  const subCategoriesData = data?.subCategories || {};
  const selectedCategory = watch('category');
  const regularPrice = watch('regular_price');

  const subcategories = useMemo(() => {
    return selectedCategory ? subCategoriesData[selectedCategory] || [] : {};
  }, [selectedCategory, subCategoriesData]);


  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      await axiosInstance.post('/product/api/create-product', data);
      router.push('/dashboard/all-products');
    } catch (error: any) {
      toast.error(error?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      }
      reader.onerror = (error) => {
        reject(error);
      }
      reader.readAsDataURL(file);
    });
  }

  const handleImageChange = async (file: File, index: number) => {
    if (!file) return;
    setPictureUploadingLoader(true);

    try {
      const fileName = await convertFileToBase64(file);
      const response = await axiosInstance.post('/product/api/upload-product-image', { fileName });     
      const updatedImages = [...images];
      const uploadImage = {
        fileId: response.data.fileId,
        file_url: response.data.file_url,
      }
      updatedImages[index] = uploadImage;

      if (index === images.length - 1 && images.length < 8) {
        updatedImages.push(null);
      }
      setImages(updatedImages);
      setValue('images', updatedImages);
    } catch (error) {
      console.error('Error converting image to base64:', error);
    } finally {
      setPictureUploadingLoader(false);
    }
  };

  const applyTransformation = async (transformation: string) => {
    if (!selectedImage || processing) return;
    setProcessing(true);
    setActiveEffect(transformation);
    try {
      const transformedUrl = `${selectedImage}/tr:${transformation}`;
      setSelectedImage(transformedUrl);
    } catch (error) {
      console.error('Error applying transformation:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveDraft = () => {
    // Logic to save draft
  }

  const handleRemoveImage = async (index: number) => {
    try {
      const updatedImages = [...images];
      const imageToDelete = updatedImages[index];
      if (imageToDelete && typeof imageToDelete === 'object') {
        await axiosInstance.delete('/product/api/delete-product-image', {
          data: { fileId: imageToDelete.fileId! }
        });
      }
      updatedImages.splice(index, 1);

      // Add null placeholder if less than 8 images
      if (updatedImages.length < 8 && !updatedImages.includes(null)) {
        updatedImages.push(null);
      }
      setImages(updatedImages);
      setValue('images', updatedImages);
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <form
        className="max-w-[1600px] mx-auto p-6 lg:p-8"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Header Section */}
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Home size={16} />
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Dashboard</span>
            <ChevronRight size={16} className="text-gray-300" />
            <span className="text-indigo-600 font-medium">Create Product</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Package className="text-indigo-600" size={28} />
                </div>
                Create New Product
              </h1>
              <p className="mt-2 text-gray-500">Fill in the details below to add a new product to your store</p>
            </div>
          </div>
        </div>

        {/* --- MAIN LAYOUT --- */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT COLUMN (MAIN CONTENT - 66%) */}
          <div className="lg:w-2/3 space-y-6">

            {/* 1. Basic Information Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Product title */}
                <div className="md:col-span-2">
                  <Input
                    label="Product Title *"
                    placeholder="Enter product title"
                    {...register('title', { required: "Title is required" })}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message as string}</p>}
                </div>

                {/* Slug */}
                <div>
                  <Input
                    label="Slug *"
                    placeholder="product-slug"
                    {...register('slug', {
                      required: "Slug is required",
                      pattern: {
                        value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                        message: "Slug can only contain lowercase letters, numbers, and hyphens",
                      },
                      minLength: { value: 3, message: "Slug must be at least 3 characters long" },
                      maxLength: { value: 50, message: "Slug cannot exceed 50 characters" },
                    })}
                  />
                  {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug.message as string}</p>}
                </div>

                {/* Brand */}
                <div>
                  <Input
                    label="Brand"
                    placeholder="Brand name"
                    {...register('brand')}
                  />
                </div>

                {/* Tags */}
                <div>
                  <Input
                    label="Tags *"
                    placeholder="apple, samsung, mobile"
                    {...register('tags', { required: "Separate related products tags with a comma" })}
                  />
                  {errors.tags && <p className="text-red-500 text-sm mt-1">{errors.tags.message as string}</p>}
                </div>

                {/* Warranty */}
                <div>
                  <Input
                    label="Warranty *"
                    placeholder="1 year / no warranty"
                    {...register('warranty', { required: "Warranty information is required" })}
                  />
                  {errors.warranty && <p className="text-red-500 text-sm mt-1">{errors.warranty.message as string}</p>}
                </div>

                {/* Short Description */}
                <div className="md:col-span-2">
                  <Input
                    type="textarea"
                    rows={4}
                    label="Short Description * (Max 500 words)"
                    placeholder="Enter product description..."
                    {...register('short_description', {
                      required: "Description is required",
                      validate: (value) => {
                        const wordCount = value.trim().split(/\s+/).length;
                        return (wordCount <= 500 || `Description must be less than 500 words (Current: ${wordCount})`);
                      }
                    })}
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message as string}</p>}
                </div>
              </div>
            </div>

            {/* 2. Detailed Description Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                  Detailed Description
                </h3>
              <div>
                <Controller
                  name="detailed_description"
                  control={control}
                  rules={{
                    required: "Detailed description is required",
                    validate: (value) => {
                      const wordCount = value.trim().split(/\s+/).length;
                      return (wordCount >= 100 || `Detailed description must be at least 100 words (Current: ${wordCount})`);
                    },
                  }}
                  render={({ field }) => <RichTextEditor value={field.value} onChange={field.onChange} />}
                />
                {errors.detailed_description && (
                  <p className="text-red-500 text-sm mt-1">{errors.detailed_description.message as string}</p>
                )}
              </div>
            </div>

            {/* 3. Product Images Card */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <div className="w-1 h-5 bg-rose-500 rounded-full"></div>
                  <ImageIcon size={20} className="text-gray-700" />
                  <h3 className="font-semibold text-gray-800">Product Media</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">Upload up to 8 images. First image will be the cover.</p>

                {images.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Main Image Preview */}
                    <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <ImagePlaceHolder
                        setOpenImageModal={setOpenImageModal}
                        size="765 x 850"
                        small={false}
                        images={images}
                        pictureUploadingLoader={pictureUploadingLoader}
                        index={0}
                        onImageChange={handleImageChange}
                        setSelectedImage={setSelectedImage}
                        onRemove={handleRemoveImage}
                      />
                    </div>
                    {/* Grid of smaller images */}
                    <div className="grid grid-cols-3 gap-3 content-start">
                      {images.slice(1).map((_, index) => (
                        <div key={index} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                          <ImagePlaceHolder
                            setOpenImageModal={setOpenImageModal}
                            size="765 x 850"
                            images={images}
                            small
                            setSelectedImage={setSelectedImage}
                            index={index + 1}
                            onImageChange={handleImageChange}
                            onRemove={handleRemoveImage}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-4 text-center">
                  {images.filter(img => img !== null).length} / 8 images uploaded
                </p>
            </div>

            {/* 4. Specifications Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                Technical Specifications
              </h3>
              <CustomSpecifications
                control={control}
                errors={errors}
              />
            </div>

            {/* 5. Custom Properties Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                Additional Properties
              </h3>
              <CustomProperties
                control={control}
                errors={errors}
              />
            </div>

          </div>

          {/* RIGHT COLUMN (SIDEBAR - 33%) */}
          <div className="lg:w-1/3 space-y-6">

             {/* 1. Action Buttons (Sticky Top of Sidebar) */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6 z-10">
                 <h3 className="font-semibold text-gray-800 mb-4">Publish</h3>
                 <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-indigo-200 disabled:opacity-50"
                    >
                      <Save size={18} />
                      {loading ? 'Saving...' : 'Save & Publish'}
                    </button>
                    {isChanged && (
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all font-medium shadow-sm"
                      >
                        <Save size={18} />
                        Save Draft
                      </button>
                    )}
                 </div>
             </div>

            {/* 2. Category Selection Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                <div className="w-1 h-5 bg-violet-500 rounded-full"></div>
                <Folder size={18} className="text-violet-500" />
                Category Organization
              </h3>

              <div className="flex flex-col gap-5">
                {/* Main Category */}
                <div>
                  <label className="block font-semibold mb-2 text-gray-700 text-sm">Category *</label>
                  <div className="relative">
                    <Controller
                      name="category"
                      control={control}
                      rules={{ required: "Category is required" }}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full border outline-none px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white appearance-none cursor-pointer text-gray-700 transition-all hover:border-violet-300"
                          disabled={categoriesLoading}
                        >
                          <option value="">{categoriesLoading ? 'Loading...' : 'Select category'}</option>
                          {categories?.map((category: string) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      )}
                    />
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message as string}</p>}
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block font-semibold mb-2 text-gray-700 text-sm">Subcategory</label>
                  <div className="relative">
                    <Controller
                      name="subcategory"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full border outline-none px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white appearance-none cursor-pointer text-gray-700 transition-all hover:border-violet-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          disabled={!selectedCategory || categoriesLoading}
                        >
                          <option value="">{!selectedCategory ? 'Select category first' : 'Select subcategory'}</option>
                          {selectedCategory && subcategories[selectedCategory]?.map((sub: any) => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      )}
                    />
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Category Preview */}
                {selectedCategory && (
                  <div className="p-3 bg-violet-50 rounded-lg border border-violet-100">
                    <p className="text-xs text-violet-700">
                      <span className="font-medium">Path: </span>
                      {categories.find((c: any) => c.id === selectedCategory)?.name}
                      {watch('subcategory') && subcategories[selectedCategory]?.find((s: any) => s.id === watch('subcategory')) && (
                        <span> / {subcategories[selectedCategory]?.find((s: any) => s.id === watch('subcategory'))?.name}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Pricing & Inventory Card (GROUPED) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h3 className="font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                    <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                    <DollarSign size={18} className="text-green-500" />
                    Pricing & Inventory
                  </h3>
                  <div className="space-y-4">
                     <div>
                        <input
                          placeholder="$0.00"
                          {...register('regular_price', {
                            valueAsNumber: true,
                            required: "Regular price is required",
                            min: { value: 0, message: "Price cannot be negative" },
                            validate: (value) => !isNaN(value) || "Please enter a valid number",
                          })}
                          className="w-full border outline-none px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-700 transition-all hover:border-indigo-300"
                        />
                        <span className="text-xs text-gray-500 mt-1 block">Regular Price</span>
                        {errors.regular_price && <p className="text-red-500 text-sm mt-1">{errors.regular_price.message as string}</p>}
                     </div>

                     <div>
                        <input
                          placeholder="$0.00"
                          {...register('sale_price', {
                            valueAsNumber: true,
                            required: "Sale price is required",
                            min: { value: 0, message: "Price cannot be negative" },
                            validate: (value) => {
                              if (isNaN(value)) return "Please enter a valid number";
                              if (regularPrice && value >= regularPrice) return "Sale price must be less than regular price";
                              return true;
                            }
                          })}
                          className="w-full border outline-none px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-700 transition-all hover:border-indigo-300"
                        />
                         <span className="text-xs text-gray-500 mt-1 block">Sale Price</span>
                        {errors.sale_price && <p className="text-red-500 text-sm mt-1">{errors.sale_price.message as string}</p>}
                     </div>

                     <div className="pt-2 border-t border-gray-100">
                        <input
                          placeholder="e.g. 100"
                          {...register('stock_quantity', {
                            valueAsNumber: true,
                            required: "Stock quantity is required",
                            min: { value: 1, message: "Quantity must be at least 1" },
                            max: { value: 10000, message: "Quantity cannot exceed 10,000" },
                            validate: (value) => {
                              if (isNaN(value)) return "Please enter a valid number";
                              if (!Number.isInteger(value)) return "Quantity must be an integer";
                              return true;
                            }
                          })}
                          className="w-full border outline-none px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-700 transition-all hover:border-indigo-300"
                        />
                        <span className="text-xs text-gray-500 mt-1 block">Stock Quantity</span>
                        {errors.stock_quantity && <p className="text-red-500 text-sm mt-1">{errors.stock_quantity.message as string}</p>}
                     </div>
                  </div>
            </div>

            {/* 4. Variants (Color & Size) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                <div className="w-1 h-5 bg-pink-500 rounded-full"></div>
                <Layers size={18} className="text-pink-500" />
                Variants
              </h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Colors</label>
                <ColorSelector control={control} errors={errors} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sizes</label>
                <SizeSelector control={control} errors={errors} />
              </div>
            </div>

            {/* 5. Extras (Video & Discounts) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-1 h-5 bg-gray-500 rounded-full"></div>
                  Extras
               </h3>
               
               {/* Video URL */}
               <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                      <Video size={16} className="text-gray-500"/>
                      <label className="text-sm font-medium text-gray-700">Video URL</label>
                  </div>
                  <input
                    placeholder="https://youtube.com/..."
                    {...register('video_url', {
                      pattern: {
                        value: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
                        message: "Please enter a valid YouTube URL",
                      },
                    })}
                    className="w-full border outline-none px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-700 transition-all hover:border-indigo-300"
                  />
                  {errors.video_url && <p className="text-red-500 text-sm mt-1">{errors.video_url.message as string}</p>}
               </div>

               {/* Discounts */}
               <div>
                  <label className='block font-semibold text-gray-700 text-sm mb-2'>
                    Active Discounts
                  </label>
                  {discountCodesLoading ? (
                    <p className="text-gray-500 text-xs">Loading...</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {discountCodes?.map((code: any) => {
                         const currentSelection = watch('discount_codes') || [];
                         const isSelected = currentSelection.includes(code.id);
                         return (
                          <button
                            key={code.id}
                            type="button"
                            className={`px-3 py-1 rounded-full text-xs transition border ${
                                isSelected 
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-200 font-medium' 
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              const updatedSelection = isSelected
                                ? currentSelection.filter((id: string) => id !== code.id)
                                : [...currentSelection, code.id];
                              setValue('discount_codes', updatedSelection);
                            }}
                          >
                            {code?.public_name} ({code.discountType === 'Percentage' ? `${code.discountValue}%` : `$${code.discountValue}`})
                          </button>
                      )})}
                    </div>
                  )}
               </div>
            </div>

          </div> {/* End Right Column */}
        </div> {/* End Main Flex Layout */}

        {/* --- MODAL (Keep as is) --- */}
        {openImageModal && (
          <div className='fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white bg-opacity-95 z-50'>
            <div className='bg-gray-800 p-6 rounded-lg w-[450px] text-black relative'>
              <div className='flex justify-center items-center pb-3 mb-4'>
                <h2 className='text-xl font-semibold text-white'>Enhance Product Image</h2>
                <X size={20} className='absolute top-6 right-6 text-gray-400 hover:text-white cursor-pointer' onClick={() => setOpenImageModal(!openImageModal)} />
              </div>
              <div className='relative w-full h-[250px] rounded-md bg-gray-900'>
                <Image
                  src={selectedImage}
                  alt="product-image"
                  layout="fill"
                  objectFit="contain"
                />
              </div>
              {selectedImage && (
                <div className='mt-4 flex flex-col'>
                  <h3 className='text-white text-sm font-semibold mb-2'>
                    AI Enhancement Options
                  </h3>
                  <div className='grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-1'>
                    {enhancements?.map(({ label, effect }) => (
                      <button
                        key={effect}
                        type="button"
                        className={`p-2 rounded-md flex items-center gap-2 text-sm transition-colors ${activeEffect === effect
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        onClick={() => applyTransformation(effect)}
                        disabled={processing}
                      >
                        <Wand size={16} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default DashboardPage;