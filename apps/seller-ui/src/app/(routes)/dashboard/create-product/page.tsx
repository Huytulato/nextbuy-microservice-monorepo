'use client'
import ImagePlaceHolder from 'apps/seller-ui/src/shared/components/image-placeholder';
import { ChevronRight, Home, Save, Package, ImageIcon, Folder, ChevronDown, X, Wand, DollarSign, Layers, Video } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react'
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
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';


interface UploadedImage {
  fileId?: string;
  file_url?: string;
}

const DashboardPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editProductId = searchParams.get('edit');

  const { register, handleSubmit, formState: { errors }, watch, setValue, control, reset } = useForm();

  const [openImageModal, setOpenImageModal] = useState(false);
  const [isChanged, setIsChanged] = useState(true);
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [originalImageUrl, setOriginalImageUrl] = useState(''); // Store original URL before enhancement
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1); // Track which image is being enhanced
  const [processing, setProcessing] = useState(false);
  const [pictureUploadingLoader, setPictureUploadingLoader] = useState(false);
  const [images, setImages] = useState<(UploadedImage | null)[]>([null]);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  // This setter will be used once we add draft/change tracking.
  void setIsChanged;

  // Fetch product data if editing
  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['product-edit', editProductId],
    queryFn: async () => {
      if (!editProductId) return null;
      const res = await axiosInstance.get(`/product/api/get-shop-products`);
      const product = res?.data?.products?.find((p: any) => p.id === editProductId);
      return product || null;
    },
    enabled: !!editProductId,
  });

  // Populate form when editing
  useEffect(() => {
    if (productData && editProductId) {
      // Populate all form fields
      reset({
        title: productData.title || '',
        slug: productData.slug || '',
        brand: productData.brand || '',
        tags: productData.tags?.join(', ') || '',
        warranty: productData.warranty || '',
        short_description: productData.short_description || '',
        detailed_description: productData.detailed_description || '',
        regular_price: productData.regular_price || '',
        sale_price: productData.sale_price || '',
        stock: productData.stock || '',
        video_url: productData.video_url || '',
        category: productData.category || '',
        subCategory: productData.subCategory || '',
        color: productData.colors || [],
        sizes: productData.sizes || [],
        custom_specifications: productData.custom_specifications || [],
        custom_properties: productData.custom_properties || {},
        discount_codes: productData.discount_codes || [],
      });

      // Populate images
      if (productData.images && productData.images.length > 0) {
        const formattedImages = productData.images.map((img: any) => ({
          fileId: img.file_id,
          file_url: img.url,
        }));
        setImages(formattedImages);
      }
    }
  }, [productData, editProductId, reset]);

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
      const res = await axiosInstance.get('/seller/api/get-discount-codes');
      return res?.data?.discount_codes || [];
    },
  });

  const categories = data?.categories || [];
  const subCategoriesData = data?.subCategories || {};
  const selectedCategory = watch('category');
  const regularPrice = watch('regular_price');

  const subcategories = useMemo(() => {
    return selectedCategory ? subCategoriesData[selectedCategory] || [] : [];
  }, [selectedCategory, subCategoriesData]);


  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      if (editProductId) {
        // Update existing product
        await axiosInstance.put(`/product/api/update-product/${editProductId}`, data);
        toast.success('Product updated successfully!');
      } else {
        // Create new product
        await axiosInstance.post('/product/api/create-product', data);
        toast.success('Product created successfully!');
      }
      router.push('/dashboard/all-products');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const formData = watch(); // Get current form data
      const draftData = { ...formData, isDraft: true };
      
      if (editProductId) {
        // Update existing product as draft
        await axiosInstance.put(`/product/api/update-product/${editProductId}`, draftData);
        toast.success('Draft saved successfully!');
      } else {
        // Create new product as draft
        await axiosInstance.post('/product/api/create-product', draftData);
        toast.success('Draft saved successfully!');
      }
      router.push('/dashboard/all-products');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDraft = async (productId: string) => {
    try {
      setLoading(true);
      await axiosInstance.post(`/product/api/submit-draft/${productId}`);
      toast.success('Draft submitted for review!');
      router.push('/dashboard/all-products');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit draft');
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
      const fileData = await convertFileToBase64(file);
      const originalFileName = file.name || `image-${Date.now()}.jpg`;
      const response = await axiosInstance.post('/product/api/upload-product-image', { 
        fileData,
        originalFileName 
      });     
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
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setPictureUploadingLoader(false);
    }
  };

  const applyTransformation = async (transformation: string) => {
    if (!selectedImage || processing) return;
    setProcessing(true);
    setActiveEffect(transformation);
    try {
      // Apply ImageKit transformation
      const transformedUrl = `${originalImageUrl || selectedImage}/tr:${transformation}`;
      setSelectedImage(transformedUrl);
      toast.success('Enhancement applied! Click "Apply Enhancement" to save.');
    } catch (error) {
      console.error('Error applying transformation:', error);
      toast.error('Failed to apply enhancement');
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyEnhancement = async () => {
    if (!selectedImage || selectedImageIndex === -1 || enhancing) return;
    
    setEnhancing(true);
    try {
      // Download the enhanced image
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      
      // Convert blob to File
      const file = new File([blob], `enhanced-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Upload the enhanced image
      const fileData = await convertFileToBase64(file);
      const uploadResponse = await axiosInstance.post('/product/api/upload-product-image', {
        fileData,
        originalFileName: `enhanced-${Date.now()}.jpg`
      });

      // Update the image in the array
      const updatedImages = [...images];
      updatedImages[selectedImageIndex] = {
        fileId: uploadResponse.data.fileId,
        file_url: uploadResponse.data.file_url,
      };
      
      setImages(updatedImages);
      setValue('images', updatedImages);
      
      // Reset modal state
      setOpenImageModal(false);
      setSelectedImage('');
      setOriginalImageUrl('');
      setActiveEffect(null);
      setSelectedImageIndex(-1);
      
      toast.success('Image enhanced and saved successfully!');
    } catch (error) {
      console.error('Error applying enhancement:', error);
      toast.error('Failed to save enhanced image. Please try again.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleResetEnhancement = () => {
    setSelectedImage(originalImageUrl);
    setActiveEffect(null);
  };



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

  // Show loading state while fetching product data
  if (editProductId && productLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product data...</p>
        </div>
      </div>
    );
  }

  // Show error if product not found
  if (editProductId && !productLoading && !productData) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto text-gray-400 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-4">The product you're trying to edit doesn't exist.</p>
          <button
            onClick={() => router.push('/dashboard/all-products')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

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
                {editProductId ? 'Edit Product' : 'Create New Product'}
              </h1>
              <p className="mt-2 text-gray-500">
                {editProductId 
                  ? 'Update the details below to modify your product' 
                  : 'Fill in the details below to add a new product to your store'}
              </p>
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
                      {images.slice(1).map((_, index) => {
                        const actualIndex = index + 1; // +1 because we sliced from index 1
                        return (
                          <div key={index} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                            <ImagePlaceHolder
                              setOpenImageModal={setOpenImageModal}
                              size="765 x 850"
                              images={images}
                              small
                              pictureUploadingLoader={pictureUploadingLoader}
                              setSelectedImage={(url) => {
                                setSelectedImage(url);
                                setOriginalImageUrl(url);
                                setSelectedImageIndex(actualIndex);
                              }}
                              index={actualIndex}
                              onImageChange={handleImageChange}
                              onRemove={handleRemoveImage}
                            />
                          </div>
                        );
                      })}
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
                 <h3 className="font-semibold text-gray-800 mb-4">
                   {editProductId ? 'Update' : 'Publish'}
                 </h3>
                 <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={loading || productLoading}
                      className="w-full flex justify-center items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-indigo-200 disabled:opacity-50"
                    >
                      <Save size={18} />
                      {loading ? 'Saving...' : editProductId ? 'Update Product' : 'Save & Publish'}
                    </button>
                    {/* Show Save Draft button for new products or when editing drafts */}
                    {(!editProductId || productData?.status === 'draft') && (
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all font-medium shadow-sm disabled:opacity-50"
                      >
                        <Save size={18} />
                        Save Draft
                      </button>
                    )}
                    {/* Show Submit Draft button only when editing a draft */}
                    {editProductId && productData?.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleSubmitDraft(editProductId)}
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-green-200 disabled:opacity-50"
                      >
                        <Package size={18} />
                        Submit for Review
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
                      name="subCategory"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full border outline-none px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white appearance-none cursor-pointer text-gray-700 transition-all hover:border-violet-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          disabled={!selectedCategory || categoriesLoading || subcategories.length === 0}
                        >
                          <option value="">
                            {!selectedCategory 
                              ? 'Select category first' 
                              : subcategories.length === 0 
                                ? 'No subcategories available' 
                                : 'Select subcategory'}
                          </option>
                          {subcategories?.map((sub: string, index: number) => (
                            <option key={index} value={sub}>{sub}</option>
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
                      {selectedCategory}
                      {watch('subCategory') && (
                        <span> / {watch('subCategory')}</span>
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
                          {...register('stock', {
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
                        {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock.message as string}</p>}
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

        {/* --- MODAL Enhance Product Image --- */}
        {openImageModal && (
          <div className='fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-50'>
            <div className='bg-white p-6 rounded-lg w-[500px] max-w-[90vw] relative shadow-xl'>
              <div className='flex justify-between items-center pb-3 mb-4 border-b border-gray-200'>
                <h2 className='text-xl font-semibold text-gray-900'>Enhance Product Image</h2>
                <button
                  type="button"
                  onClick={() => {
                    setOpenImageModal(false);
                    setSelectedImage('');
                    setOriginalImageUrl('');
                    setActiveEffect(null);
                    setSelectedImageIndex(-1);
                  }}
                  className='text-gray-500 hover:text-gray-700 transition-colors'
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Image Preview */}
              <div className='relative w-full h-[300px] rounded-md bg-gray-100 flex items-center justify-center overflow-hidden mb-4 border border-gray-200'>
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="product-image"
                    className='max-w-full max-h-full object-contain'
                  />
                ) : (
                  <div className='text-gray-500'>No image selected</div>
                )}
                {processing && (
                  <div className='absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center'>
                    <div className='text-gray-900 font-medium'>Processing...</div>
                  </div>
                )}
              </div>

              {/* AI Enhancement Options */}
              {selectedImage && (
                <div className='mt-4 flex flex-col'>
                  <h3 className='text-gray-900 text-sm font-semibold mb-3'>
                    AI Enhancement Options
                  </h3>
                  <div className='grid grid-cols-2 gap-3 mb-4'>
                    {enhancements?.map(({ label, effect }) => (
                      <button
                        key={effect}
                        type="button"
                        className={`p-3 rounded-md flex items-center justify-center gap-2 text-sm transition-all ${
                          activeEffect === effect
                            ? "bg-blue-600 text-white shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => applyTransformation(effect)}
                        disabled={processing || enhancing}
                      >
                        <Wand size={16} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className='flex gap-3 mt-2'>
                    {activeEffect && (
                      <button
                        type="button"
                        onClick={handleResetEnhancement}
                        className='flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-300'
                        disabled={enhancing}
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleApplyEnhancement}
                      disabled={!activeEffect || enhancing || selectedImageIndex === -1}
                      className={`flex-1 px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                        activeEffect && !enhancing && selectedImageIndex !== -1
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {enhancing ? 'Applying...' : 'Apply Enhancement'}
                    </button>
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