import { useEffect, useState } from 'react';

// LocalStorage key used for cart items. Should contain a JSON array.
const CART_KEY = 'cartItems';

function safeParse(raw: string | null) {
  if (!raw) return [] as any[];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const items = safeParse(localStorage.getItem(CART_KEY));
      setCount(items.length);
    };

    update();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) update();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('cart-updated', update as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('cart-updated', update as EventListener);
    };
  }, []);

  return count;
}
