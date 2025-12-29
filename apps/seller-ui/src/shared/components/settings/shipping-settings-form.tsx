'use client'
import React, { useState, useEffect } from 'react'
import { Save, Package } from 'lucide-react'
import { useShippingSettings } from 'apps/seller-ui/src/hooks/useShippingSettings'

const ShippingSettingsForm = () => {
  const { shippingSettings, isLoading, updateShipping, isUpdating } = useShippingSettings()
  const [fee, setFee] = useState('')
  const [methods, setMethods] = useState<string[]>([])
  const [estimatedDays, setEstimatedDays] = useState('')

  useEffect(() => {
    if (shippingSettings) {
      setFee(shippingSettings.fee?.toString() || '')
      setMethods(shippingSettings.methods || [])
      setEstimatedDays(shippingSettings.estimatedDays?.toString() || '')
    }
  }, [shippingSettings])

  const availableMethods = ['Standard', 'Express', 'Overnight', 'International']

  const toggleMethod = (method: string) => {
    if (methods.includes(method)) {
      setMethods(methods.filter(m => m !== method))
    } else {
      setMethods([...methods, method])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateShipping({
      fee: fee ? parseFloat(fee) : 0,
      methods,
      estimatedDays: estimatedDays ? parseInt(estimatedDays) : 0,
    })
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading shipping settings...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shipping Fee */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Shipping Fee ($)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            placeholder="0.00"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Default shipping fee for orders</p>
      </div>

      {/* Shipping Methods */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Available Shipping Methods
        </label>
        <div className="grid grid-cols-2 gap-3">
          {availableMethods.map((method) => (
            <label
              key={method}
              className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={methods.includes(method)}
                onChange={() => toggleMethod(method)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <Package size={18} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{method}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Estimated Delivery Days */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Estimated Delivery Days
        </label>
        <input
          type="number"
          min="1"
          value={estimatedDays}
          onChange={(e) => setEstimatedDays(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          placeholder="e.g., 3-5 days"
        />
        <p className="text-xs text-gray-500 mt-1">Average number of days for delivery</p>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These settings will apply to all products in your shop. You can override shipping settings for individual products when creating or editing them.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isUpdating}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Save size={18} />
          {isUpdating ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}

export default ShippingSettingsForm

