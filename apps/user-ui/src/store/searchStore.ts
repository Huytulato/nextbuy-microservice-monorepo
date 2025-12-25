'use client'
import { atom } from 'jotai'

// Atom để lưu từ khóa tìm kiếm hiện tại
export const searchQueryAtom = atom<string>('')

// Atom để lưu lịch sử tìm kiếm (lưu trong localStorage)
export const searchHistoryAtom = atom<string[]>([])

// Atom để hiển thị/ẩn dropdown autocomplete
export const showSearchDropdownAtom = atom<boolean>(false)

// Atom để quản lý trạng thái focus của search input
export const searchInputFocusedAtom = atom<boolean>(false)

// Helper functions để làm việc với localStorage
export const SEARCH_HISTORY_KEY = 'nextbuy_search_history'
export const MAX_SEARCH_HISTORY = 10

/**
 * Thêm từ khóa vào lịch sử tìm kiếm
 */
export const addToSearchHistory = (query: string): string[] => {
  if (!query || query.trim().length < 2) return []
  
  const history = getSearchHistory()
  const newHistory = [query, ...history.filter(item => item !== query)].slice(0, MAX_SEARCH_HISTORY)
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
  }
  
  return newHistory
}

/**
 * Lấy lịch sử tìm kiếm từ localStorage
 */
export const getSearchHistory = (): string[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY)
    return history ? JSON.parse(history) : []
  } catch {
    return []
  }
}

/**
 * Xóa một item khỏi lịch sử tìm kiếm
 */
export const removeFromSearchHistory = (query: string): string[] => {
  const history = getSearchHistory()
  const newHistory = history.filter(item => item !== query)
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
  }
  
  return newHistory
}

/**
 * Xóa toàn bộ lịch sử tìm kiếm
 */
export const clearSearchHistory = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SEARCH_HISTORY_KEY)
  }
}
