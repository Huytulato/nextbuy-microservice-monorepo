'use client'
import React from 'react';
import SidebarItem from './sidebar.item';
import { useSidebar } from '../../../hooks/useSidebar';
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Package,
  Calendar,
  Users,
  Store,
  FileText,
  Settings,
  Bell,
  Sliders,
  LogOut,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface MenuSection {
  title?: string;
  items: {
    title: string;
    icon: React.ReactNode;
    href: string;
  }[];
}

const SidebarMenu = () => {
  const { isActive } = useSidebar();

  const menuSections: MenuSection[] = [
    {
      items: [
        {
          title: 'Dashboard',
          icon: <LayoutDashboard size={20} />,
          href: '/dashboard',
        },
      ],
    },
    {
      title: 'Main Menu',
      items: [
        {
          title: 'Orders',
          icon: <ShoppingBag size={20} />,
          href: '/dashboard/orders',
        },
        {
          title: 'Payments',
          icon: <CreditCard size={20} />,
          href: '/dashboard/payments',
        },
        {
          title: 'Products',
          icon: <Package size={20} />,
          href: '/dashboard/products',
        },
        {
          title: 'Events',
          icon: <Calendar size={20} />,
          href: '/dashboard/events',
        },
        {
          title: 'Users',
          icon: <Users size={20} />,
          href: '/dashboard/users',
        },
        {
          title: 'Sellers',
          icon: <Store size={20} />,
          href: '/dashboard/sellers',
        },
      ],
    },
    {
      title: 'Moderation',
      items: [
        {
          title: 'Pending Sellers',
          icon: <Clock size={20} />,
          href: '/dashboard/pending-sellers',
        },
        {
          title: 'Pending Products',
          icon: <CheckCircle2 size={20} />,
          href: '/dashboard/pending-products',
        },
      ],
    },
    {
      title: 'Controllers',
      items: [
        {
          title: 'Loggers',
          icon: <FileText size={20} />,
          href: '/dashboard/loggers',
        },
        {
          title: 'Management',
          icon: <Settings size={20} />,
          href: '/dashboard/management',
        },
        {
          title: 'Notifications',
          icon: <Bell size={20} />,
          href: '/dashboard/notifications',
        },
      ],
    },
    {
      title: 'Customization',
      items: [
        {
          title: 'All Customization',
          icon: <Sliders size={20} />,
          href: '/dashboard/customization',
        },
      ],
    },
    // Logout is handled separately in Sidebar component
  ];

  return (
    <div className="flex flex-col gap-1">
      {menuSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-2">
          {section.title && (
            <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {section.title}
            </h3>
          )}
          <div className="space-y-0">
            {section.items.map((item, itemIndex) => (
              <SidebarItem
                key={itemIndex}
                title={item.title}
                icon={item.icon}
                href={item.href}
                isActive={isActive(item.href)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SidebarMenu;
