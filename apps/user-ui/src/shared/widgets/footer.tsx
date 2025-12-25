'use client'
import Link from 'next/link'
import React from 'react'
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className='w-full bg-gray-900 text-gray-300'>
      {/* Main Footer Content */}
      <div className='max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
          {/* Company Info */}
          <div>
            <h3 className='text-2xl font-bold text-white mb-4'>
              <span className='text-red-500'>Next</span>
              <span className='text-[#ffbf34]'>Buy</span>
            </h3>
            <p className='text-gray-400 mb-4 text-sm leading-relaxed'>
              Your one-stop destination for quality products from trusted sellers. 
              Shop with confidence and enjoy the best deals online.
            </p>
            <div className='flex gap-3'>
              <a 
                href='https://facebook.com' 
                target='_blank' 
                rel='noopener noreferrer'
                className='w-9 h-9 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors duration-200'
                aria-label='Facebook'
              >
                <Facebook size={18} />
              </a>
              <a 
                href='https://twitter.com' 
                target='_blank' 
                rel='noopener noreferrer'
                className='w-9 h-9 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors duration-200'
                aria-label='Twitter'
              >
                <Twitter size={18} />
              </a>
              <a 
                href='https://instagram.com' 
                target='_blank' 
                rel='noopener noreferrer'
                className='w-9 h-9 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors duration-200'
                aria-label='Instagram'
              >
                <Instagram size={18} />
              </a>
              <a 
                href='https://youtube.com' 
                target='_blank' 
                rel='noopener noreferrer'
                className='w-9 h-9 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors duration-200'
                aria-label='Youtube'
              >
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className='text-lg font-semibold text-white mb-4'>Quick Links</h4>
            <ul className='space-y-2'>
              <li>
                <Link href='/products' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  All Products
                </Link>
              </li>
              <li>
                <Link href='/shops' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  All Shops
                </Link>
              </li>
              <li>
                <Link href='/offers' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  Special Offers
                </Link>
              </li>
              <li>
                <a href='http://localhost:4201/login' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  Become a Seller
                </a>
              </li>
              <li>
                <Link href='/cart' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link href='/wishlist' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  My Wishlist
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className='text-lg font-semibold text-white mb-4'>Customer Service</h4>
            <ul className='space-y-2'>
              <li>
                <Link href='/about' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  About Us
                </Link>
              </li>
              <li>
                <Link href='/contact' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href='/faq' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  FAQ
                </Link>
              </li>
              <li>
                <Link href='/shipping' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link href='/returns' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link href='/track-order' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  Track Your Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className='text-lg font-semibold text-white mb-4'>Contact Us</h4>
            <ul className='space-y-3'>
              <li className='flex items-start gap-3'>
                <MapPin size={18} className='text-[#ffbf34] mt-1 flex-shrink-0' />
                <span className='text-gray-400 text-sm'>
                  123 E-commerce Street,<br />
                  Tech District, City 12345
                </span>
              </li>
              <li className='flex items-center gap-3'>
                <Phone size={18} className='text-[#ffbf34] flex-shrink-0' />
                <a href='tel:+1234567890' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  +1 (234) 567-890
                </a>
              </li>
              <li className='flex items-center gap-3'>
                <Mail size={18} className='text-[#ffbf34] flex-shrink-0' />
                <a href='mailto:support@nextbuy.com' className='text-gray-400 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                  support@nextbuy.com
                </a>
              </li>
            </ul>

            {/* Newsletter */}
            <div className='mt-6'>
              <h5 className='text-sm font-semibold text-white mb-2'>Subscribe to Newsletter</h5>
              <div className='flex gap-2'>
                <input 
                  type='email' 
                  placeholder='Your email' 
                  className='flex-1 px-3 py-2 text-sm rounded bg-gray-800 border border-gray-700 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#ffbf34] transition-colors duration-200'
                />
                <button className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm transition-colors duration-200'>
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className='border-t border-gray-800'>
        <div className='max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6'>
          <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
            <p className='text-gray-500 text-sm text-center md:text-left'>
              © {currentYear} NextBuy. All rights reserved.
            </p>
            <div className='flex flex-wrap justify-center gap-4 md:gap-6'>
              <Link href='/privacy' className='text-gray-500 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                Privacy Policy
              </Link>
              <Link href='/terms' className='text-gray-500 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                Terms of Service
              </Link>
              <Link href='/cookies' className='text-gray-500 hover:text-[#ffbf34] transition-colors duration-200 text-sm'>
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
