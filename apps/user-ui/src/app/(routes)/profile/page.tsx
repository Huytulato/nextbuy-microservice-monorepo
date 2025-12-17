'use client'
import { useQueryClient } from '@tanstack/react-query';
import useUser from 'apps/user-ui/src/hooks/useUser';
import StatCard from 'apps/user-ui/src/shared/components/cards/stat.card';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { BadgeCheck, Bell, CheckCircle, Clock, CreditCard, Gift, HelpCircle, Inbox, Loader2, Lock, LogOut, Map, Pencil, Settings, ShoppingBag, Truck, User } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import Image from 'next/image';
import QuickActionCard from 'apps/user-ui/src/shared/components/cards/quick-action.card';
import ShippingAddressSection from 'apps/user-ui/src/shared/components/shippingAddress';

const Page = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {user, isLoading} = useUser();
  const queryTab = searchParams.get('active') || 'Profile';  
  const [activeTab, setActiveTab] = useState(queryTab);

  useEffect(() => {
  if (activeTab !== queryTab) {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("active", activeTab);
    router.replace(`/profile?${newParams.toString()}`);
  }
}, [activeTab]);

  const logOutHandler = async () => {
    await axiosInstance.get("/api/logout-user").then((res) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      router.push("/login");
    });
  };
  

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
          </h1>
        </div>

        {/* Profile Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Orders" count = {10} Icon={Clock} />
            <StatCard title="Processing Orders" count = {4} Icon={Truck} />
            <StatCard title="Completed Orders" count = {5} Icon={CheckCircle} />
        </div>
        {/* Sidebar and content layout */}
        <div className="mt-10 flex flex-col md:flex-row gap-6">
          {/* Left Navigation */}
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
                Icon={ShoppingBag}
                active={activeTab === "Notifications"}
                onClick={() => setActiveTab("Notifications")}
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
        {/* Main Content */}
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
          ) : activeTab === "Shipping Addresses" ? (
            <ShippingAddressSection />
          )
          :
          (
            <></>
          )}
        </div>
          {/* Right Quick Panel */}
          <div className='w-full md: w-1/4 space-y-4'>
            <QuickActionCard 
              title="Referral Program"
              Icon = {Gift}
              description="Invite friends and earn points for each successful referral."
            />
            <QuickActionCard 
              title="Your Badges"
              Icon = {BadgeCheck}
              description="View and manage your earned badges and achievements."
            />
            <QuickActionCard 
              title="Account Settings"
              Icon = {Settings}
              description="Manage your account preferences and settings."
            />
            <QuickActionCard 
              title="Billing History"
              Icon = {CreditCard}
              description="View and manage your billing information and payment methods."
            />
            <QuickActionCard 
              title="Support Center"
              Icon = {HelpCircle}
              description="Get assistance and find answers to your questions."
            />
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
