import React from "react";
import { Controller, useFieldArray } from "react-hook-form";
import Input from "../input";
import { PlusCircle, Trash, Package } from "lucide-react";

const CustomProperties = ({ control, errors }: any) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "custom_properties",
  });

  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Package size={20} className="text-indigo-500" />
        <label className="block font-semibold text-gray-700">
          Custom Properties
        </label>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Add custom product properties like Size, Material, Weight, etc.
      </p>
      
      <div className="flex flex-col gap-4">
        {fields?.map((item, index) => (
          <div 
            key={item.id} 
            className="flex gap-3 items-end p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex-1">
              <Controller
                name={`custom_properties.${index}.property`}
                control={control}
                rules={{ required: "Property name is required" }}
                render={({ field }) => (
                  <Input
                    label="Property Name"
                    placeholder="e.g., Size, Material, Weight"
                    {...field}
                  />
                )}
              />
              {errors?.custom_properties?.[index]?.property && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.custom_properties[index].property.message}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Controller
                name={`custom_properties.${index}.value`}
                control={control}
                rules={{ required: "Property value is required" }}
                render={({ field }) => (
                  <Input
                    label="Property Value"
                    placeholder="e.g., XL, Cotton, 500g"
                    {...field}
                  />
                )}
              />
              {errors?.custom_properties?.[index]?.value && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.custom_properties[index].value.message}
                </p>
              )}
            </div>
            {/* Nút xóa */}
            <button
              type="button"
              onClick={() => remove(index)}
              className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors border border-red-200 hover:border-red-500"
              title="Remove property"
            >
              <Trash size={18} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => append({ property: "", value: "" })}
          className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-all font-medium"
        >
          <PlusCircle size={18} />
          Add Property
        </button>
      </div>
      
      {errors.custom_properties?.root && (
        <p className="text-red-600 text-sm mt-2">
          {errors.custom_properties.root.message as string}
        </p>
      )}
    </div>
  );
};

export default CustomProperties;