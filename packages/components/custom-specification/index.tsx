import React from "react";
import { Controller, useFieldArray } from "react-hook-form";
import Input from "../input";
import { PlusCircle, Trash, Settings } from "lucide-react";

const CustomSpecifications = ({ control, errors }: any) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "custom_specifications",
  });

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={20} className="text-emerald-500" />
        <label className="block font-semibold text-gray-700">
          Custom Specifications
        </label>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Add technical specifications like Battery Life, Weight, Material, etc.
      </p>

      <div className="flex flex-col gap-4">
        {fields?.map((item, index) => (
          <div 
            key={item.id} 
            className="flex gap-3 items-end p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex-1">
              <Controller
                name={`custom_specifications.${index}.name`}
                control={control}
                rules={{ required: "Specification name is required" }}
                render={({ field }) => (
                  <Input
                    label="Specification Name"
                    placeholder="e.g., Battery Life, Weight, Material"
                    {...field}
                  />
                )}
              />
              {errors?.custom_specifications?.[index]?.name && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.custom_specifications[index].name.message}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Controller
                name={`custom_specifications.${index}.value`}
                control={control}
                rules={{ required: "Specification value is required" }}
                render={({ field }) => (
                  <Input
                    label="Specification Value"
                    placeholder="e.g., 10 hours, 1.5 kg, Aluminum"
                    {...field}
                  />
                )}
              />
              {errors?.custom_specifications?.[index]?.value && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.custom_specifications[index].value.message}
                </p>
              )}
            </div>
            {/* Nút xóa */}
            <button
              type="button"
              onClick={() => remove(index)}
              className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors border border-red-200 hover:border-red-500"
              title="Remove specification"
            >
              <Trash size={18} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => append({ name: "", value: "" })}
          className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all font-medium"
        >
          <PlusCircle size={18} />
          Add Specification
        </button>
      </div>
      
      {errors.custom_specifications?.root && (
        <p className="text-red-600 text-sm mt-2">
          {errors.custom_specifications.root.message as string}
        </p>
      )}
    </div>
  );
};

export default CustomSpecifications;
