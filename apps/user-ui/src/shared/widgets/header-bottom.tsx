'use client'
import React, { useEffect, useState } from 'react'
import { AlignLeft, ChevronDown} from 'lucide-react';
import Link from 'next/link';
import { navItems, departments } from '../../configs/constants';
import { User } from 'lucide-react';
import HeartIcon from '../../assets/svg/Heart-icon'
import CartIcon from '../../assets/svg/Cart-icon'
import useUser from '../../hooks/useUser';
import useWishlistCount from '../../hooks/useWishlistCount';
import useCartCount from '../../hooks/useCartCount';

const HeaderBottom = () => {
  const wishlistCount = useWishlistCount();
  const cartCount = useCartCount();
  const [show, setShow] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const {user, isLoading} = useUser();

  // Sticky bar reuses auth state to avoid duplicate static Sign In UI

  // Track scroll down 
  useEffect(()=>{
    const handleScroll = () => {
      if(window.scrollY > 100) {
        setIsSticky(true);
      }else {
        setIsSticky(false);
      }
    }
    window.addEventListener("scroll", handleScroll);
    return() => window.removeEventListener("scroll", handleScroll);
  }, [])
  return (
    <div className={`w-full transition-all duration-300 ${isSticky?"fixed top-0 left-0 z-[100] bg-red-700 shadow-lg" : "hidden"}`}>
      <div className={`max-w-[1400px] relative mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4 ${isSticky?"py-3":"py-0"}`}>
        {/*All dropdown*/}
        <div className={`flex-shrink-0 w-[220px] cursor-pointer flex items-center justify-between px-4 h-[50px] bg-[#ffbf34] rounded-md hover:bg-[#e6ac2f] transition-colors duration-200`} 
        onClick={() => setShow(!show)}>
          <div className='flex items-center gap-2'>
            <AlignLeft color="white" size={20} />
            <span className='text-white font-medium text-sm'>All Departments</span>
          </div>
          <ChevronDown color="white" size={18} />
        </div>

        {/*Dropdown menu*/}
        {show && (
          <div className='absolute top-full left-0 w-[250px] bg-white shadow-lg rounded-b-lg overflow-hidden z-50 mt-1'>
            <div className='py-2'>
              {departments.map((dept, index) => (
                <Link
                  key={index}
                  href={dept.link}
                  className='flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors duration-200'
                  onClick={() => setShow(false)}
                >
                  <span className='text-2xl'>{dept.icon}</span>
                  <span className='text-gray-700 font-medium'>{dept.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/*Navigation Links*/}
        <div className='flex items-center gap-4 md:gap-6'>
          {navItems.map((i: NavItemTypes, index: number) => (
            <Link 
              className='text-white hover:text-yellow-300 font-bold transition-colors duration-200 text-sm md:text-base' 
              href={i.href} 
              key={index}
            >
              {i.title}
            </Link>
          ))}
        </div>

        {isSticky && (
          <div className='flex items-center gap-4 md:gap-6 flex-shrink-0'>
            {/* Auth / User */}
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

            {/* Mobile Auth Icon */}
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
                stroke='white' 
                className='group-hover:stroke-[#ffbf34] transition-colors duration-200'
              />
              <span className='absolute -top-2 -right-2 w-5 h-5 border-2 border-white rounded-full flex items-center justify-center text-xs font-semibold bg-red-700 text-white'>
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
                stroke='white' 
                className='group-hover:stroke-[#ffbf34] transition-colors duration-200'
              />
              <span className='absolute -top-2 -right-2 w-5 h-5 border-2 border-white rounded-full flex items-center justify-center text-xs font-semibold bg-red-700 text-white'>
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default HeaderBottom