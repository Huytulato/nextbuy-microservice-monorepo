import React from 'react';

type StatusType = 'paid' | 'pending' | 'failed' | 'active' | 'inactive' | 'approved' | 'rejected';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusStyles = (status: string) => {
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus === 'paid' || lowerStatus === 'active' || lowerStatus === 'approved') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (lowerStatus === 'pending') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    if (lowerStatus === 'failed' || lowerStatus === 'inactive' || lowerStatus === 'rejected') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(status)} ${className}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
};

export default StatusBadge;
