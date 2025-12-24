import React from 'react';

type DeliveryStatus = 'ordered' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered';

const DELIVERY_STEPS: { key: DeliveryStatus; label: string }[] = [
  { key: 'ordered', label: 'Ordered' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

interface OrderTrackingStepperProps {
  currentStatus: DeliveryStatus | string;
}

const OrderTrackingStepper: React.FC<OrderTrackingStepperProps> = ({ currentStatus }) => {
  const status = (currentStatus || 'ordered') as DeliveryStatus;
  const activeStepIndex = Math.max(0, DELIVERY_STEPS.findIndex((s) => s.key === status));

  return (
    <div className="w-full py-6">
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
          <div
            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${(activeStepIndex / (DELIVERY_STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {DELIVERY_STEPS.map((step, index) => {
            const isActive = index <= activeStepIndex;
            const isCurrent = index === activeStepIndex;

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {isActive && (
                    <div className="w-3 h-3 rounded-full bg-white" />
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-3 text-center">
                  <p
                    className={`text-xs font-medium ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingStepper;

