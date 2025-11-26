import React from 'react';

interface CartIconProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  itemCount?: number;
  size?: number;
}

const CartIcon: React.FC<CartIconProps> = ({
  width = 24,
  height = 24,
  fill = 'none',
  stroke = 'currentColor',
  strokeWidth = 2,
  className = '',
  itemCount,
}) => {
  return (
    <div className="relative inline-block">
      <svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill={fill}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M9 2L7 6"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 6L15 2"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M1 6H23L21 18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18L1 6Z"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="9"
          cy="22"
          r="1"
          fill={stroke}
        />
        <circle
          cx="18"
          cy="22"
          r="1"
          fill={stroke}
        />
      </svg>
      {itemCount !== undefined && itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </div>
  );
};

export default CartIcon;