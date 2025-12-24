'use client'
import React, { useState } from 'react';
import Breadcrumbs from '../../shared/components/breadcrumbs';
import SaleChart from '../../shared/components/charts/sale-chart';
import DeviceUsageChart from '../../shared/components/charts/device-usage-chart';
import GeographicalMap from '../../shared/components/charts/geographicalMap';
import StatusBadge from '../../shared/components/status-badge';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import Link from 'next/link';

// Mock data - will be replaced with API calls
const revenueData = [
  { month: 'Jan', revenue: 4000 },
  { month: 'Feb', revenue: 3000 },
  { month: 'Mar', revenue: 5000 },
  { month: 'Apr', revenue: 4500 },
  { month: 'May', revenue: 6000 },
  { month: 'Jun', revenue: 5500 },
];

const deviceData = [
  { name: 'Phone', value: 45, color: '#10b981' },
  { name: 'Tablet', value: 25, color: '#f59e0b' },
  { name: 'Computer', value: 30, color: '#3b82f6' },
];

const mapMarkers = [
  { name: 'US', coordinates: [-95.7129, 37.0902], value: 100 },
  { name: 'IN', coordinates: [78.9629, 20.5937], value: 80 },
  { name: 'EU', coordinates: [10.4515, 51.1657], value: 60 },
];

const recentOrders = [
  { id: 'ORD-001', customer: 'John Doe', amount: 250, status: 'paid' },
  { id: 'ORD-002', customer: 'Jane Smith', amount: 180, status: 'pending' },
  { id: 'ORD-003', customer: 'Alice Johnson', amount: 340, status: 'paid' },
  { id: 'ORD-004', customer: 'Bob Lee', amount: 90, status: 'failed' },
  { id: 'ORD-005', customer: 'Bob Lee', amount: 90, status: 'failed' },
  { id: 'ORD-006', customer: 'Bob Lee', amount: 90, status: 'failed' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <Breadcrumbs items={[{ label: 'Dashboard' }]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Revenue</h2>
          <p className="text-sm text-gray-600 mb-4">Last 6 months performance</p>
          <SaleChart data={revenueData} />
        </div>

        {/* Device Usage Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Device Usage</h2>
          <p className="text-sm text-gray-600 mb-4">How users access your platform</p>
          <DeviceUsageChart data={deviceData} />
        </div>

        {/* User & Seller Distribution Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            User & Seller Distribution
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Visual breakdown of global user & seller activity.
          </p>
          <GeographicalMap markers={mapMarkers} />
        </div>

        {/* Recent Orders Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Recent Orders</h2>
          <p className="text-sm text-gray-600 mb-4">
            A quick snapshot of your latest transactions.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.customer}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      ${order.amount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
