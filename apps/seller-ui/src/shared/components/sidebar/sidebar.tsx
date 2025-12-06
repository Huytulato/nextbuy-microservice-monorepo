'use client'
import useSeller from 'apps/seller-ui/src/hooks/useSeller';
import useSidebar from 'apps/seller-ui/src/hooks/useSidebar'
import { usePathname } from 'next/navigation';
import React, { use, useEffect } from 'react'
import Box from '../box';
import {Sidebar} from './sidebar.styles'
import Link from 'next/link';
import Logo from 'apps/seller-ui/src/assets/svgs/logo';
import SidebarItem from './sidebar.item';
import Home from 'apps/seller-ui/src/assets/icon/home';
import SidebarMenu from './sidebar.menu';
import {BellPlus, BellRing, CalendarPlus, ListOrdered, LogOut, Mail, PackageSearch, SquarePlus, TicketPercent } from 'lucide-react';

const SidebarBarWrapper = () => {
  const {activeSidebar, setActiveSidebar} = useSidebar();
  const pathName = usePathname();
  const {seller} = useSeller();

  useEffect(() => {
    setActiveSidebar(pathName);
  }, [pathName, setActiveSidebar]);

  const getIconColor = (route: string) => activeSidebar === route ? '#2563EB' : '#4B5563';
  return (
    <Box
      css={{
        height: '100vh',
        borderRight: '1px solid #e5e7eb',
        padding: '16px',
        backgroundColor: '#ffffff',
      }}
    className="sidebar-wrapper"
  >
    <Sidebar.Header>
      <Box>
        <Link href={'/'} className="flex justify-center items-center gap-2">
          <Logo />
          <Box>
            <h3 className="text-xl font-medium text-gray-800"> 
              {seller?.shop?.name}
            </h3>
            <h5 className="text-sm font-normal text-gray-500">
              {seller?.shop?.address}
            </h5>
          </Box>
        </Link>
      </Box>
    </Sidebar.Header>
    <div className='block my-3 h-full'>
      <Sidebar.Body className='body sidebar'>
        <SidebarItem 
          title='Dashboard'
          icon={<Home color={getIconColor('/dashboard')} />}
          isActive={activeSidebar === '/dashboard'}
          href='/dashboard'
        />
        <div className='mt-2 block'>
          <SidebarMenu title='Main Menu'>
            <SidebarItem 
              title='Orders'
              icon={<ListOrdered color={getIconColor('/dashboard/orders')} size={26} />}
              isActive={activeSidebar === '/dashboard/orders'}
              href='/dashboard/orders'
            />
            <SidebarItem 
              title='Payments'
              icon={<ListOrdered color={getIconColor('/dashboard/payments')} size={26} />}
              isActive={activeSidebar === '/dashboard/payments'}
              href='/dashboard/payments'
            />
          </SidebarMenu>
          <SidebarMenu title='Products'>
            <SidebarItem 
              title='Create Product'
              icon={<SquarePlus color={getIconColor('/dashboard/create-product')} size={24} />}
              isActive={activeSidebar === '/dashboard/create-product'}
              href='/dashboard/create-product'
            />
            <SidebarItem 
              title='All Products'
              icon={<PackageSearch color={getIconColor('/dashboard/all-products')} size={24} />}
              isActive={activeSidebar === '/dashboard/all-products'}
              href='/dashboard/all-products'
            />
          </SidebarMenu>       
          <SidebarMenu title='Events'>
            <SidebarItem 
              title='Create Event'
              icon={<CalendarPlus color={getIconColor('/dashboard/create-event')} size={24} />}
              isActive={activeSidebar === '/dashboard/create-event'}
              href='/dashboard/create-event'
            />
            <SidebarItem 
              title='All Events'
              icon={<BellPlus color={getIconColor('/dashboard/all-events')} size={24} />}
              isActive={activeSidebar === '/dashboard/all-events'}
              href='/dashboard/all-events'
            />
          
          </SidebarMenu>      
          <SidebarMenu title='Controllers'>
            <SidebarItem 
              title='Inbox'
              icon={<Mail color={getIconColor('/dashboard/inbox')} size={20} />}
              isActive={activeSidebar === '/dashboard/inbox'}
              href='/dashboard/inbox'
            />
            <SidebarItem 
              title='Notifications'
              icon={<BellRing color={getIconColor('/dashboard/notifications')} size={20} />}
              isActive={activeSidebar === '/dashboard/notifications'}
              href='/dashboard/notifications'
            />          
          </SidebarMenu>   
          <SidebarMenu title='Extras'>
            <SidebarItem 
              title='Discount Codes'
              icon={<TicketPercent color={getIconColor('/dashboard/discount-codes')} size={20} />}
              isActive={activeSidebar === '/dashboard/discount-codes'}
              href='/dashboard/discount-codes'
            />
            <SidebarItem 
              title='Logout'
              icon={<LogOut color={getIconColor('/logout')} size={20} />}
              isActive={activeSidebar === '/logout'}
              href='/'
            />          
          </SidebarMenu>   
        </div>
      </Sidebar.Body>
    </div>
    </Box>
  )
}

export default SidebarBarWrapper