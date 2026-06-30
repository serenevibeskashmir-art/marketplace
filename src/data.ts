import { Category, Shop, InventoryItem } from "./types";

export const CATS: Category[] = [
  { id: "grocery", name: "Grocery", icon: "🛒", desc: "Fresh produce, dairy, packaged foods" },
  { id: "garments", name: "Garments", icon: "👗", desc: "Clothing, accessories & fashion" },
  { id: "medicines", name: "Medicines", icon: "💊", desc: "Pharma, health & wellness" },
  { id: "books", name: "Books", icon: "📚", desc: "Textbooks, novels & study resources" },
  { id: "stationery", name: "Stationery", icon: "✏️", desc: "Pens, notebooks, art supplies" },
  { id: "electronics", name: "Electronics", icon: "🔌", desc: "Appliances, cables & gadgets" },
  { id: "dairy", name: "Dairy & Bakery", icon: "🥛", desc: "Milk, bread, eggs & more" },
  { id: "personal", name: "Personal Care", icon: "🧴", desc: "Soap, shampoo, skincare" },
];

export const DEFAULT_SHOPS: Shop[] = [
  { id: "verma", name: "Verma Dairy", cat: "Dairy & Bakery", icon: "🥛", dist: 0.2, lat: null, lng: null, rating: 4.8, reviews: 210, open: true, tags: ["Milk", "Bread", "Eggs", "Paneer"], addr: "MG Road" },
  { id: "sharma", name: "Sharma General Store", cat: "Grocery", icon: "🛒", dist: 0.4, lat: null, lng: null, rating: 4.5, reviews: 128, open: true, tags: ["Rice", "Spices", "Snacks", "Oils"], addr: "Sector 5" },
  { id: "gupta", name: "Gupta Medical", cat: "Medicines", icon: "💊", dist: 0.6, lat: null, lng: null, rating: 4.6, reviews: 95, open: true, tags: ["Paracetamol", "Vitamins", "Bandages", "Syrups"], addr: "Civil Lines" },
  { id: "beauty", name: "Beauty Corner", cat: "Personal Care", icon: "🧴", dist: 0.7, lat: null, lng: null, rating: 4.3, reviews: 76, open: true, tags: ["Shampoo", "Soap", "Skincare", "Perfume"], addr: "Sector 12" },
  { id: "rajesh", name: "Rajesh Electronics", cat: "Electronics", icon: "🔌", dist: 0.9, lat: null, lng: null, rating: 4.4, reviews: 54, open: false, tags: ["Bulbs", "Cables", "Adapters", "Switches"], addr: "Nehru Nagar" },
  { id: "city", name: "City Book House", cat: "Books & Stationery", icon: "📚", dist: 1.1, lat: null, lng: null, rating: 4.7, reviews: 163, open: true, tags: ["NCERT", "Novels", "Pens", "Notebooks"], addr: "Lal Kuan" },
  { id: "kapoor", name: "Kapoor Garments", cat: "Garments", icon: "👗", dist: 1.3, lat: null, lng: null, rating: 4.2, reviews: 88, open: true, tags: ["Shirts", "Sarees", "Jeans", "Kurtas"], addr: "Gandhi Nagar" },
  { id: "fresh", name: "Fresh Veggie Mart", cat: "Grocery", icon: "🥦", dist: 1.5, lat: null, lng: null, rating: 4.6, reviews: 201, open: false, tags: ["Vegetables", "Fruits", "Herbs", "Salad"], addr: "Kaushambi" },
];

export const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: 1, name: "Basmati Rice 1kg", cat: "Grocery", price: 89, qty: 150, icon: "🌾", shop: "Sharma General Store", dist: 0.4 },
  { id: 2, name: "Tata Salt 1kg", cat: "Grocery", price: 25, qty: 200, icon: "🧂", shop: "Sharma General Store", dist: 0.4 },
  { id: 3, name: "Amul Milk 500ml", cat: "Dairy & Bakery", price: 30, qty: 80, icon: "🥛", shop: "Verma Dairy", dist: 0.2 },
  { id: 4, name: "Bread (Brown)", cat: "Dairy & Bakery", price: 45, qty: 40, icon: "🍞", shop: "Verma Dairy", dist: 0.2 },
  { id: 5, name: "Paracetamol Strip", cat: "Medicines", price: 18, qty: 500, icon: "💊", shop: "Gupta Medical", dist: 0.6 },
  { id: 6, name: "Cough Syrup 100ml", cat: "Medicines", price: 85, qty: 60, icon: "🍶", shop: "Gupta Medical", dist: 0.6 },
  { id: 7, name: "NCERT Maths Cl10", cat: "Books", price: 120, qty: 35, icon: "📘", shop: "City Book House", dist: 1.1 },
  { id: 8, name: "Blue Ballpoint Pens", cat: "Stationery", price: 10, qty: 300, icon: "✒️", shop: "City Book House", dist: 1.1 },
  { id: 9, name: "LED Bulb 9W", cat: "Electronics", price: 99, qty: 75, icon: "💡", shop: "Rajesh Electronics", dist: 0.9 },
  { id: 10, name: "Extension Cord 3m", cat: "Electronics", price: 250, qty: 30, icon: "🔌", shop: "Rajesh Electronics", dist: 0.9 },
  { id: 11, name: "Men's Shirt (M)", cat: "Garments", price: 399, qty: 25, icon: "👔", shop: "Kapoor Garments", dist: 1.3 },
  { id: 12, name: "Cotton Saree", cat: "Garments", price: 699, qty: 15, icon: "👘", shop: "Kapoor Garments", dist: 1.3 },
  { id: 13, name: "Shampoo 200ml", cat: "Personal Care", price: 130, qty: 60, icon: "🧴", shop: "Beauty Corner", dist: 0.7 },
  { id: 14, name: "Soap Pack (3)", cat: "Personal Care", price: 65, qty: 120, icon: "🧼", shop: "Beauty Corner", dist: 0.7 },
];
