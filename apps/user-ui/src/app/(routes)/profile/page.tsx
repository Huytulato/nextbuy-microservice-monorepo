'use client'
import { useQueryClient } from '@tanstack/react-query';
import useUser from 'apps/user-ui/src/hooks/useUser';
import { useOrders } from 'apps/user-ui/src/hooks/useOrders';
import StatCard from 'apps/user-ui/src/shared/components/cards/stat.card';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { BadgeCheck, Bell, CheckCircle, Clock, CreditCard, Gift, HelpCircle, Inbox, Loader2, Lock, LogOut, Map, Pencil, Settings, ShoppingBag, Truck, User } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react'
import Image from 'next/image';
import QuickActionCard from 'apps/user-ui/src/shared/components/cards/quick-action.card';
import ShippingAddressSection from 'apps/user-ui/src/shared/components/shippingAddress';

const Page = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {user, isLoading} = useUser();
  const { orders, isLoading: ordersLoading } = useOrders();
  const queryTab = searchParams.get('active') || 'Profile';  
  const [activeTab, setActiveTab] = useState(queryTab);

  useEffect(() => {
    if (activeTab !== queryTab) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("active", activeTab);
      router.replace(`/profile?${newParams.toString()}`);
    }
  }, [activeTab, queryTab, searchParams, router]);

  const logOutHandler = async () => {
    await axiosInstance.get("/api/logout-user").then((res) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      router.push("/login");
    });
  };

  // Calculate order statistics
  const orderStats = useMemo(() => {
    const totalOrders = orders.length;
    const processingOrders = orders.filter((order: any) => 
      order.deliveryStatus !== 'delivered' && order.status === 'paid'
    ).length;
    const completedOrders = orders.filter((order: any) => 
      order.deliveryStatus === 'delivered'
    ).length;
    return { totalOrders, processingOrders, completedOrders };
  }, [orders]);
  

  return (
    <div className="bg-gray-50 p-6 pb-14">
      <div className="md:max-w-8xl mx-auto">
        {/* Greeting */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back,{" "}
            <span className="text-blue-600">
              {isLoading ? (
                <Loader2 className="inline animate-spin w-5 h-5" />
              ) : (
                `${user?.name || "User"}`
              )}
            </span>{" "}
            👋
          </h1>
        </div>

        {/* Profile Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard title="Total Orders" count={orderStats.totalOrders} Icon={Clock} />
            <StatCard title="Processing Orders" count={orderStats.processingOrders} Icon={Truck} />
            <StatCard title="Completed Orders" count={orderStats.completedOrders} Icon={CheckCircle} />
        </div>
        
        {/* Sidebar and content layout - 3 columns */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-1/4">
            <div className="bg-white p-4 rounded-md shadow-md border border-gray-100">
              <nav className="space-y-2">
                <NavItem
                  label="Profile"
                  Icon={User}
                  active={activeTab === "Profile"}
                  onClick={() => setActiveTab("Profile")}
                />
                <NavItem
                  label="My Orders"
                  Icon={ShoppingBag}
                  active={activeTab === "My Orders"}
                  onClick={() => setActiveTab("My Orders")}
                />
                <NavItem
                  label="Inbox"
                  Icon={Inbox}
                  active={activeTab === "Inbox"}
                  onClick={() => router.push('/inbox')}
                />
                <NavItem
                  label="Notifications"
                  Icon={Bell}
                  active={activeTab === "Notifications"}
                  onClick={() => setActiveTab("Notifications")}
                />
                <NavItem
                  label="Shipping Addresses"
                  Icon={Map}
                  active={activeTab === "Shipping Addresses"}
                  onClick={() => setActiveTab("Shipping Addresses")}
                />
                <NavItem
                  label="Change Password"
                  Icon={Lock}
                  active={activeTab === "Change Password"}
                  onClick={() => setActiveTab("Change Password")}
                />
                <NavItem
                  label="Logout"
                  Icon={LogOut}
                  danger
                  onClick={() => logOutHandler()}
                />
              </nav>
            </div>
          </div>

          {/* Center Content Area */}
          <div className="flex-1">
            <div className="bg-white p-6 rounded-md shadow-md border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {activeTab}
              </h2>

              {activeTab === "Profile" && !isLoading && user ? (
                <div className="space-y-4 text-sm text-gray-700">
                  <div className="flex items-center gap-3">
                    <Image
                      src={user?.avatar || 'https://ik.imagekit.io/nextbuy/avatar/images.png?updatedAt=1765397806718'}
                      alt=""
                      width={60}
                      height={60}
                      className='w-16 h-16 rounded-full border border-gray-200'
                    />
                    <button className='text-blue-600 font-medium flex items-center gap-1'>
                      <Pencil className='w-4 h-4' /> Change Photo
                    </button>
                  </div>
                  <p> 
                    <span className="font-medium">Name:</span> {user.name}
                  </p>
                  <p> 
                    <span className="font-medium">Email:</span> {user.email}
                  </p>
                  <p>
                    <span className="font-medium">Joined On:</span> {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-medium">Earned Points:</span> {""}
                    {user.points || 0}
                  </p>
                </div>
              ) : activeTab === "My Orders" ? (
                <MyOrdersTable orders={orders} isLoading={ordersLoading} />
              ) : activeTab === "Shipping Addresses" ? (
                <ShippingAddressSection />
              ) : (
                <div className="text-gray-500 text-center py-8">
                  {activeTab} content coming soon...
                </div>
              )}
            </div>
          </div>

          {/* Right Quick Panel */}
          <div className='w-full md:w-1/4 space-y-4'>
            <QuickActionCard 
              title="Referral Program"
              Icon={Gift}
              description="Invite friends and earn rewards."
            />
            <QuickActionCard 
              title="Your Badges"
              Icon={BadgeCheck}
              description="View your earned achievements."
            />
            <QuickActionCard 
              title="Account Settings"
              Icon={Settings}
              description="Manage preferences and security."
            />
            <QuickActionCard 
              title="Billing History"
              Icon={CreditCard}
              description="Check your recent payments."
            />
            <QuickActionCard 
              title="Support Center"
              Icon={HelpCircle}
              description="Need help? Contact support."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;

const NavItem = ({ label, Icon, active, danger, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm
      ${
        active
          ? "bg-blue-100 text-blue-600"
          : danger
          ? "text-red-500 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-100"
      }
    `}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const MyOrdersTable = ({ orders, isLoading }: { orders: any[], isLoading: boolean }) => {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'paid') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (statusLower === 'pending') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    if (statusLower === 'failed' || statusLower === 'cancelled') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No orders found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order ID</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total ($)</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order: any) => (
            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-sm text-gray-700 font-mono">
                {String(order.id).slice(-6).toUpperCase()}
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(order.status)}`}>
                  {order.status || 'Pending'}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-gray-700 font-semibold">
                ${Number(order.total || 0).toFixed(2)}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {formatDate(order.createdAt)}
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => router.push(`/order/${order.id}`)}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                >
                  Track Order <Truck className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
