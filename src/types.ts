export interface Shop {
  id: string;
  name: string;
  cat: string;
  icon: string;
  dist: number;
  lat: number | null;
  lng: number | null;
  rating: number;
  reviews: number;
  open: boolean;
  tags: string[];
  addr: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  cat: string;
  price: number;
  qty: number;
  icon: string;
  shop: string;
  dist: number;
}

export interface CartItem extends InventoryItem {
  qty: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  pay: string;
  del: string;
  shops: string[];
  name: string;
  date: string;
  loc: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  desc: string;
}
