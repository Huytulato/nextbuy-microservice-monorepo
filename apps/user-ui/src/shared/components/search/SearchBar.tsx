'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Search, Clock, X, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAtom } from 'jotai'
import { useProductSearch } from '../../../hooks/useProductSearch'
import { 
  searchQueryAtom, 
  searchHistoryAtom, 
  showSearchDropdownAtom,
  searchInputFocusedAtom,
  addToSearchHistory, 
  getSearchHistory,
  removeFromSearchHistory 
} from '../../../store/searchStore'

// Danh sách các từ khóa phổ biến
const TRENDING_SEARCHES = [
  'iPhone 15',
  'Laptop Gaming',
  'Wireless Headphones',
  'Smart Watch',
  'Camera 4K'
]

const SearchBar = () => {
  const router = useRouter()
  const [, setQuery] = useAtom(searchQueryAtom)
  const [history, setHistory] = useAtom(searchHistoryAtom)
  const [showDropdown, setShowDropdown] = useAtom(showSearchDropdownAtom)
  const [isFocused, setIsFocused] = useAtom(searchInputFocusedAtom)
  const [inputValue, setInputValue] = useState('')
  
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Lấy kết quả tìm kiếm từ API
  const { data: searchResults, isLoading } = useProductSearch(inputValue, showDropdown && inputValue.length >= 2)

  // Load lịch sử tìm kiếm khi component mount
  useEffect(() => {
    setHistory(getSearchHistory())
  }, [setHistory])

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setShowDropdown, setIsFocused])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setShowDropdown(true)
  }

  const handleSearch = (searchTerm?: string) => {
    const term = searchTerm || inputValue
    if (!term || term.trim().length < 2) return

    const trimmedTerm = term.trim()
    
    // Thêm vào lịch sử
    const newHistory = addToSearchHistory(trimmedTerm)
    setHistory(newHistory)
    
    // Cập nhật query state
    setQuery(trimmedTerm)
    
    // Đóng dropdown
    setShowDropdown(false)
    setIsFocused(false)
    
    // Navigate đến trang search results
    router.push(`/search?q=${encodeURIComponent(trimmedTerm)}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      inputRef.current?.blur()
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
    setShowDropdown(true)
  }

  const handleRemoveHistory = (item: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newHistory = removeFromSearchHistory(item)
    setHistory(newHistory)
  }

  const showHistoryOrTrending = inputValue.length < 2
  const hasSearchResults = searchResults?.products && searchResults.products.length > 0

  return (
    <div ref={searchRef} className='flex-1 max-w-2xl relative'>
      <input 
        ref={inputRef}
        type='text' 
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder='Search for products, brands and more' 
        className='w-full h-10 rounded-full pl-5 pr-12 text-gray-800 placeholder-gray-400 border-2 border-[#ffbf34] focus:ring-2 focus:ring-[#ffbf34] focus:outline-none transition-all duration-200'
      />
      <button 
        onClick={() => handleSearch()}
        className='absolute right-1 top-1/2 -translate-y-1/2 bg-[#ffbf34] rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#e6ac2f] transition-colors duration-200'
        aria-label='Search'
      >
        <Search size={18} className='text-white' />
      </button>

      {/* Dropdown Autocomplete */}
      {showDropdown && (isFocused || inputValue.length >= 2) && (
        <div className='absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[400px] overflow-y-auto z-50'>
          {/* Kết quả tìm kiếm từ API */}
          {inputValue.length >= 2 && (
            <>
              {isLoading && (
                <div className='p-4 text-center text-gray-500'>
                  <div className='animate-spin inline-block w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full'></div>
                  <span className='ml-2'>Searching...</span>
                </div>
              )}
              
              {!isLoading && hasSearchResults && (
                <div>
                  <div className='px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b'>
                    Search Results
                  </div>
                  {searchResults.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.slug}`}
                      onClick={() => {
                        setShowDropdown(false)
                        setIsFocused(false)
                        const newHistory = addToSearchHistory(product.title)
                        setHistory(newHistory)
                      }}
                      className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-150'
                    >
                      <Search size={16} className='text-gray-400 flex-shrink-0' />
                      <span className='text-gray-700 truncate'>{product.title}</span>
                    </Link>
                  ))}
                  {searchResults.products.length >= 10 && (
                    <button
                      onClick={() => handleSearch()}
                      className='w-full px-4 py-3 text-sm text-red-600 hover:bg-gray-50 font-medium text-center border-t'
                    >
                      View all results for "{inputValue}"
                    </button>
                  )}
                </div>
              )}
              
              {!isLoading && !hasSearchResults && (
                <div className='px-4 py-8 text-center text-gray-500'>
                  No results found for "{inputValue}"
                </div>
              )}
            </>
          )}

          {/* Lịch sử tìm kiếm và Trending */}
          {showHistoryOrTrending && (
            <>
              {/* Lịch sử tìm kiếm */}
              {history.length > 0 && (
                <div>
                  <div className='px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center justify-between border-b'>
                    <span className='flex items-center gap-2'>
                      <Clock size={14} />
                      Recent Searches
                    </span>
                  </div>
                  {history.map((item, index) => (
                    <div
                      key={index}
                      className='flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors duration-150 group cursor-pointer'
                      onClick={() => {
                        setInputValue(item)
                        handleSearch(item)
                      }}
                    >
                      <div className='flex items-center gap-3 flex-1'>
                        <Clock size={16} className='text-gray-400 flex-shrink-0' />
                        <span className='text-gray-700'>{item}</span>
                      </div>
                      <button
                        onClick={(e) => handleRemoveHistory(item, e)}
                        className='opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 hover:bg-gray-200 rounded'
                        aria-label='Remove'
                      >
                        <X size={14} className='text-gray-500' />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Trending Searches */}
              <div className={history.length > 0 ? 'border-t' : ''}>
                <div className='px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2 border-b'>
                  <TrendingUp size={14} />
                  Trending Searches
                </div>
                {TRENDING_SEARCHES.map((item, index) => (
                  <div
                    key={index}
                    className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-150 cursor-pointer'
                    onClick={() => {
                      setInputValue(item)
                      handleSearch(item)
                    }}
                  >
                    <TrendingUp size={16} className='text-red-500 flex-shrink-0' />
                    <span className='text-gray-700'>{item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
