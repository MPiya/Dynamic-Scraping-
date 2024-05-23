export interface Product {
  sizes: string[];
  materials: string[];
  url: string;
  discounted: boolean;
  id: string;
  title: string | number; 
  description: string;
  originalPrice: number;
  currentPrice: number;
  brand: string;
  color: string;
  category: string;
  images: string[];
  relatedProductId: string;
  currency: string;
}