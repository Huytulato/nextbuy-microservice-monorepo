import { Controller } from "react-hook-form"
import { useState } from "react"
import { Plus } from "lucide-react";

const defaultColors = [
  "#000000", // Black
  "#FFFFFF", // White
  "#808080", // Gray
  "#FF0000", // Red
  "#FFA500", // Orange
  "#FFFF00", // Yellow
  "#008000", // Green
  "#0000FF", // Blue
  "#800080", // Purple
  "#FFC0CB", // Pink
  "#A52A2A", // Brown
  "#F5F5DC", // Beige
]

const ColorSelector = ({ control, errors}: any) => {
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newColor, setNewColor] = useState("#ffffff");

  return (
    <div className="mb-4">
      <label className="block text-gray-700 text-sm font-bold mb-2">
        Select Color
      </label>
      <Controller
        name="color"
        control={control}
        render={({ field }) => (  
        <div className="flex grap-3 flex-wrap">
          {[...defaultColors, ...customColors].map((color) => {
            const isSelected = (field.value || []) .includes(color);

            return <button key={color} type="button"
            onClick={() => field.onChange(isSelected 
              ? field.value.filter((c: string) => c !== color) 
              : [...(field.value || []), color])}
            className={`w-8 h-8 m-1 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-500' : 'border-gray-300'}`}
            style={{ backgroundColor: color }}/>
          })}

          {/* Add new color */}
          <button
          type="button"
          className="w-8 h-8 m-1 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-500"
          onClick={() => setShowColorPicker(!showColorPicker)}
          >
            <Plus size={16} color="white"/>
          </button>
          {/* Color picker component can be added here */}
          {showColorPicker && (
          <div className="relative flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-10 p-0 border-0 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => {
                setCustomColors([...customColors, newColor]);
                setShowColorPicker(false);
              }}
              className="px-2 py-1 bg-blue-500 text-white rounded"
            >
              Add
            </button>
          </div>
          )}
        </div>
        )} />
    </div>)  
}

export default ColorSelector;