export interface ShopImage {
  id: string;
  url: string;
}

export interface ShopFollower {
  id: string;
  name: string;
  images?: ShopImage[];
}

export interface ShopReview {
  id: string;
  rating: number;
  review?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    images?: ShopImage[];
  };
}

export interface Shop {
  id: string;
  name: string;
  bio?: string;
  category: string;
  images: ShopImage[];
  coverBanner?: string;
  address: string;
  opening_hours: string;
  website?: string;
  social_links?: Array<{
    platform?: string;
    url: string;
    [key: string]: any;
  }>;
  rating: number;
  createdAt: string;
  followers: {
    count: number;
    users: ShopFollower[];
  };
  products: {
    count: number;
  };
  reviews: ShopReview[];
}

export interface ShopListItem {
  id: string;
  name: string;
  description?: string;
  avatar: string;
  coverBanner?: string;
  address?: string;
  followers?: ShopFollower[];
  rating?: number;
  category?: string;
}

