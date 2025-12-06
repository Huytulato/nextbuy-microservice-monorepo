import React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react"; // Icon túi sắm

type Props = {
  width?: number;
  height?: number;
  textSize?: string;
};

const Logo = ({ width = 30, height = 30, textSize = "text-2xl" }: Props) => {
  return (
    // Đổi <Link> thành <div>
    <div className="flex items-center gap-2 cursor-pointer"> 
      {/* Phần Icon */}
      <div className="bg-blue-600 p-2 rounded-lg flex items-center justify-center">
         <ShoppingBag />
      </div>
      {/* Phần Text (nếu có) */}
    </div>
  );
};

export default Logo;