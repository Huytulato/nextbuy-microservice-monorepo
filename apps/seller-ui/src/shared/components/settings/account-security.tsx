'use client'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Save, Lock, Eye, EyeOff } from 'lucide-react'
import { useSellerProfile } from 'apps/seller-ui/src/hooks/useSellerProfile'
import { useChangePassword } from 'apps/seller-ui/src/hooks/useChangePassword'

const AccountSecurity = () => {
  const { seller, isLoading: profileLoading, updateSeller, isUpdating: profileUpdating } = useSellerProfile()
  const { changePassword, isChanging } = useChangePassword()
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors }, setValue } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      country: '',
    }
  })

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, watch, reset } = useForm({
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  })

  React.useEffect(() => {
    if (seller) {
      setValue('name', seller.name || '')
      setValue('email', seller.email || '')
      setValue('phone_number', seller.phone_number || '')
      setValue('country', seller.country || '')
    }
  }, [seller, setValue])

  const onSubmitProfile = (data: any) => {
    updateSeller(data)
  }

  const newPassword = watch('newPassword')
  const onSubmitPassword = (data: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) {
      return
    }
    changePassword({
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    })
    reset()
  }

  if (profileLoading) {
    return <div className="text-center py-8 text-gray-500">Loading account information...</div>
  }

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
        <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              {...registerProfile('name', { required: 'Name is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {profileErrors.name && <p className="text-red-500 text-sm mt-1">{profileErrors.name.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              {...registerProfile('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {profileErrors.email && <p className="text-red-500 text-sm mt-1">{profileErrors.email.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              {...registerProfile('phone_number', { required: 'Phone number is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {profileErrors.phone_number && <p className="text-red-500 text-sm mt-1">{profileErrors.phone_number.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country <span className="text-red-500">*</span>
            </label>
            <input
              {...registerProfile('country', { required: 'Country is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {profileErrors.country && <p className="text-red-500 text-sm mt-1">{profileErrors.country.message as string}</p>}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={profileUpdating}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Save size={18} />
              {profileUpdating ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="pt-8 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={20} />
          Change Password
        </h3>
        <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Old Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                {...registerPassword('oldPassword', { required: 'Old password is required' })}
                type={showOldPassword ? 'text' : 'password'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordErrors.oldPassword && <p className="text-red-500 text-sm mt-1">{passwordErrors.oldPassword.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                {...registerPassword('newPassword', { 
                  required: 'New password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                type={showNewPassword ? 'text' : 'password'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordErrors.newPassword && <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                {...registerPassword('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: (value) => value === newPassword || 'Passwords do not match'
                })}
                type={showConfirmPassword ? 'text' : 'password'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordErrors.confirmPassword && <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword.message as string}</p>}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isChanging}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Lock size={18} />
              {isChanging ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AccountSecurity

