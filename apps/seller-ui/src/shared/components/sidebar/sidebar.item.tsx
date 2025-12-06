import Link from 'next/link'
import React from 'react'

interface Props {
  title: string;
  icon: React.ReactNode;
  isActive?: boolean;
  href: string;
}

const SidebarItem = ({ title, icon, isActive, href }: Props) => {
  return (
    <Link href={href} className='my-2 block'>
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-200 
        ${isActive 
            ? 'bg-blue-50' // Nền xanh nhạt khi chọn (thay vì xám đục)
            : 'hover:bg-gray-100' // Hover nhẹ nhàng
        }`}
      >
        {icon}
        <h5 className={`text-sm ${
                    isActive 
                        ? 'font-bold text-blue-700' // Chữ xanh đậm khi chọn
                        : 'font-medium text-gray-700' // Chữ xám đậm khi chưa chọn (Rất rõ nét)
                }`}>
            {title}
        </h5>
      </div>
    </Link>
  )
}

export default SidebarItem