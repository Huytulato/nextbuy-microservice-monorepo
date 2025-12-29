/**
 * Product Variation Selector Component
 * Fetches and displays available variations for buyers to select
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import axios from 'axios';

interface VariationGroup {
  id: string;
  name: string;
  options: string[];
  position: number;
}

interface Variation {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  isActive: boolean;
  isDeleted: boolean;
}

interface ProductVariationSelectorProps {
  productId: string;
  onVariationSelect?: (variation: Variation | null) => void;
  onPriceChange?: (price: number) => void;
  onStockChange?: (stock: number) => void;
}

export function ProductVariationSelector({
  productId,
  onVariationSelect,
  onPriceChange,
  onStockChange,
}: ProductVariationSelectorProps) {
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch variations on mount
  useEffect(() => {
    const fetchVariations = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_PRODUCT_SERVER_URL}/api/${productId}/variations`
        );

        if (response.data.success) {
          const groups = response.data.variationGroups || [];
          const vars = response.data.variations || [];

          setVariationGroups(groups.sort((a: any, b: any) => a.position - b.position));
          setVariations(vars.filter((v: Variation) => v.isActive && !v.isDeleted));

          // If only one variation (default), auto-select it
          if (vars.length === 1 && vars[0].attributes.default === 'default') {
            setSelectedVariation(vars[0]);
            onVariationSelect?.(vars[0]);
            onPriceChange?.(vars[0].price);
            onStockChange?.(vars[0].stock);
          }
        }
      } catch (err: any) {
        console.error('Error fetching variations:', err);
        setError('Failed to load product variations');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchVariations();
    }
  }, [productId, onVariationSelect, onPriceChange, onStockChange]);

  // Update selected variation when attributes change
  useEffect(() => {
    if (variationGroups.length === 0) return;

    // Check if all required attributes are selected
    const allSelected = variationGroups.every(group => 
      selectedAttributes[group.name] !== undefined
    );

    if (!allSelected) {
      setSelectedVariation(null);
      onVariationSelect?.(null);
      return;
    }

    // Find matching variation
    const matching = variations.find(variation => {
      return variationGroups.every(group => 
        variation.attributes[group.name] === selectedAttributes[group.name]
      );
    });

    if (matching) {
      setSelectedVariation(matching);
      onVariationSelect?.(matching);
      onPriceChange?.(matching.price);
      onStockChange?.(matching.stock);
    } else {
      setSelectedVariation(null);
      onVariationSelect?.(null);
    }
  }, [selectedAttributes, variations, variationGroups, onVariationSelect, onPriceChange, onStockChange]);

  const handleAttributeSelect = (groupName: string, option: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [groupName]: option,
    }));
  };

  const isOptionAvailable = (groupName: string, option: string): boolean => {
    // Check if selecting this option would result in an available variation
    const testAttributes = { ...selectedAttributes, [groupName]: option };

    // Check if all required groups have selections
    const allSelected = variationGroups.every(group => 
      testAttributes[group.name] !== undefined
    );

    if (!allSelected) {
      // If not all selected, check if this option exists in any variation
      return variations.some(v => v.attributes[groupName] === option);
    }

    // If all selected, check for exact match
    return variations.some(variation => {
      return variationGroups.every(group => 
        variation.attributes[group.name] === testAttributes[group.name]
      );
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded w-20"></div>
          <div className="h-10 bg-gray-200 rounded w-20"></div>
          <div className="h-10 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // If no variation groups (simple product with default variation), don't show selector
  if (variationGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {variationGroups.map(group => (
        <div key={group.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">
              {group.name}:
            </label>
            {selectedAttributes[group.name] && (
              <span className="text-sm text-gray-600">
                {selectedAttributes[group.name]}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {group.options.map(option => {
              const isSelected = selectedAttributes[group.name] === option;
              const isAvailable = isOptionAvailable(group.name, option);

              // For colors, show color swatch
              const isColorGroup = group.name.toLowerCase() === 'color';

              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  disabled={!isAvailable}
                  onClick={() => handleAttributeSelect(group.name, option)}
                  className={`
                    relative min-w-[60px]
                    ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}
                    ${isSelected ? 'ring-2 ring-offset-2 ring-primary' : ''}
                  `}
                >
                  {isColorGroup ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: option }}
                      />
                      <span>{option}</span>
                    </div>
                  ) : (
                    option
                  )}
                  {isSelected && (
                    <Check className="absolute top-1 right-1 h-3 w-3" />
                  )}
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center">
                      <span className="text-xs text-gray-500">N/A</span>
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Stock and SKU Info */}
      {selectedVariation && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">SKU:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {selectedVariation.sku}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Availability:</span>
            <span className={selectedVariation.stock > 0 ? 'text-green-600' : 'text-red-600'}>
              {selectedVariation.stock > 0 
                ? `${selectedVariation.stock} in stock` 
                : 'Out of stock'}
            </span>
          </div>
        </div>
      )}

      {/* Validation message */}
      {variationGroups.some(g => !selectedAttributes[g.name]) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select {variationGroups.filter(g => !selectedAttributes[g.name]).map(g => g.name).join(' and ')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
