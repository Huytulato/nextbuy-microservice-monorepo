'use client'
import SidebarBarWrapper from 'apps/seller-ui/src/shared/components/sidebar/sidebar'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSeller from 'apps/seller-ui/src/hooks/useSeller'
import { getIncompleteStep } from 'apps/seller-ui/src/utils/registrationSteps'

const Layout = ({children}: {children: React.ReactNode}) => {
  const router = useRouter()
  const { seller, isLoading } = useSeller()

  useEffect(() => {
    // Don't redirect while loading seller data
    if (isLoading) {
      return
    }

    // If seller is not logged in, let the auth system handle it (will redirect to login)
    if (!seller) {
      return
    }

    // Check if there's an incomplete registration step
    const incompleteStep = getIncompleteStep(seller)
    
    if (incompleteStep !== null) {
      // Redirect to signup page with the step parameter
      router.push(`/signup?step=${incompleteStep}`)
    }
  }, [seller, isLoading, router])

  // Show loading state while checking registration status
  if (isLoading) {
    return (
      <div className='flex h-full bg-white min-h-screen items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    )
  }

  // If seller exists but has incomplete steps, show loading while redirecting
  if (seller && getIncompleteStep(seller) !== null) {
    return (
      <div className='flex h-full bg-white min-h-screen items-center justify-center'>
        <div className='text-gray-600'>Redirecting to complete registration...</div>
      </div>
    )
  }

  return (
    <div className='flex h-full bg-white min-h-screen'>
      {/* Sidebar */}
      <aside className='hidden md:block w-72 bg-white border-r border-gray-200'>
        <div className='h-full sticky top-0'>
          <SidebarBarWrapper />
        </div>
      </aside>
      {/* Main Content */}
      <main className='flex-1 p-6 bg-white'>
        <div className='overflow-auto'>
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout