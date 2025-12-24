import Link from "next/link";
import React from "react";

interface Props {
  title: string;
  icon: React.ReactNode;
  isActive?: boolean;
  href: string;
}

const SidebarItem = ({ icon, title, isActive, href }: Props) => {
  return (
    <Link href={href} className="my-1 block">
      <div
        className={`flex gap-3 w-full min-h-12 h-full items-center px-4 rounded-lg transition-colors ${
          isActive
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <div className={isActive ? "text-white" : "text-gray-600"}>
          {icon}
        </div>
        <h5 className={`text-base font-medium ${isActive ? "text-white" : "text-gray-700"}`}>
          {title}
        </h5>
      </div>
    </Link>
  );
};

export default SidebarItem;