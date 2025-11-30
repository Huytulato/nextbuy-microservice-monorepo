import { useEffect, useState } from 'react';

// LocalStorage key used for wishlist items. Should contain a JSON array.
const WISHLIST_KEY = 'wishlistItems';

function safeParse(raw: string | null) {
  if (!raw) return [] as any[];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function useWishlistCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const items = safeParse(localStorage.getItem(WISHLIST_KEY));
      setCount(items.length);
    };

    update();

    // Listen to storage changes (other tabs) and custom app event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === WISHLIST_KEY) update();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('wishlist-updated', update as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('wishlist-updated', update as EventListener);
    };
  }, []);

  return count;
}
