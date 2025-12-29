/**
 * Variation Matrix Component
 * Displays a grid for managing product variations with individual prices and stock
 */

'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Input from '../input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, X, AlertCircle, Trash2, Layers } from 'lucide-react';

export interface VariationGroup {
  name: string;
  options: string[];
}

export interface Variation {
  sku: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
}

interface VariationMatrixProps {
  groups?: VariationGroup[];
  variations?: Variation[];
  basePrice?: number;
  baseStock?: number;
  onChange?: (data: { groups: VariationGroup[]; variations: Variation[] }) => void;
}

/**
 * Generate Cartesian product of arrays
 */
function cartesianProduct(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map(item => [item]);

  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);

  return first.flatMap(item =>
    restProduct.map(combination => [item, ...combination])
  );
}

export function VariationMatrix({ 
  groups = [], 
  variations = [], 
  basePrice = 0, 
  baseStock = 0, 
  onChange 
}: VariationMatrixProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [newOptionValues, setNewOptionValues] = useState<Record<number, string>>({});
  const [error, setError] = useState<string>('');

  // Helper to notify parent of changes
  const notifyChange = useCallback((newGroups: VariationGroup[], newVariations: Variation[]) => {
    onChange?.({ groups: newGroups, variations: newVariations });
  }, [onChange]);

  // Generate variations when groups change
  // We only regenerate if the structure of groups changes (options added/removed)
  // We try to preserve existing variation data (price/stock) if the SKU/attributes match
  const regenerateVariations = useCallback((currentGroups: VariationGroup[]) => {
    if (currentGroups.length === 0) {
      return [];
    }

    try {
      const optionArrays = currentGroups.map(g => g.options);
      // If any group has no options, we can't generate variations yet
      if (optionArrays.some(arr => arr.length === 0)) {
        return [];
      }

      const combinations = cartesianProduct(optionArrays);

      const newVariations: Variation[] = combinations.map(combination => {
        const attributes: Record<string, string> = {};
        currentGroups.forEach((group, index) => {
          attributes[group.name] = combination[index];
        });

        // Generate a consistent SKU key based on attributes
        // e.g. COLOR-RED-SIZE-S
        const skuKey = Object.entries(attributes)
          .sort(([k1], [k2]) => k1.localeCompare(k2))
          .map(([k, v]) => `${k.toUpperCase()}-${v.toUpperCase()}`)
          .join('-');
        
        const sku = `VAR-${skuKey.replace(/[^A-Z0-9-]/g, '')}`;

        // Try to find existing variation to preserve price/stock
        const existing = variations.find(v => {
            // Simple check: do attributes match?
            return Object.entries(attributes).every(([k, val]) => v.attributes[k] === val);
        });

        return {
          sku: existing?.sku || sku,
          attributes,
          price: existing?.price ?? basePrice,
          stock: existing?.stock ?? baseStock,
        };
      });

      if (newVariations.length > 100) {
        setError(`Too many variations (${newVariations.length}). Maximum is 100. Please reduce options.`);
        return [];
      } else {
        setError('');
        return newVariations;
      }
    } catch (err: any) {
      setError(`Error generating variations: ${err.message}`);
      return [];
    }
  }, [basePrice, baseStock, variations]);

  const addVariationGroup = () => {
    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    // Check if group already exists
    if (groups.some(g => g.name.toLowerCase() === newGroupName.toLowerCase())) {
      setError('Group name already exists');
      return;
    }

    const newGroups = [...groups, { name: newGroupName, options: [] }];
    setNewGroupName('');
    setError('');
    
    // No variations generated yet as no options
    notifyChange(newGroups, []);
  };

  const removeGroup = (groupIndex: number) => {
    const newGroups = groups.filter((_, i) => i !== groupIndex);
    const newVars = regenerateVariations(newGroups);
    notifyChange(newGroups, newVars);
  };

  const addOptionToGroup = (groupIndex: number) => {
    const optionValue = newOptionValues[groupIndex]?.trim();
    if (!optionValue) {
      return;
    }

    const group = groups[groupIndex];
    
    // Check if option already exists
    if (group.options.some(opt => opt.toLowerCase() === optionValue.toLowerCase())) {
      setError('Option already exists in this group');
      return;
    }

    const newGroups = [...groups];
    newGroups[groupIndex] = {
        ...group,
        options: [...group.options, optionValue]
    };

    setNewOptionValues({ ...newOptionValues, [groupIndex]: '' });
    setError('');

    const newVars = regenerateVariations(newGroups);
    notifyChange(newGroups, newVars);
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const newGroups = [...groups];
    const group = newGroups[groupIndex];
    const newOptions = group.options.filter((_, i) => i !== optionIndex);
    
    newGroups[groupIndex] = { ...group, options: newOptions };
    
    const newVars = regenerateVariations(newGroups);
    notifyChange(newGroups, newVars);
  };

  const updateVariationPrice = (index: number, price: number) => {
    const newVariations = [...variations];
    newVariations[index] = { ...newVariations[index], price };
    notifyChange(groups, newVariations);
  };

  const updateVariationStock = (index: number, stock: number) => {
    const newVariations = [...variations];
    newVariations[index] = { ...newVariations[index], stock };
    notifyChange(groups, newVariations);
  };

  const updateVariationSku = (index: number, sku: string) => {
    const newVariations = [...variations];
    newVariations[index] = { ...newVariations[index], sku };
    notifyChange(groups, newVariations);
  };

  const applyPriceToAll = () => {
    if (variations.length > 0) {
      // Use the price of the first variation or basePrice
      const targetPrice = variations[0].price || basePrice;
      const newVariations = variations.map(v => ({ ...v, price: targetPrice }));
      notifyChange(groups, newVariations);
    }
  };

  const applyStockToAll = () => {
    if (variations.length > 0) {
      const targetStock = variations[0].stock || baseStock;
      const newVariations = variations.map(v => ({ ...v, stock: targetStock }));
      notifyChange(groups, newVariations);
    }
  };

  const totalStock = variations.reduce((sum, v) => sum + (v.stock || 0), 0);

  return (
    <div className="space-y-6 border rounded-lg p-6 bg-gray-50">
      <div>
        <label className="text-lg font-semibold">Product Variations</label>
        <p className="text-sm text-gray-600 mt-1">
          Add variation groups like Color, Size, Material to create multiple SKUs
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative flex items-center gap-2" role="alert">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Variation Group */}
      <div className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <label htmlFor="groupName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Group Name</label>
            <Input
                id="groupName"
                placeholder="e.g. Color, Size"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                disabled={groups.length >= 3} // Limit to 3 groups for sanity
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addVariationGroup();
                    }
                }}
            />
          </div>
          <Button 
            type="button" 
            onClick={addVariationGroup}
            disabled={groups.length >= 3 || !newGroupName.trim()}
            variant="secondary"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Group
          </Button>
        </div>

        {/* Display existing groups */}
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="border rounded-md p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="font-bold text-base">{group.name}</label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => removeGroup(groupIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {group.options.map((option, optionIndex) => (
                <Badge key={optionIndex} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-1">
                  {option}
                  <button
                    type="button"
                    onClick={() => removeOption(groupIndex, optionIndex)}
                    className="ml-1 hover:text-red-600 rounded-full p-0.5 hover:bg-red-100 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2 max-w-sm">
              <Input
                placeholder={`Add ${group.name} option...`}
                value={newOptionValues[groupIndex] || ''}
                onChange={(e) => setNewOptionValues({ ...newOptionValues, [groupIndex]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addOptionToGroup(groupIndex);
                  }
                }}
                className="h-8"
              />
              <Button 
                type="button" 
                onClick={() => addOptionToGroup(groupIndex)}
                variant="outline"
                size="sm"
                className="h-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Variation Matrix Table */}
      {variations.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
            <div>
              <h3 className="font-semibold text-lg">Variation List</h3>
              <p className="text-sm text-gray-500">{variations.length} variations generated</p>
            </div>
            <div className="flex gap-2">
               <div className="text-right mr-4">
                    <p className="text-sm font-medium text-gray-500">Total Stock</p>
                    <p className="text-xl font-bold">{totalStock}</p>
               </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Variation</th>
                    <th className="px-4 py-3 font-medium w-48">SKU</th>
                    <th className="px-4 py-3 font-medium w-32">
                        Price
                        <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={applyPriceToAll} title="Apply first price to all">
                            <Layers className="h-3 w-3" />
                        </Button>
                    </th>
                    <th className="px-4 py-3 font-medium w-32">
                        Stock
                        <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={applyStockToAll} title="Apply first stock to all">
                            <Layers className="h-3 w-3" />
                        </Button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {variations.map((variation, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                            {groups.map(g => (
                                <Badge key={g.name} variant="outline" className="mr-1">
                                    {g.name}: {variation.attributes[g.name]}
                                </Badge>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={variation.sku}
                          onChange={(e) => updateVariationSku(index, e.target.value)}
                          className="h-8 font-mono text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                            type="number"
                            min="0"
                            value={variation.price}
                            onChange={(e) => updateVariationPrice(index, parseFloat(e.target.value) || 0)}
                            className="h-8 pl-6"
                            />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={variation.stock}
                          onChange={(e) => updateVariationStock(index, parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-400 bg-white">
          <Layers className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No variations added yet.</p>
          <p className="text-sm mt-1">Start by adding a group like "Color" or "Size".</p>
        </div>
      )}
    </div>
  );
}
