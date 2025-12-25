'use client'
import Link from 'next/link'
import React, { useState } from 'react'
import { User, AlignLeft, ChevronDown } from 'lucide-react'
import HeartIcon from '../../assets/svg/Heart-icon'
import CartIcon from '../../assets/svg/Cart-icon'
import HeaderBottom from './header-bottom'
import useUser from '../../hooks/useUser'
import useWishlistCount from '../../hooks/useWishlistCount'
import useCartCount from '../../hooks/useCartCount'
import { navItems, departments } from '../../configs/constants'
import SearchBar from '../components/search/SearchBar'

const Header = () => {
  const wishlistCount = useWishlistCount();
  const cartCount = useCartCount();
  const {user, isLoading} = useUser();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className='w-full bg-red-700 shadow-md'>
      {/* First Row: Logo, Search, User Actions */}
      <div className='max-w-[1400px] h-16 px-4 md:px-6 lg:px-8 mx-auto flex items-center justify-between gap-4'>
        {/* Logo */}
        <Link href={'/'} className='flex-shrink-0'>
          <span className='text-2xl md:text-3xl font-bold tracking-wide text-white hover:text-[#ffbf34] transition-colors duration-200'>
            NextBuy
          </span>
        </Link>

        {/* Search Bar */}
        <SearchBar />

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

      {/* Second Row: Navigation Menu */}
      <div>
        <div className='max-w-[1400px] px-4 md:px-6 lg:px-8 mx-auto flex items-center justify-center gap-4 py-3 relative'>
          {/* All Departments Dropdown */}
          <div 
            className='absolute left-4 md:left-6 lg:left-8 flex-shrink-0 w-[220px] cursor-pointer flex items-center justify-between px-4 h-[50px] bg-[#ffbf34] rounded-md hover:bg-[#e6ac2f] transition-colors duration-200'
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className='flex items-center gap-2'>
              <AlignLeft color="white" size={20} />
              <span className='text-white font-medium text-sm'>All Departments</span>
            </div>
            <ChevronDown color="white" size={18} />
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className='absolute top-full left-4 md:left-6 lg:left-8 w-[250px] bg-white shadow-lg rounded-b-lg overflow-hidden z-50 mt-1'>
              <div className='py-2'>
                {departments.map((dept, index) => (
                  <Link
                    key={index}
                    href={dept.link}
                    className='flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors duration-200'
                    onClick={() => setShowDropdown(false)}
                  >
                    <span className='text-2xl'>{dept.icon}</span>
                    <span className='text-gray-700 font-medium'>{dept.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Links - Centered */}
          <div className='flex items-center gap-4 md:gap-6 justify-center'>
            {navItems.map((item: NavItemTypes, index: number) => (
              <Link 
                className='text-white hover:text-yellow-300 font-bold transition-colors duration-200 text-sm md:text-base' 
                href={item.href} 
                key={index}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Header Bottom */}
      <HeaderBottom />
    </header>
  )
}

export default Header