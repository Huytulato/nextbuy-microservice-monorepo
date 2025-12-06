import SidebarBarWrapper from 'apps/seller-ui/src/shared/components/sidebar/sidebar'
import React from 'react'

const Layout = ({children}: {children: React.ReactNode}) => {
  return (
    <div className='flex h-full bg-black min-h-screen'>
      {/* Sidebar */}
      <aside className='hidden md:block w-72 bg-white border-r border-gray-200'>
        <div className='h-full sticky top-0'>
          <SidebarBarWrapper />
        </div>
      </aside>
      {/* Main Content */}
      <main className='flex-1 p-6 bg-gray-50'>
        <div className='overflow-auto'>
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout