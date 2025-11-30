'use client'
import Link from 'next/link'
import React from 'react'
import { Search, User } from 'lucide-react'
import HeartIcon from '../../assets/svg/Heart-icon'
import CartIcon from '../../assets/svg/Cart-icon'
import HeaderBottom from './header-bottom'
import useUser from '../../hooks/useUser'
import useWishlistCount from '../../hooks/useWishlistCount'
import useCartCount from '../../hooks/useCartCount'


const Header = () => {
  const wishlistCount = useWishlistCount();
  const cartCount = useCartCount();
  const {user, isLoading} = useUser();

  return (
    <header className='w-full h-16 bg-red-700 shadow-md'>
      <div className='max-w-[1400px] h-full px-4 md:px-6 lg:px-8 mx-auto flex items-center justify-between gap-4'>
        {/* Logo */}
        <Link href={'/'} className='flex-shrink-0'>
          <span className='text-2xl md:text-3xl font-bold tracking-wide text-white hover:text-[#ffbf34] transition-colors duration-200'>
            NextBuy
          </span>
        </Link>

        {/* Search Bar */}
        <div className='flex-1 max-w-2xl relative'>
          <input 
            type="text" 
            placeholder='Search for products, brands and more' 
            className='w-full h-10 rounded-full pl-5 pr-12 text-gray-800 placeholder-gray-400 border-2 border-[#ffbf34] focus:ring-2 focus:ring-[#ffbf34] focus:outline-none transition-all duration-200'
          />
          <button 
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#ffbf34] rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#e6ac2f] transition-colors duration-200"
            aria-label="Search"
          >
            <Search size={18} className="text-white" />
          </button>
        </div>

        {/* User Actions */}
        <div className='flex items-center gap-4 md:gap-6 flex-shrink-0'>
          {!isLoading && user ? (
            <Link 
              href={'/profile'} 
              className='hidden md:flex items-center gap-3 group'
            >
              <div className='border border-white group-hover:border-[#ffbf34] rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200'>
                <User size={22} className='text-white group-hover:text-[#ffbf34] transition-colors duration-200' />
              </div>
              <div className='text-white group-hover:text-[#ffbf34] transition-colors duration-200'>
                <span className='block text-sm font-medium'>Hello,</span>
                <span className='block text-sm font-semibold'>{user?.name?.split(' ')[0]}</span>
              </div>
            </Link>
          ) : (
            <Link 
              href={'/login'} 
              className='hidden md:flex items-center gap-3 group'
            >
              <div className='border border-white group-hover:border-[#ffbf34] rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200'>
                <User size={22} className='text-white group-hover:text-[#ffbf34] transition-colors duration-200' />
              </div>
              <div className='text-white group-hover:text-[#ffbf34] transition-colors duration-200'>
                <span className='block text-sm font-medium'>Hello,</span>
                <span className='block text-sm font-semibold'>{isLoading ? '...' : 'Sign In'}</span>
              </div>
            </Link>
          )}

          {/* Mobile Sign In Icon */}
          <Link 
            href={user ? '/profile' : '/login'} 
            className='md:hidden border border-white hover:border-[#ffbf34] rounded-full w-10 h-10 flex items-center justify-center group'
            aria-label={user ? `Profile (${user.name})` : 'Sign In'}
          >
            <User size={22} className='text-white group-hover:text-[#ffbf34] transition-colors duration-200' />
          </Link>

          {/* Wishlist */}
          <Link 
            href={'/wishlist'} 
            className='relative group'
            aria-label={`Wishlist (${wishlistCount} items)`}
          >
            <HeartIcon 
              width={24} 
              height={24} 
              stroke="white" 
              className='group-hover:stroke-[#ffbf34] transition-colors duration-200'
            />
            <span className="absolute -top-2 -right-2 w-5 h-5 border-2 border-white rounded-full flex items-center justify-center text-xs font-semibold bg-red-700 text-white">
              {wishlistCount > 9 ? '9+' : wishlistCount}
            </span>
          </Link>

          {/* Cart */}
          <Link 
            href={'/cart'} 
            className='relative group'
            aria-label={`Cart (${cartCount} items)`}
          >
            <CartIcon 
              width={24} 
              height={24} 
              stroke="white" 
              className='group-hover:stroke-[#ffbf34] transition-colors duration-200'
            />
            <span className="absolute -top-2 -right-2 w-5 h-5 border-2 border-white rounded-full flex items-center justify-center text-xs font-semibold bg-red-700 text-white">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          </Link>
        </div>
      </div>
      <div className = "border-t border-red-600">
        <HeaderBottom />
      </div>
    </header>
  )
}

export default Header