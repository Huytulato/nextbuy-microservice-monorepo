'use client'
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Save, Upload, X, Plus } from 'lucide-react'
import { useShopProfile } from 'apps/seller-ui/src/hooks/useShopProfile'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import toast from 'react-hot-toast'

const fetchCategories = async () => {
  const res = await axiosInstance.get('/product/api/get-categories')
  return res.data.categories || []
}

const ShopProfileForm = () => {
  const { shop, isLoading, updateShop, isUpdating } = useShopProfile()
  const [coverBanner, setCoverBanner] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [socialLinks, setSocialLinks] = useState<Array<{platform: string, url: string}>>([])
  const [newSocialPlatform, setNewSocialPlatform] = useState('')
  const [newSocialUrl, setNewSocialUrl] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      name: '',
      bio: '',
      category: '',
      address: '',
      opening_hours: '',
      website: '',
    }
  })

  useEffect(() => {
    if (shop) {
      setValue('name', shop.name || '')
      setValue('bio', shop.bio || '')
      setValue('category', shop.category || '')
      setValue('address', shop.address || '')
      setValue('opening_hours', shop.opening_hours || '')
      setValue('website', shop.website || '')
      setCoverBanner(shop.coverBanner || null)
      setAvatar(shop.avatar || null)
      setSocialLinks(Array.isArray(shop.social_links) ? shop.social_links : [])
    }
  }, [shop, setValue])

  const handleCoverBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    try {
      const reader = new FileReader()
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const originalFileName = file.name || `cover-${Date.now()}.jpg`
      const response = await axiosInstance.post('/seller/api/upload-shop-image', {
        fileData,
        originalFileName
      })

      setCoverBanner(response.data.file_url)
      toast.success('Cover banner uploaded successfully!')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload cover banner')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const reader = new FileReader()
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const originalFileName = file.name || `avatar-${Date.now()}.jpg`
      const response = await axiosInstance.post('/seller/api/upload-shop-image', {
        fileData,
        originalFileName
      })

      setAvatar(response.data.file_url)
      toast.success('Avatar uploaded successfully!')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const addSocialLink = () => {
    if (newSocialPlatform && newSocialUrl) {
      setSocialLinks([...socialLinks, { platform: newSocialPlatform, url: newSocialUrl }])
      setNewSocialPlatform('')
      setNewSocialUrl('')
    }
  }

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index))
  }

  const onSubmit = (data: any) => {
    updateShop({
      ...data,
      coverBanner,
      avatar,
      social_links: socialLinks,
    })
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading shop profile...</div>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Cover Banner */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cover Banner
        </label>
        <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
          {coverBanner ? (
            <>
              <Image src={coverBanner} alt="Cover banner" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setCoverBanner(null)}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <label className="w-full h-full flex items-center justify-center cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverBannerUpload}
                disabled={uploadingCover}
              />
              <div className="text-center">
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload cover banner</p>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Shop Avatar */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Shop Logo
        </label>
        <div className="relative w-32 h-32 bg-gray-100 rounded-full overflow-hidden border-2 border-dashed border-gray-300">
          {avatar ? (
            <>
              <Image src={avatar} alt="Shop logo" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setAvatar(null)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
              <div className="text-center">
                <Upload size={24} className="mx-auto text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Upload</span>
              </div>
            </label>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Shop Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Shop Name <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name', { required: 'Shop name is required' })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          placeholder="Enter shop name"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message as string}</p>}
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bio
        </label>
        <textarea
          {...register('bio')}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          placeholder="Describe your shop..."
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          {...register('category', { required: 'Category is required' })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="">Select a category</option>
          {categories.map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message as string}</p>}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address <span className="text-red-500">*</span>
        </label>
        <input
          {...register('address', { required: 'Address is required' })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          placeholder="Enter shop address"
        />
        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message as string}</p>}
      </div>

      {/* Opening Hours */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opening Hours <span className="text-red-500">*</span>
        </label>
        <input
          {...register('opening_hours', { required: 'Opening hours is required' })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          placeholder="e.g., Mon-Fri: 9AM-6PM"
        />
        {errors.opening_hours && <p className="text-red-500 text-sm mt-1">{errors.opening_hours.message as string}</p>}
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website
        </label>
        <input
          {...register('website')}
          type="url"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          placeholder="https://example.com"
        />
      </div>

      {/* Social Links */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Social Links
        </label>
        <div className="space-y-3">
          {socialLinks.map((link, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-sm text-gray-700">{link.platform}:</span>
              <span className="text-sm text-gray-600 flex-1">{link.url}</span>
              <button
                type="button"
                onClick={() => removeSocialLink(index)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSocialPlatform}
              onChange={(e) => setNewSocialPlatform(e.target.value)}
              placeholder="Platform (e.g., Facebook)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              type="url"
              value={newSocialUrl}
              onChange={(e) => setNewSocialUrl(e.target.value)}
              placeholder="URL"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={addSocialLink}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isUpdating}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Save size={18} />
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

export default ShopProfileForm

