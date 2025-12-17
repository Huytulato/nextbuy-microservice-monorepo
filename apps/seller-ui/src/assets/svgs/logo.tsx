import React from "react";
import { ShoppingBag } from "lucide-react"; // Icon túi sắm

type Props = {
  width?: number;
  height?: number;
};

const Logo = ({ width = 30, height = 30 }: Props) => {
  const size = Math.min(width, height);
  return (
    // Đổi <Link> thành <div>
    <div className="flex items-center gap-2 cursor-pointer"> 
      {/* Phần Icon */}
      <div className="bg-blue-600 p-2 rounded-lg flex items-center justify-center">
         <ShoppingBag size={size} />
      </div>
      {/* Phần Text (nếu có) */}
    </div>
  );
};

export default Logo;