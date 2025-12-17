import { create } from "zustand";
import { persist } from "zustand/middleware";
import { trackEvent, getEventMetadata } from "../utils/trackEvent";

type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  quantity?: number;
  shopId: string;
};

type Store = {
  cart: Product[];
  wishlist: Product[];

  addToCart: (
    product: Product,
    user: any,
    location: string,
    deviceInfo: string
  ) => void;

  removeFromCart: (
    id: string,
    user: any,
    location: string,
    deviceInfo: string
  ) => void;

  updateCartQuantity: (
    id: string,
    quantity: number,
    user: any,
    location: string,
    deviceInfo: string
  ) => void;

  addToWishlist: (
    product: Product,
    user: any,
    location: string,
    deviceInfo: string
  ) => void;

  removeFromWishlist: (
    id: string,
    user: any,
    location: string,
    deviceInfo: string
  ) => void;

  clearCart: () => void;
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],

      addToCart: (product, user, location, deviceInfo) => {
        set((state) => {
          const existingProduct = state.cart.find((item) => item.id === product.id);

          if (existingProduct) {
            return {
              cart: state.cart.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: (item.quantity || 1) + 1 }
                  : item
              ),
            };
          }

          return {
            cart: [...state.cart, { ...product, quantity: 1 }],
          };
        });

        // Track event in Kafka
        if (user?.id) {
          trackEvent({
            userId: user.id,
            action: "add_to_cart",
            productId: product.id,
            shopId: product.shopId,
            metadata: {
              quantity: 1,
              price: product.price,
              ...getEventMetadata(),
            },
          });
        }

        console.log("Add to cart:", {
          product,
          user,
          location,
          deviceInfo,
        });
      },

      removeFromCart: (id, user, location, deviceInfo) => {
        const product = get().cart.find((item) => item.id === id);
        
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id),
        }));

        // Track event in Kafka
        if (user?.id && product) {
          trackEvent({
            userId: user.id,
            action: "remove_from_cart",
            productId: id,
            shopId: product.shopId,
            metadata: {
              quantity: product.quantity,
              price: product.price,
              ...getEventMetadata(),
            },
          });
        }

        console.log("Remove from cart:", {
          productId: id,
          user,
          location,
          deviceInfo,
        });
      },

      updateCartQuantity: (id, quantity, user, location, deviceInfo) => {
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        }));

        console.log("Update cart quantity:", {
          productId: id,
          quantity,
          user,
          location,
          deviceInfo,
        });
      },

      addToWishlist: (product, user, location, deviceInfo) => {
        set((state) => ({
          wishlist: [...state.wishlist, product],
        }));

        // Track event in Kafka
        if (user?.id) {
          trackEvent({
            userId: user.id,
            action: "add_to_wishlist",
            productId: product.id,
            shopId: product.shopId,
            metadata: {
              price: product.price,
              ...getEventMetadata(),
            },
          });
        }

        console.log("Add to wishlist:", {
          product,
          user,
          location,
          deviceInfo,
        });
      },

      removeFromWishlist: (id, user, location, deviceInfo) => {
        const product = get().wishlist.find((item) => item.id === id);
        
        set((state) => ({
          wishlist: state.wishlist.filter((item) => item.id !== id),
        }));

        // Track event in Kafka
        if (user?.id && product) {
          trackEvent({
            userId: user.id,
            action: "remove_from_wishlist",
            productId: id,
            shopId: product.shopId,
            metadata: {
              price: product.price,
              ...getEventMetadata(),
            },
          });
        }

        console.log("Remove from wishlist:", {
          productId: id,
          user,
          location,
          deviceInfo,
        });
      },

      clearCart: () => {
        set({ cart: [] });

        console.log("Clear cart");
      },
    }),
    {
      name: "user-store", // must be unique
    }
  )
);
