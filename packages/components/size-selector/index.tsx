import React from "react";
import {
  Controller,
  Control,
  FieldErrors,
} from "react-hook-form";

const sizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

interface SizeSelectorProps {
  control: Control<any>;
  errors: FieldErrors;
}

const SizeSelector: React.FC<SizeSelectorProps> = ({ control, errors }) => {
  return (
    <div className="mt-2">
      <label className="block font-semibold text-gray-800 mb-1">
        Sizes
      </label>

      <Controller
        name="sizes"
        control={control}
        render={({ field }) => {
          const value: string[] = field.value || [];

          const toggleSize = (size: string) => {
            let newValue: string[];
            if (value.includes(size)) {
              newValue = value.filter((s) => s !== size);
            } else {
              newValue = [...value, size];
            }
            field.onChange(newValue);
          };

          return (
            <>
              <div className="flex gap-2 flex-wrap">
                {sizes.map((size) => {
                  const isSelected = value.includes(size);

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={
                        "px-3 py-1.5 rounded-full text-sm border transition-all " +
                        (isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
                      }
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {errors?.sizes && (
                <p className="text-red-500 text-sm mt-1">
                  {(errors.sizes as any).message}
                </p>
              )}
            </>
          );
        }}
      />
    </div>
  );
};

export default SizeSelector;
