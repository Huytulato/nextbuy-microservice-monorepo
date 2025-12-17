import React from "react";

const QuickActionCard = ({ Icon, title, description }: any) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-sm border border-gray-100 flex gap-3">
      <Icon className="w-6 h-6 text-blue-500 mt-1" />

      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">
          {title}
        </h4>
        <p className="text-sm text-gray-600">
          {description}
        </p>
      </div>
    </div>
  );
};

export default QuickActionCard;
