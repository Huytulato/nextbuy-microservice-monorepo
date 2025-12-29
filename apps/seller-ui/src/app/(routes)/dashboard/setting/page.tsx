'use client'
import React, { useState } from 'react'
import { Settings, Store, Truck, CreditCard, Shield } from 'lucide-react'
import ShopProfileForm from 'apps/seller-ui/src/shared/components/settings/shop-profile-form'
import ShippingSettingsForm from 'apps/seller-ui/src/shared/components/settings/shipping-settings-form'
import FinancePayments from 'apps/seller-ui/src/shared/components/settings/finance-payments'
import AccountSecurity from 'apps/seller-ui/src/shared/components/settings/account-security'

type TabType = 'shop' | 'shipping' | 'finance' | 'account'

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('shop')

  const tabs = [
    { id: 'shop' as TabType, label: 'Hồ sơ cửa hàng', icon: Store },
    { id: 'shipping' as TabType, label: 'Thiết lập Vận chuyển', icon: Truck },
    { id: 'finance' as TabType, label: 'Thiết lập Tài chính', icon: CreditCard },
    { id: 'account' as TabType, label: 'Tài khoản & Bảo mật', icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings size={28} className="text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-sm text-gray-500">Quản lý thông tin cửa hàng và tài khoản của bạn</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="border-b border-gray-200 px-6 pt-4">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? 'text-indigo-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'shop' && <ShopProfileForm />}
          {activeTab === 'shipping' && <ShippingSettingsForm />}
          {activeTab === 'finance' && <FinancePayments />}
          {activeTab === 'account' && <AccountSecurity />}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage

