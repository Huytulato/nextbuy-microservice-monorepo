/**
 * Product DTOs for request/response validation
 */

export interface CreateProductDto {
  title: string;
  short_description?: string;
  detailed_description?: string;
  warranty?: string;
  custom_specifications?: Record<string, any>;
  slug: string;
  tags?: string[];
  cash_on_delivery?: string;
  brand?: string;
  video_url?: string;
  category: string;
  subCategory?: string;
  colors?: string[];
  sizes?: string[];
  discount_codes?: string[];
  stock: number;
  sale_price: number;
  regular_price: number;
  custom_properties?: Record<string, any>;
  starting_date?: string | Date;
  ending_date?: string | Date;
  images?: Array<{ fileId: string; file_url: string }>;
  isDraft?: boolean;
  variationGroups?: Array<{ name: string; options: string[] }>;
  variations?: Array<{
    attributes: Record<string, string>;
    price: number;
    stock: number;
  }>;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  productId: string;
}

export interface ProductQueryDto {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  search?: string;
  sortBy?: string;
  priceRange?: [number, number];
  categories?: string[];
  colors?: string[];
  sizes?: string[];
}

export interface ProductResponseDto {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  detailed_description?: string;
  category: string;
  subCategory?: string;
  sale_price: number;
  regular_price: number;
  stock: number;
  ratings: number;
  status: string;
  images: Array<{ id: string; url: string; file_id: string }>;
  shops?: {
    id: string;
    name: string;
    rating: number;
    images?: Array<{ id: string; url: string }>;
  };
  variations?: Array<{
    id: string;
    sku: string;
    attributes: Record<string, string>;
    price: number;
    stock: number;
    isActive: boolean;
  }>;
  variationGroups?: Array<{
    id: string;
    name: string;
    options: string[];
    position: number;
  }>;
  createdAt: Date;
  updateAt: Date;
}

export interface UploadImageDto {
  fileData: string; // base64
  originalFileName?: string;
}

export interface DeleteImageDto {
  fileId: string;
}

export interface VariationUpdateDto {
  variationId: string;
  price?: number;
  stock?: number;
  isActive?: boolean;
}

export interface BulkVariationUpdateDto {
  updates: Array<{
    variationId: string;
    price?: number;
    stock?: number;
    isActive?: boolean;
  }>;
}

export interface SubmitDraftDto {
  productId: string;
}

export interface ProductHistoryDto {
  id: string;
  productId: string;
  changedBy: string;
  changeType: string;
  changes: Record<string, any>;
  reason?: string;
  createdAt: Date;
}

