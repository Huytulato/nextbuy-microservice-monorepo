'use client'
import React, { useEffect, useState } from 'react'
import { AlignLeft, ChevronDown} from 'lucide-react';
import Link from 'next/link';
import { navItems } from '../../configs/constants';
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
    <div className={`w-full transition-all duration-300 ${isSticky?"fixed top-0 left-0 z-[100] bg-white shadow-lg" : "relative"}`}>
      <div className={`w-[80%] relative m-auto flex items-center justify-between ${isSticky?"pt-3":"py-0"}`}>
        {/*All dropdown*/}
        <div className={`w-[260px] ${isSticky && '-mb-2'} cursor-pointer flex items-center justify-between px-5 h-[50px] bg-[#ffbf34]`} 
        onClick={()=>setShow(!show)}>
          <div className='flex items-center gap-2'>
            <AlignLeft color="white" />
            <span className='text-white font-medium'>All Departments</span>
          </div>
          <ChevronDown color="white" />
        </div>

        {/*Dropdown menu*/}
        {show && (
          <div className={`absolute top-full left-0 w-[260px] bg-white shadow-lg rounded-b-lg overflow-hidden ${isSticky && 'shadow-none'}`}>
            <div className='p-4'>
              <h3 className='text-lg font-medium'>All Departments</h3>
            </div>
          </div>
        )}

        {/*Navigation Links*/}
        <div className='flex items-center gap-4'>
          {navItems.map((i: NavItemTypes, index: number) => (
            <Link 
              className='text-gray-700 hover:text-yellow-600 font-bold transition-colors duration-200' 
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
                <div className='border border-gray-300 group-hover:border-[#ffbf34] rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200'>
                  <User size={22} className='text-gray-700 group-hover:text-[#ffbf34] transition-colors duration-200' />
                </div>
                <div className='text-gray-700 group-hover:text-[#ffbf34] transition-colors duration-200'>
                  <span className='block text-sm font-medium'>Hello,</span>
                  <span className='block text-sm font-semibold'>{user?.name?.split(' ')[0]}</span>
                </div>
              </Link>
            ) : (
              <Link 
                href={'/login'} 
                className='hidden md:flex items-center gap-3 group'
              >
                <div className='border border-gray-300 group-hover:border-[#ffbf34] rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200'>
                  <User size={22} className='text-gray-700 group-hover:text-[#ffbf34] transition-colors duration-200' />
                </div>
                <div className='text-gray-700 group-hover:text-[#ffbf34] transition-colors duration-200'>
                  <span className='block text-sm font-medium'>Hello,</span>
                  <span className='block text-sm font-semibold'>{isLoading ? '...' : 'Sign In'}</span>
                </div>
              </Link>
            )}

            {/* Mobile Auth Icon */}
            <Link 
              href={user ? '/profile' : '/login'} 
              className='md:hidden border border-gray-300 hover:border-[#ffbf34] rounded-full w-10 h-10 flex items-center justify-center group'
              aria-label={user ? `Profile (${user.name})` : 'Sign In'}
            >
              <User size={22} className='text-gray-700 group-hover:text-[#ffbf34] transition-colors duration-200' />
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
                stroke='#374151' 
                className='group-hover:stroke-[#ffbf34] transition-colors duration-200'
              />
              <span className='absolute -top-2 -right-2 w-5 h-5 border-2 border-gray-700 rounded-full flex items-center justify-center text-xs font-semibold bg-red-700 text-gray-700'>
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
                stroke='#374151' 
                className='group-hover:stroke-[#ffbf34] transition-colors duration-200'
              />
              <span className='absolute -top-2 -right-2 w-5 h-5 border-2 border-gray-700 rounded-full flex items-center justify-center text-xs font-semibold bg-red-700 text-gray-700'>
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