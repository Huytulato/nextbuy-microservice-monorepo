'use client'
import React, { useState } from 'react';
import Breadcrumbs from '../../../shared/components/breadcrumbs';

const categories = {
  Electronics: ['Mobiles', 'Laptops', 'Accessories', 'Gaming'],
  Fashion: ['Men', 'Women', 'Kids', 'Footwear'],
  'Home & Kitchen': ['Furniture', 'Appliances', 'Decor'],
  'Sports & Fitness': ['Gym Equipment', 'Outdoor Sports', 'Wearables'],
};

export default function CustomizationPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'logo' | 'banner'>('categories');
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      // TODO: API call to add category
      console.log('Add category:', newCategory);
      setNewCategory('');
    }
  };

  const handleAddSubcategory = () => {
    if (selectedCategory && newSubcategory.trim()) {
      // TODO: API call to add subcategory
      console.log('Add subcategory:', newSubcategory, 'to', selectedCategory);
      setNewSubcategory('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Customization</h1>
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Customization' },
          ]}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('logo')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logo'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Logo
          </button>
          <button
            onClick={() => setActiveTab('banner')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'banner'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Banner
          </button>
        </nav>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Categories List */}
          <div className="space-y-4">
            {Object.entries(categories).map(([category, subcategories]) => (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{category}</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {subcategories.map((sub) => (
                    <li key={sub} className="text-sm">
                      {sub}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Add Category */}
          <div className="flex gap-3">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Category
            </button>
          </div>

          {/* Add Subcategory */}
          <div className="flex gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select category</option>
              {Object.keys(categories).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newSubcategory}
              onChange={(e) => setNewSubcategory(e.target.value)}
              placeholder="New subcategory"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddSubcategory}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Subcategory
            </button>
          </div>
        </div>
      )}

      {/* Logo Tab */}
      {activeTab === 'logo' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Logo</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input type="file" accept="image/*" className="mb-4" />
            <p className="text-gray-500">Click to upload or drag and drop</p>
          </div>
        </div>
      )}

      {/* Banner Tab */}
      {activeTab === 'banner' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Banners</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input type="file" accept="image/*" multiple className="mb-4" />
            <p className="text-gray-500">Click to upload or drag and drop</p>
          </div>
        </div>
      )}
    </div>
  );
}
