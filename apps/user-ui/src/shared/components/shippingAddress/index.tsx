"use client";

import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import { countries } from "apps/user-ui/src/utils/countries";
import { Plus, X, MapPin, Star, Trash2, Home, Building2, Waypoints } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

// Backend address type (from API)
type BackendAddress = {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
  userId: string;
  createdAt: string;
  updateAt: string;
};

// Frontend display type
type ShippingAddress = {
  id: string;
  label: "Home" | "Office" | "Other";
  fullName: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
};

// Form input type (for submission)
type AddressFormData = {
  label: "Home" | "Office" | "Other";
  fullName: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
};

const iconByLabel = {
  Home: Home,
  Office: Building2,
  Other: Waypoints,
};

const ShippingAddressSection = () => {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch addresses from API
  const { data: addressesData, isLoading } = useQuery({
    queryKey: ["shipping-addresses"],
    queryFn: async () => {
      const res = await axiosInstance.get("/api/shipping-addresses");
      return res.data.addresses as BackendAddress[];
    },
  });

  // Map backend addresses to frontend format
  const addresses: ShippingAddress[] = useMemo(() => {
    if (!addressesData) return [];
    return addressesData.map((addr: BackendAddress) => ({
      id: addr.id,
      label: addr.address.toLowerCase().includes("office") || addr.address.toLowerCase().includes("work")
        ? "Office"
        : addr.address.toLowerCase().includes("home") || addr.isDefault
        ? "Home"
        : "Other",
      fullName: addr.fullName,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      zipCode: addr.postalCode, // Map postalCode to zipCode for display
      country: addr.province, // Map province to country for display
      isDefault: addr.isDefault,
    }));
  }, [addressesData]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormData>({
    defaultValues: {
      label: "Home",
      fullName: "",
      phone: "",
      address: "",
      city: "",
      zipCode: "",
      country: "United States",
      province: "",
      postalCode: "",
      isDefault: false,
    },
  });

  const { mutate: addAddress, isPending: isAdding } = useMutation({
    mutationFn: async (payload: { fullName: string; phone: string; address: string; city: string; province: string; postalCode: string; isDefault: boolean }) => {
      const res = await axiosInstance.post("/api/add-address", payload);
      return res.data.address;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shipping-addresses"],
      });
      reset();
      setShowModal(false);
    },
  });

  const { mutate: deleteAddress, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/api/delete-address/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shipping-addresses"],
      });
    },
  });

  const onSubmit = (data: AddressFormData) => {
    // Map form data to backend format
    const payload = {
      fullName: data.fullName,
      phone: data.phone,
      address: data.address,
      city: data.city,
      province: data.province || data.country, // Use province if set, otherwise use country
      postalCode: data.postalCode || data.zipCode, // Use postalCode if set, otherwise use zipCode
      isDefault: data.isDefault === true || data.isDefault === "true" || String(data.isDefault) === "true",
    };
    addAddress(payload);
  };

  const handleRemove = (id: string) => {
    if (window.confirm("Are you sure you want to delete this address?")) {
      deleteAddress(id);
    }
  };

  const defaultAddress = useMemo(() => addresses.find((a) => a.isDefault)?.id, [addresses]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Shipping Address</h2>
          <p className="text-sm text-gray-500">Manage where you want to receive your orders</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Saved Address</h3>

        {isLoading ? (
          <div className="text-gray-500 text-sm">Loading addresses...</div>
        ) : addresses.length === 0 ? (
          <div className="text-gray-500 text-sm">No saved addresses yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) => {
              const Icon = iconByLabel[address.label] || Home;
              return (
                <div
                  key={address.id}
                  className="relative rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-blue-50 text-blue-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{address.label}</span>
                        {address.id === defaultAddress && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-800">{address.fullName}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {address.address}, {address.city}, {address.zipCode}, {address.country}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span>{address.phone}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(address.id)}
                      disabled={isDeleting}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Remove address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl bg-white rounded-lg shadow-lg animate-fadeIn">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Add New Address</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Label</label>
                  <select
                    {...register("label", { required: "Select a label" })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.label && <span className="text-xs text-red-500">{errors.label.message}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    {...register("fullName", { required: "Name is required" })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                  {errors.fullName && <span className="text-xs text-red-500">{errors.fullName.message}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <input
                    {...register("phone", { required: "Phone is required" })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(+1) 202-555-0116"
                  />
                  {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Street Address</label>
                  <input
                    {...register("address", { required: "Address is required" })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Street, house no."
                  />
                  {errors.address && <span className="text-xs text-red-500">{errors.address.message}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">City</label>
                  <input
                    {...register("city", { required: "City is required" })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                  {errors.city && <span className="text-xs text-red-500">{errors.city.message}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">ZIP Code</label>
                  <input
                    {...register("zipCode", { 
                      required: "ZIP is required",
                      onChange: (e) => {
                        // Also set postalCode for backend
                        const form = e.target.form;
                        if (form) {
                          const postalCodeInput = form.querySelector('[name="postalCode"]') as HTMLInputElement;
                          if (postalCodeInput) {
                            postalCodeInput.value = e.target.value;
                          }
                        }
                      }
                    })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ZIP Code"
                  />
                  <input type="hidden" {...register("postalCode")} />
                  {errors.zipCode && <span className="text-xs text-red-500">{errors.zipCode.message}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Country/Province</label>
                  <select
                    {...register("country", { 
                      required: "Country is required",
                      onChange: (e) => {
                        // Also set province for backend
                        const form = e.target.form;
                        if (form) {
                          const provinceInput = form.querySelector('[name="province"]') as HTMLInputElement;
                          if (provinceInput) {
                            provinceInput.value = e.target.value;
                          }
                        }
                      }
                    })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  <input type="hidden" {...register("province")} />
                  {errors.country && <span className="text-xs text-red-500">{errors.country.message}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Default Address</label>
                  <select
                    {...register("isDefault", { setValueAs: (v) => v === "true" })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="false">Not Default</option>
                    <option value="true">Set as Default</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setShowModal(false);
                  }}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? "Saving..." : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingAddressSection;
