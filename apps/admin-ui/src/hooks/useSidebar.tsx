'use client'
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export const useSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  return {
    isOpen,
    toggleSidebar,
    isActive,
  };
};
