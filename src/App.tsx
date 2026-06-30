import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  ShoppingCart,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Search,
  Plus,
  Minus,
  FileSpreadsheet,
  PlusCircle,
  CheckCircle2,
  Smartphone,
  CreditCard,
  Wallet,
  Banknote,
  ClipboardList,
  Trash2,
  LogOut,
  SlidersHorizontal,
  X,
  Printer
} from "lucide-react";

import { Shop, InventoryItem, CartItem, Order, Category } from "./types";
import { CATS, DEFAULT_SHOPS, DEFAULT_INVENTORY } from "./data";
import { haversine, offsetLatLng, reverseGeocode, FALLBACK_LOC, LatLng } from "./geoUtils";

export default function App() {
  // --- APPLICATION STATES (PERSISTED LAZILY) ---
  const [currentUser, setCurrentUser] = useState<{ name: string; phone: string } | null>(() => {
    const saved = localStorage.getItem("lm_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [userLoc, setUserLoc] = useState<LatLng | null>(() => {
    const saved = localStorage.getItem("lm_user_loc");
    return saved ? JSON.parse(saved) : null;
  });

  const [userLocName, setUserLocName] = useState<string>(() => {
    return localStorage.getItem("lm_user_loc_name") || "";
  });

  const [shops, setShops] = useState<Shop[]>(() => {
    const saved = localStorage.getItem("lm_shops");
    return saved ? JSON.parse(saved) : DEFAULT_SHOPS;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem("lm_inventory");
    return saved ? JSON.parse(saved) : DEFAULT_INVENTORY;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem("lm_orders");
    return saved ? JSON.parse(saved) : [];
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("lm_cart");
    return saved ? JSON.parse(saved) : [];
  });

  // --- CROSS-DEVICE SYNC LOCKS ---
  const isInitialSyncDone = useRef(false);
  const skipNextCloudPush = useRef({ shops: false, inventory: false, orders: false });
  const shopsRef = useRef(shops);
  const inventoryRef = useRef(inventory);
  const ordersRef = useRef(orders);

  // Keep refs in sync with state
  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const [idCounter, setIdCounter] = useState<number>(() => {
    const saved = localStorage.getItem("lm_idCounter");
    return saved ? parseInt(saved) : 15;
  });

  const [adminAuthed, setAdminAuthed] = useState<boolean>(() => {
    return localStorage.getItem("lm_admin_authed") === "true";
  });

  // --- NAVIGATION & INTERACTION STATES ---
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const savedUser = localStorage.getItem("lm_user");
    return savedUser ? "home" : "login";
  });
  
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedShopFilter, setSelectedShopFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeAdminTab, setActiveAdminTab] = useState<"inventory" | "add" | "upload" | "orders" | "shops">("inventory");
  
  // --- CHECKOUT PROCESS STATES ---
  const [payMethod, setPayMethod] = useState<"upi" | "card" | "wallet" | "cod">("upi");
  const [delivMethod, setDelivMethod] = useState<"standard" | "express">("standard");
  const [checkoutName, setCheckoutName] = useState<string>("");
  const [checkoutPhone, setCheckoutPhone] = useState<string>("");
  const [checkoutAddress, setCheckoutAddress] = useState<string>("");
  const [checkoutCity, setCheckoutCity] = useState<string>("");
  const [checkoutPin, setCheckoutPin] = useState<string>("");
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);

  // --- LOGIN OTP STATES ---
  const [loginNameInput, setLoginNameInput] = useState<string>("");
  const [loginPhoneInput, setLoginPhoneInput] = useState<string>("");
  const [otpStage, setOtpStage] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>("");
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [isOtpSending, setIsOtpSending] = useState<boolean>(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState<boolean>(false);
  const [isOtpSimulated, setIsOtpSimulated] = useState<boolean>(true);
  const [otpError, setOtpError] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState<boolean>(false);

  // --- ADMIN AUTH STATES ---
  const [adminUser, setAdminUser] = useState<string>("");
  const [adminPass, setAdminPass] = useState<string>("");
  const [adminError, setAdminError] = useState<string>("");

  // --- MERCHANT CONFIG STATES ---
  const [merchantShopName, setMerchantShopName] = useState<string>(() => {
    return localStorage.getItem("lm_merchant_shop_name") || "Sharma General Store";
  });
  const [merchantShopCat, setMerchantShopCat] = useState<string>(() => {
    return localStorage.getItem("lm_merchant_shop_cat") || "Grocery";
  });
  const [merchantShopAddr, setMerchantShopAddr] = useState<string>(() => {
    return localStorage.getItem("lm_merchant_shop_addr") || "Sector 5";
  });
  const [merchantShopDist, setMerchantShopDist] = useState<number>(() => {
    const saved = localStorage.getItem("lm_merchant_shop_dist");
    return saved ? parseFloat(saved) : 0.4;
  });
  const [merchantShopLat, setMerchantShopLat] = useState<string>(() => {
    return localStorage.getItem("lm_merchant_shop_lat") || "";
  });
  const [merchantShopLng, setMerchantShopLng] = useState<string>(() => {
    return localStorage.getItem("lm_merchant_shop_lng") || "";
  });
  const [merchantLocStatus, setMerchantLocStatus] = useState<string>("");

  // --- ADD ITEM STATES ---
  const [addItemName, setAddItemName] = useState<string>("");
  const [addItemCat, setAddItemCat] = useState<string>("Grocery");
  const [addItemPrice, setAddItemPrice] = useState<string>("");
  const [addItemQty, setAddItemQty] = useState<string>("");
  const [addItemIcon, setAddItemIcon] = useState<string>("");

  // --- EXCEL FILE STATE ---
  const [excelPreview, setExcelPreview] = useState<string>("");
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- TOAST NOTIFICATIONS ---
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

  const triggerToast = (message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  // --- AUTOMATIC SYNCHRONIZATION TO LOCALSTORAGE ---
  useEffect(() => {
    if (currentUser) localStorage.setItem("lm_user", JSON.stringify(currentUser));
    else localStorage.removeItem("lm_user");
  }, [currentUser]);

  useEffect(() => {
    if (userLoc) localStorage.setItem("lm_user_loc", JSON.stringify(userLoc));
    else localStorage.removeItem("lm_user_loc");
  }, [userLoc]);

  useEffect(() => {
    localStorage.setItem("lm_user_loc_name", userLocName);
  }, [userLocName]);

  useEffect(() => {
    localStorage.setItem("lm_shops", JSON.stringify(shops));
    if (!isInitialSyncDone.current) {
      return;
    }
    if (skipNextCloudPush.current.shops) {
      skipNextCloudPush.current.shops = false;
      return;
    }
    fetch("/api/data/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shops }),
    }).catch((err) => console.error("Cloud sync shops error:", err));
  }, [shops]);

  useEffect(() => {
    localStorage.setItem("lm_inventory", JSON.stringify(inventory));
    if (!isInitialSyncDone.current) {
      return;
    }
    if (skipNextCloudPush.current.inventory) {
      skipNextCloudPush.current.inventory = false;
      return;
    }
    fetch("/api/data/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventory }),
    }).catch((err) => console.error("Cloud sync inventory error:", err));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem("lm_orders", JSON.stringify(orders));
    if (!isInitialSyncDone.current) {
      return;
    }
    if (skipNextCloudPush.current.orders) {
      skipNextCloudPush.current.orders = false;
      return;
    }
    fetch("/api/data/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    }).catch((err) => console.error("Cloud sync orders error:", err));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("lm_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("lm_idCounter", String(idCounter));
  }, [idCounter]);

  useEffect(() => {
    localStorage.setItem("lm_admin_authed", String(adminAuthed));
  }, [adminAuthed]);

  useEffect(() => {
    localStorage.setItem("lm_merchant_shop_name", merchantShopName);
  }, [merchantShopName]);

  useEffect(() => {
    localStorage.setItem("lm_merchant_shop_cat", merchantShopCat);
  }, [merchantShopCat]);

  useEffect(() => {
    localStorage.setItem("lm_merchant_shop_addr", merchantShopAddr);
  }, [merchantShopAddr]);

  useEffect(() => {
    localStorage.setItem("lm_merchant_shop_dist", String(merchantShopDist));
  }, [merchantShopDist]);

  useEffect(() => {
    localStorage.setItem("lm_merchant_shop_lat", merchantShopLat);
  }, [merchantShopLat]);

  useEffect(() => {
    localStorage.setItem("lm_merchant_shop_lng", merchantShopLng);
  }, [merchantShopLng]);

  // Set checkout contact details when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setCheckoutName(currentUser.name);
      setCheckoutPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Self-heal idCounter based on max shop id in synced list to prevent collisions across devices
  useEffect(() => {
    if (shops.length > 0) {
      const maxId = Math.max(...shops.map((s) => s.id), 15);
      if (idCounter <= maxId) {
        setIdCounter(maxId + 1);
      }
    }
  }, [shops, idCounter]);

  // --- CLOUD CROSS-DEVICE SYNC ENGINE ---
  // Fixed version: prevents the "shops auto-delete / don't sync across devices" bug.
  // Old logic re-checked "is the cloud empty?" on every single poll (every 3s) and,
  // any time that check came back true (even due to a transient hiccup), it would
  // push the device's own stale localStorage copy up to the cloud — silently
  // overwriting data another device had just saved. The new logic only allows
  // that "seed the cloud from local data" behavior to happen ONCE, on the very
  // first load of a tab, and only if the cloud is genuinely empty. After that,
  // the cloud is always treated as the source of truth.
  useEffect(() => {
    const syncFromCloud = async (isInitial: boolean) => {
      try {
        const response = await fetch("/api/data");
        if (!response.ok) return;
        const cloudData = await response.json();

        const cloudHasAnything =
          (Array.isArray(cloudData.shops) && cloudData.shops.length > 0) ||
          (Array.isArray(cloudData.inventory) && cloudData.inventory.length > 0) ||
          (Array.isArray(cloudData.orders) && cloudData.orders.length > 0);

        if (cloudHasAnything) {
          // Cloud is the source of truth once it actually has data.
          if (
            Array.isArray(cloudData.shops) &&
            JSON.stringify(cloudData.shops) !== JSON.stringify(shopsRef.current)
          ) {
            skipNextCloudPush.current.shops = true;
            setShops(cloudData.shops);
          }
          if (
            Array.isArray(cloudData.inventory) &&
            JSON.stringify(cloudData.inventory) !== JSON.stringify(inventoryRef.current)
          ) {
            skipNextCloudPush.current.inventory = true;
            setInventory(cloudData.inventory);
          }
          if (
            Array.isArray(cloudData.orders) &&
            JSON.stringify(cloudData.orders) !== JSON.stringify(ordersRef.current)
          ) {
            skipNextCloudPush.current.orders = true;
            setOrders(cloudData.orders);
          }
        } else if (isInitial) {
          // Cloud is genuinely empty — this should only realistically happen on a
          // brand new deployment. Seed it ONCE here, never again on later polls,
          // so a transient empty/failed response later can't wipe real cloud data.
          if (
            shopsRef.current.length > 0 ||
            inventoryRef.current.length > 0 ||
            ordersRef.current.length > 0
          ) {
            await fetch("/api/data/shops", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ shops: shopsRef.current }),
            });
            await fetch("/api/data/inventory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ inventory: inventoryRef.current }),
            });
            await fetch("/api/data/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orders: ordersRef.current }),
            });
            console.log("[Sync] Cloud database was empty on first load — seeded once with local data.");
          }
        }
      } catch (err) {
        console.error("Cloud sync error:", err);
      } finally {
        isInitialSyncDone.current = true;
      }
    };

    // Initial sync on mount
    syncFromCloud(true);

    // Poll every 3 seconds for cross-device updates. Never re-seeds after the
    // initial load, so this can only ever pull cloud -> local, not push
    // local -> cloud (normal edits still push via the localStorage-sync effects above).
    const intervalId = setInterval(() => {
      if (isInitialSyncDone.current) {
        syncFromCloud(false);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  // --- LOCATION ASSIGNMENT ---
  const applyCoordinatesAndScatter = (coords: LatLng, name: string) => {
    setUserLoc(coords);
    setUserLocName(name);

    // Scatter newly added or existing shops with null lat/lng relative to user
    const bearings = [15, 60, 130, 200, 250, 310, 45, 170];
    setShops((prevShops) =>
      prevShops.map((s, index) => {
        if (s.lat === null || s.lng === null) {
          const placed = offsetLatLng(coords.lat, coords.lng, s.dist, bearings[index % bearings.length]);
          return { ...s, lat: placed.lat, lng: placed.lng };
        }
        return s;
      })
    );
  };

  // Run initial location setup if logged in but coordinates aren't set yet
  useEffect(() => {
    if (currentUser && !userLoc) {
      triggerLocationDetection();
    }
  }, [currentUser]);

  const triggerLocationDetection = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      applyCoordinatesAndScatter(FALLBACK_LOC, "Ghaziabad (approx.)");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const name = await reverseGeocode(coords.lat, coords.lng);
        applyCoordinatesAndScatter(coords, name || "Your area");
        setLocationLoading(false);
      },
      () => {
        applyCoordinatesAndScatter(FALLBACK_LOC, "Your area (approx.)");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // --- DISTANCE CONVENIENCE HANDLERS ---
  const getShopDistance = (shop: Shop): number => {
    const origin = userLoc || FALLBACK_LOC;
    if (shop.lat !== null && shop.lng !== null) {
      return haversine(origin.lat, origin.lng, shop.lat, shop.lng);
    }
    return shop.dist;
  };

  const getItemDistance = (item: InventoryItem): number => {
    const sh = shops.find((s) => s.name === item.shop);
    return sh ? getShopDistance(sh) : item.dist;
  };

  // --- AUTHENTICATION ACTIONS ---
  const handleSendOtp = async () => {
    const cleanName = loginNameInput.trim();
    const cleanPhone = loginPhoneInput.trim().replace(/\D/g, "");

    if (!cleanName) {
      triggerToast("Please enter your name");
      return;
    }
    if (cleanPhone.length < 10) {
      triggerToast("Please enter a valid 10-digit phone number");
      return;
    }

    setIsOtpSending(true);
    setOtpError("");
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, phone: cleanPhone }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Iframe cookie restriction detected. Please click the 'Open in New Tab' button in the top right to verify with real SMS, or use the 'Direct Bypass' button below!");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setIsOtpSimulated(!!data.simulated);
      if (data.simulated) {
        setGeneratedOtp(data.otp);
        triggerToast("📩 Simulated SMS OTP code prepared!");
      } else {
        setGeneratedOtp(""); // Real SMS sent!
        triggerToast("🚀 Real SMS OTP code sent successfully via Twilio!");
      }
      setOtpStage(true);
    } catch (err: any) {
      setOtpError(err.message || "An error occurred");
      triggerToast(err.message || "Could not send OTP");
    } finally {
      setIsOtpSending(false);
    }
  };

  const handleBypassOtp = () => {
    const cleanName = loginNameInput.trim() || "Guest User";
    const cleanPhone = loginPhoneInput.trim().replace(/\D/g, "") || "9858355260";
    
    setCurrentUser({ name: cleanName, phone: cleanPhone });
    triggerToast("✅ Logged in via bypass demo mode!");
    
    // Auto detect location on successful sign-in
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const name = await reverseGeocode(coords.lat, coords.lng);
          applyCoordinatesAndScatter(coords, name || "Your area");
          setLocationLoading(false);
          setCurrentPage("home");
        },
        () => {
          applyCoordinatesAndScatter(FALLBACK_LOC, "Your area (approx.)");
          setLocationLoading(false);
          setCurrentPage("home");
        }
      );
    } else {
      applyCoordinatesAndScatter(FALLBACK_LOC, "Your area (approx.)");
      setLocationLoading(false);
      setCurrentPage("home");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput) {
      triggerToast("Enter the verification code");
      return;
    }

    setIsOtpVerifying(true);
    setOtpError("");
    try {
      const cleanPhone = loginPhoneInput.trim().replace(/\D/g, "");
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, otp: otpInput }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Iframe cookie restriction detected. Please click the 'Open in New Tab' button in the top right to verify with real SMS, or use the 'Direct Bypass' button below!");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Incorrect verification code");
      }

      setCurrentUser({ name: loginNameInput.trim(), phone: loginPhoneInput.trim() });
      triggerToast("✅ SMS Verification successful!");
      
      // Auto detect location on successful sign-in
      setLocationLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            const name = await reverseGeocode(coords.lat, coords.lng);
            applyCoordinatesAndScatter(coords, name || "Your area");
            setLocationLoading(false);
            setCurrentPage("home");
          },
          () => {
            applyCoordinatesAndScatter(FALLBACK_LOC, "Your area (approx.)");
            setLocationLoading(false);
            setCurrentPage("home");
          }
        );
      } else {
        applyCoordinatesAndScatter(FALLBACK_LOC, "Your area (approx.)");
        setLocationLoading(false);
        setCurrentPage("home");
      }
    } catch (err: any) {
      setOtpError(err.message || "Verification failed");
      triggerToast(err.message || "Invalid OTP code");
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const handleAdminGateLogin = () => {
    if (adminUser.trim() === "admin" && adminPass === "Snazar@27") {
      setAdminAuthed(true);
      setCurrentPage("admin");
      setAdminUser("");
      setAdminPass("");
      setAdminError("");
      triggerToast("Store Admin Logged In successfully");
    } else {
      setAdminError("Invalid administrator credentials");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserLoc(null);
    setUserLocName("");
    setCart([]);
    setAdminAuthed(false);
    setCurrentPage("login");
    setOtpStage(false);
    setLoginNameInput("");
    setLoginPhoneInput("");
    setOtpInput("");
    triggerToast("Logged out successfully");
  };

  // --- CART OPERATIONS ---
  const handleAddToCart = (item: InventoryItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((x) => x.id === item.id);
      if (existing) {
        return prevCart.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...prevCart, { ...item, qty: 1 }];
    });
    triggerToast(`Added ${item.icon} ${item.name} to cart`);
  };

  const handleUpdateCartQty = (id: number, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((x) => {
          if (x.id === id) {
            return { ...x, qty: x.qty + delta };
          }
          return x;
        })
        .filter((x) => x.qty > 0)
    );
  };

  // --- ORDER PROCESSING ---
  const handlePlaceOrder = () => {
    if (!checkoutName.trim()) {
      triggerToast("Please specify delivery full name");
      return;
    }
    if (!checkoutAddress.trim()) {
      triggerToast("Please specify delivery street address");
      return;
    }
    if (!checkoutCity.trim()) {
      triggerToast("Please specify city");
      return;
    }
    if (!checkoutPin.trim()) {
      triggerToast("Please specify PIN code");
      return;
    }
    if (cart.length === 0) {
      triggerToast("Cart is empty!");
      return;
    }

    const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const deliveryCost = delivMethod === "express" ? 60 : 30;
    const uniqueShops = Array.from(new Set(cart.map((c) => c.shop))) as string[];
    const orderId = "LM" + Date.now().toString().slice(-6);

    const newOrder: Order = {
      id: orderId,
      items: [...cart],
      total: subtotal + deliveryCost,
      pay: payMethod,
      del: delivMethod,
      shops: uniqueShops,
      name: checkoutName,
      date: new Date().toLocaleString(),
      loc: userLocName || "Ghaziabad"
    };

    // Update state & store
    setOrders((prev) => [newOrder, ...prev]);
    setLatestOrder(newOrder);
    setCart([]); // Clear cart
    setCurrentPage("voucher");
    triggerToast("🎉 Order placed successfully!");
  };

  // --- MERCHANT MANAGEMENT ACTIONS ---
  const captureMerchantLocation = () => {
    setMerchantLocStatus("Acquiring GPS coordinates...");
    if (!navigator.geolocation) {
      setMerchantLocStatus("Geolocation is not supported by your device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMerchantShopLat(pos.coords.latitude.toFixed(6));
        setMerchantShopLng(pos.coords.longitude.toFixed(6));
        setMerchantLocStatus("✅ Current GPS location acquired!");
      },
      () => {
        setMerchantLocStatus("⚠️ Location access denied. Using manual entries.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAddNewItem = () => {
    const name = addItemName.trim();
    const price = parseFloat(addItemPrice);
    const qty = parseInt(addItemQty);
    const icon = addItemIcon.trim() || "📦";

    if (!name || isNaN(price) || isNaN(qty)) {
      triggerToast("Please enter valid item details");
      return;
    }

    const shopName = merchantShopName.trim() || "Local Store";
    const shopCategory = merchantShopCat;
    const shopAddr = merchantShopAddr.trim() || "Local Neighborhood";
    const shopDistance = merchantShopDist || 0.5;

    // Check if shop exists; if not, create it
    const shopRecord = shops.find((s) => s.name.toLowerCase() === shopName.toLowerCase());
    let updatedShops = [...shops];

    if (!shopRecord) {
      const baseId = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) || `shop-${idCounter}`;
      let uniqueId = baseId;
      let suffix = 2;
      while (updatedShops.some((s) => s.id === uniqueId)) {
        uniqueId = `${baseId}-${suffix}`;
        suffix++;
      }

      const manualLat = parseFloat(merchantShopLat);
      const manualLng = parseFloat(merchantShopLng);
      let lat: number;
      let lng: number;

      if (!isNaN(manualLat) && !isNaN(manualLng)) {
        lat = manualLat;
        lng = manualLng;
      } else {
        const origin = userLoc || FALLBACK_LOC;
        const placed = offsetLatLng(origin.lat, origin.lng, shopDistance, Math.random() * 360);
        lat = placed.lat;
        lng = placed.lng;
      }

      const newShop: Shop = {
        id: uniqueId,
        name: shopName,
        cat: shopCategory,
        icon: icon,
        dist: shopDistance,
        lat,
        lng,
        rating: 5.0,
        reviews: 0,
        open: true,
        tags: [name],
        addr: shopAddr
      };
      updatedShops.push(newShop);
    } else {
      // Append tag if unique
      if (!shopRecord.tags.includes(name)) {
        updatedShops = updatedShops.map((s) =>
          s.id === shopRecord.id ? { ...s, tags: [...s.tags, name].slice(0, 4) } : s
        );
      }
    }

    // Append inventory item
    const newItem: InventoryItem = {
      id: idCounter,
      name,
      cat: addItemCat,
      price,
      qty,
      icon,
      shop: shopName,
      dist: shopDistance
    };

    setInventory((prev) => [...prev, newItem]);
    setShops(updatedShops);
    setIdCounter((prev) => prev + 1);

    // Reset fields
    setAddItemName("");
    setAddItemPrice("");
    setAddItemQty("");
    setAddItemIcon("");
    
    triggerToast("📦 Item successfully listed in store!");
    setActiveAdminTab("inventory");
  };

  const handleRemoveInventoryItem = (id: number) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
    triggerToast("Item removed from store");
  };

  const handleDeleteShop = (shopId: string) => {
    const shopToDelete = shops.find((s) => s.id === shopId);
    if (!shopToDelete) return;

    // Confirm deletion
    const confirmed = window.confirm(`Are you sure you want to delete "${shopToDelete.name}" and all of its listed inventory items?`);
    if (!confirmed) return;

    // Remove shop
    setShops((prev) => prev.filter((s) => s.id !== shopId));
    // Remove its inventory items
    setInventory((prev) => prev.filter((item) => item.shop.toLowerCase() !== shopToDelete.name.toLowerCase()));

    triggerToast(`🏪 ${shopToDelete.name} has been deleted successfully`);
  };

  // --- EXCEL UPLOAD HANDLER ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
  };

  const processExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        let added = 0;
        const shopName = merchantShopName.trim() || "My Shop";
        const shopCategory = merchantShopCat;
        const shopAddr = merchantShopAddr.trim() || "Address not provided";
        const shopDistance = merchantShopDist || 0.5;

        let firstIcon = "🏪";
        const newItems: InventoryItem[] = [];
        let runningIdCounter = idCounter;

        rows.slice(1).forEach((r) => {
          if (r[0] && r[2]) {
            const name = String(r[0]);
            const cat = String(r[1] || "Grocery");
            const price = parseFloat(r[2]) || 0;
            const qty = parseInt(r[3]) || 0;
            const icon = String(r[4] || "📦");

            if (newItems.length === 0) {
              firstIcon = icon;
            }

            newItems.push({
              id: runningIdCounter++,
              name,
              cat,
              price,
              qty,
              icon,
              shop: shopName,
              dist: shopDistance
            });
            added++;
          }
        });

        if (newItems.length === 0) {
          triggerToast("No valid rows found in Excel sheet");
          return;
        }

        // Set state values sequentially
        setInventory((prev) => [...prev, ...newItems]);
        setIdCounter(runningIdCounter);

        // Manage/verify shops list
        setShops((prevShops) => {
          let updated = [...prevShops];
          const existing = updated.find((s) => s.name.toLowerCase() === shopName.toLowerCase());

          if (!existing) {
            const baseId = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) || `shop-${runningIdCounter}`;
            let uniqueId = baseId;
            let suffix = 2;
            while (updated.some((s) => s.id === uniqueId)) {
              uniqueId = `${baseId}-${suffix}`;
              suffix++;
            }

            const manualLat = parseFloat(merchantShopLat);
            const manualLng = parseFloat(merchantShopLng);
            let lat: number;
            let lng: number;

            if (!isNaN(manualLat) && !isNaN(manualLng)) {
              lat = manualLat;
              lng = manualLng;
            } else {
              const origin = userLoc || FALLBACK_LOC;
              const placed = offsetLatLng(origin.lat, origin.lng, shopDistance, Math.random() * 360);
              lat = placed.lat;
              lng = placed.lng;
            }

            const newShop: Shop = {
              id: uniqueId,
              name: shopName,
              cat: shopCategory,
              icon: firstIcon,
              dist: shopDistance,
              lat,
              lng,
              rating: 5.0,
              reviews: 0,
              open: true,
              tags: newItems.slice(0, 4).map((i) => i.name),
              addr: shopAddr
            };
            updated.push(newShop);
          } else {
            // Merge existing tags
            const mergedTags = Array.from(new Set([...existing.tags, ...newItems.slice(0, 4).map((i) => i.name)])).slice(0, 4);
            updated = updated.map((s) => (s.id === existing.id ? { ...s, tags: mergedTags } : s));
          }
          return updated;
        });

        // Set the success indicator display and state
        setExcelPreview(`✅ Successfully processed "${file.name}"! Imported ${added} inventory records.`);
        triggerToast(`Imported ${added} store items from spreadsheet!`);
        
        // Return to store view to see the freshly added items
        setTimeout(() => {
          setActiveAdminTab("inventory");
          setExcelPreview("");
        }, 1500);

      } catch (err) {
        triggerToast("Failed to parse Excel file structure. Check headers.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- PRINT OR VOUCHER EXPORT ---
  const handlePrintVoucher = () => {
    window.print();
  };

  // --- SEARCH AND FILTERS CALCULATIONS ---
  const getFilteredShops = () => {
    const q = searchQuery.toLowerCase().trim();
    const list = [...shops];
    
    // Sort by distance dynamically
    list.sort((a, b) => getShopDistance(a) - getShopDistance(b));

    if (!q) return list;

    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.cat.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  };

  const getFilteredItems = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return inventory.filter((i) => i.name.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q));
  };

  const activeCategory = CATS.find((c) => c.id === selectedCatId);
  const activeShop = shops.find((s) => s.id === selectedShopId);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2c2c29] flex flex-col antialiased">
      {/* Toast Alert overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-[#0f4035] text-[#e3f4ef] border border-[#23584c] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 font-medium text-sm"
            >
              <div className="w-2 h-2 rounded-full bg-[#ef9f27] animate-pulse" />
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- HEADER NAVIGATION --- */}
      {currentPage !== "login" && (
        <nav className="sticky top-0 z-30 bg-[#1d9e75] text-[#ffffff] px-4 py-3 shadow-md border-b border-[#147a5a]">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            {/* Logo */}
            <div
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage("home");
              }}
            >
              <span className="font-extrabold text-2xl tracking-tight">Local<span className="text-[#9fe1cb]">Mart</span></span>
            </div>

            {/* GPS pill */}
            <div
              onClick={triggerLocationDetection}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#ffffff]/15 hover:bg-[#ffffff]/25 transition px-3 py-1.5 rounded-full cursor-pointer max-w-[180px] md:max-w-xs truncate"
              title="Click to recalculate current GPS location"
            >
              <MapPin className="w-3.5 h-3.5 text-[#9fe1cb] shrink-0" />
              <span className="truncate">
                {locationLoading ? "Acquiring GPS..." : userLocName || "Choose Location..."}
              </span>
            </div>

            {/* Nav Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage("cart")}
                className="relative bg-[#ffffff]/10 hover:bg-[#ffffff]/20 p-2 rounded-xl transition flex items-center gap-1.5 font-medium text-xs border border-[#ffffff]/10"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                <AnimatePresence>
                  {cart.length > 0 && (
                    <motion.span
                      initial={{ scale: 0.7 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-1.5 bg-[#ef9f27] text-[#4a1b0c] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                    >
                      {cart.reduce((s, c) => s + c.qty, 0)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <button
                onClick={() => {
                  if (adminAuthed) {
                    setCurrentPage("admin");
                  } else {
                    setAdminError("");
                    setCurrentPage("admingate");
                  }
                }}
                className="bg-[#ffffff]/10 hover:bg-[#ffffff]/20 px-3 py-2 rounded-xl transition border border-[#ffffff]/10 text-xs font-semibold"
              >
                🏪 Merchant
              </button>

              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="bg-red-800/20 hover:bg-red-800/40 text-[#ffdede] border border-red-700/30 p-2 rounded-xl transition text-xs"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* --- MASTER CONTAINER --- */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {/* ================= PAGE: LOGIN ================= */}
          {currentPage === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex items-center justify-center py-12 px-4"
            >
              <div className="bg-white w-full max-w-md p-8 rounded-2xl border border-[#e2e0d8] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#1d9e75] to-[#ef9f27]" />
                
                <div className="text-center mb-6">
                  <h1 className="text-3xl font-extrabold tracking-tight">
                    Local<span className="text-[#1d9e75]">Mart</span>
                  </h1>
                  <p className="text-xs text-[#6e6d68] mt-1 font-medium">
                    Order from nearby merchants. Prompt delivery guaranteed.
                  </p>
                </div>

                {!otpStage ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#5f5e5a] mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={loginNameInput}
                        disabled={isOtpSending}
                        onChange={(e) => setLoginNameInput(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-4 py-3 rounded-xl focus:outline-none focus:border-[#1d9e75] focus:ring-1 focus:ring-[#1d9e75] bg-[#faf9f6] disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#5f5e5a] mb-1">
                        Phone Number (With Country Code)
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +919876543210 or 9876543210"
                        value={loginPhoneInput}
                        disabled={isOtpSending}
                        onChange={(e) => setLoginPhoneInput(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-4 py-3 rounded-xl focus:outline-none focus:border-[#1d9e75] focus:ring-1 focus:ring-[#1d9e75] bg-[#faf9f6] disabled:opacity-60"
                      />
                    </div>

                    {otpError && (
                      <div className="bg-[#fff1f1] border border-red-200 text-red-800 text-xs p-3 rounded-xl font-medium leading-relaxed">
                        ⚠️ {otpError}
                      </div>
                    )}

                    <button
                      onClick={handleSendOtp}
                      disabled={isOtpSending}
                      className="w-full bg-[#1d9e75] hover:bg-[#147a5a] text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 mt-4 shadow-md shadow-[#1d9e75]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isOtpSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending SMS...</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4" />
                          <span>Send SMS OTP</span>
                        </>
                      )}
                    </button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-[#e2e0d8]"></div>
                      <span className="flex-shrink mx-3 text-[10px] text-[#8c8b82] font-bold uppercase tracking-wider">or bypass</span>
                      <div className="flex-grow border-t border-[#e2e0d8]"></div>
                    </div>

                    <button
                      onClick={handleBypassOtp}
                      className="w-full bg-[#f4f2ea] hover:bg-[#eae8df] text-[#444340] border border-[#d3d1c7] py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 text-xs shadow-sm"
                    >
                      ⚡ Skip OTP & Login Directly (Demo)
                    </button>

                    <div className="bg-[#e1f5ee] border border-[#a2ebd2] p-3 rounded-xl flex items-start gap-2.5 text-xs text-[#085041] mt-2 leading-relaxed">
                      <MapPin className="w-4 h-4 text-[#1d9e75] shrink-0 mt-0.5" />
                      <span>
                        We require your device location to connect you with nearby merchants.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-center text-sm text-[#444340] mb-2 leading-relaxed">
                      We sent a verification code to <br />
                      <strong className="text-[#1d9e75]">{loginPhoneInput}</strong>
                    </p>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#5f5e5a] mb-1">
                        4-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        placeholder="0000"
                        maxLength={4}
                        disabled={isOtpVerifying}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                        className="w-full text-center tracking-widest text-2xl font-bold border border-[#d3d1c7] px-4 py-3 rounded-xl focus:outline-none focus:border-[#1d9e75] bg-[#faf9f6] disabled:opacity-60"
                      />
                    </div>

                    {otpError && (
                      <div className="bg-[#fff1f1] border border-red-200 text-red-800 text-xs p-3 rounded-xl font-medium text-center leading-relaxed">
                        ❌ {otpError}
                      </div>
                    )}

                    {isOtpSimulated ? (
                      <div className="bg-[#faeeda] border border-[#f1dcb8] p-3.5 rounded-xl text-center space-y-1">
                        <span className="inline-block px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full font-bold text-[9px] uppercase tracking-wider">
                          Demo Mode SMS Simulation
                        </span>
                        <p className="text-[11px] text-[#7c541c] leading-relaxed">
                          No active Twilio credentials found in .env. Use code below to continue testing:
                        </p>
                        <p className="text-xl text-[#d48316] font-extrabold font-mono tracking-wider select-all">
                          {generatedOtp}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                        <span className="inline-block px-2 py-0.5 bg-emerald-100 text-[#085041] rounded-full font-bold text-[9px] uppercase tracking-wider">
                          Real SMS Dispatched
                        </span>
                        <p className="text-[11px] text-[#085041] mt-1 font-medium leading-relaxed">
                          Sent a real SMS OTP via the Twilio API gateway. Please check your text messages.
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleVerifyOtp}
                      disabled={isOtpVerifying}
                      className="w-full bg-[#1d9e75] hover:bg-[#147a5a] text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isOtpVerifying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <span>Verify & Continue</span>
                      )}
                    </button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-[#e2e0d8]"></div>
                      <span className="flex-shrink mx-3 text-[10px] text-[#8c8b82] font-bold uppercase tracking-wider">or bypass</span>
                      <div className="flex-grow border-t border-[#e2e0d8]"></div>
                    </div>

                    <button
                      onClick={handleBypassOtp}
                      className="w-full bg-[#f4f2ea] hover:bg-[#eae8df] text-[#444340] border border-[#d3d1c7] py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 text-xs shadow-sm"
                    >
                      ⚡ Skip OTP & Sign In Directly
                    </button>

                    <div className="flex justify-between items-center text-xs pt-2">
                      <button
                        onClick={handleSendOtp}
                        disabled={isOtpSending || isOtpVerifying}
                        className="text-[#1d9e75] font-semibold hover:underline disabled:opacity-50"
                      >
                        {isOtpSending ? "Sending Code..." : "Resend Code"}
                      </button>
                      <button
                        onClick={() => {
                          setOtpStage(false);
                          setOtpError("");
                        }}
                        disabled={isOtpVerifying}
                        className="text-[#7c7b74] font-medium hover:underline disabled:opacity-50"
                      >
                        Change Number
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ================= PAGE: ADMIN GATE ================= */}
          {currentPage === "admingate" && (
            <motion.div
              key="admingate"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex items-center justify-center py-12"
            >
              <div className="bg-white w-full max-w-sm border border-[#e2e0d8] p-6 rounded-2xl shadow-lg">
                <button
                  onClick={() => setCurrentPage("home")}
                  className="flex items-center gap-1.5 text-xs text-[#1d9e75] font-semibold mb-4 hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
                </button>

                <h3 className="text-lg font-bold flex items-center gap-2 text-[#2c2c29] border-b border-[#f1efe8] pb-3 mb-4">
                  <ShieldCheck className="w-5 h-5 text-[#1d9e75]" /> Merchant Sign In
                </h3>

                {adminError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl mb-4 leading-normal">
                    ⚠️ {adminError}
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#5f5e5a] uppercase mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="admin"
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      className="w-full border border-[#d3d1c7] px-3.5 py-2.5 rounded-xl bg-[#faf9f6] text-sm focus:outline-none focus:border-[#1d9e75]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5f5e5a] uppercase mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      className="w-full border border-[#d3d1c7] px-3.5 py-2.5 rounded-xl bg-[#faf9f6] text-sm focus:outline-none focus:border-[#1d9e75]"
                    />
                  </div>

                  <button
                    onClick={handleAdminGateLogin}
                    className="w-full bg-[#1d9e75] hover:bg-[#147a5a] text-white py-2.5 rounded-xl text-sm font-bold shadow transition mt-2"
                  >
                    Authenticate
                  </button>

                  <div className="bg-[#faf9f6] p-3 rounded-xl text-[11px] text-[#74736e] leading-relaxed border border-[#e2e0d8] mt-3">
                    <p className="font-semibold text-[#4e4d48] mb-0.5">🔑 Demo Credentials:</p>
                    <p>Username: <strong className="font-mono bg-white px-1 border select-all">admin</strong></p>
                    <p>Password: <strong className="font-mono bg-white px-1 border select-all">Snazar@27</strong></p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= PAGE: HOME ================= */}
          {currentPage === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Emerald Banner / Search */}
              <div className="bg-gradient-to-br from-[#1d9e75] to-[#0d5941] text-white rounded-2xl p-6 md:p-8 shadow-md border border-[#147a5a]">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                  Shop local, delivered fast
                </h1>
                <p className="text-xs md:text-sm text-[#c8f0e3] mt-1.5 font-medium leading-relaxed max-w-xl">
                  {userLocName ? `Showing verified local stores near ${userLocName}` : "Finding optimal shops and pricing closest to you..."}
                </p>

                {/* Search Bar */}
                <div className="mt-5 relative">
                  <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-[#5f5e5a] shrink-0" />
                  <input
                    type="text"
                    placeholder="Search for stores, inventory items, or categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-24 py-3.5 bg-white text-[#2c2c29] text-sm font-medium rounded-xl border-none focus:outline-none shadow-lg focus:ring-2 focus:ring-[#ef9f27]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-20 top-3 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  )}
                  <button className="absolute right-2 top-2 bg-[#ef9f27] hover:bg-[#d68514] text-[#4a1b0c] text-xs font-bold px-4 py-2 rounded-lg transition shadow-md">
                    Search
                  </button>
                </div>
              </div>

              {/* Browse Categories (Bento Grid) - skip if searching */}
              {!searchQuery && (
                <div>
                  <h2 className="text-base font-bold text-[#2c2c29] uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#1d9e75] rounded-full inline-block" />
                    Shop by Category
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {CATS.map((category) => (
                      <motion.div
                        key={category.id}
                        whileHover={{ y: -3, scale: 1.02 }}
                        onClick={() => {
                          setSelectedCatId(category.id);
                          setSelectedShopFilter(null);
                          setCurrentPage("category");
                        }}
                        className="bg-white border border-[#e2e0d8] p-4 rounded-xl cursor-pointer hover:border-[#1d9e75] transition flex items-center gap-3 shadow-sm hover:shadow"
                      >
                        <div className="w-11 h-11 bg-[#e1f5ee] rounded-xl flex items-center justify-center text-2xl shrink-0">
                          {category.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#2c2c29] truncate">{category.name}</p>
                          <p className="text-[10px] text-[#74736e] truncate leading-tight mt-0.5">{category.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Search Results vs Shops Lists */}
              <div>
                <h2 className="text-base font-bold text-[#2c2c29] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#1d9e75] rounded-full inline-block" />
                  {searchQuery ? "Search Results" : "Shops closest to you"}
                </h2>

                <div className="space-y-3">
                  {/* Matching Items (If Search query) */}
                  {searchQuery && getFilteredItems().length > 0 && (
                    <div className="bg-white border border-[#e2e0d8] p-4 rounded-2xl shadow-sm mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#74736e] mb-3">
                        Matching Catalog Items ({getFilteredItems().length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getFilteredItems().map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2.5 rounded-xl border border-[#faf9f6] bg-[#fcfbfa]"
                          >
                            <span className="text-3xl shrink-0 bg-[#f1efe8] w-12 h-12 rounded-lg flex items-center justify-center">
                              {item.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#2c2c29] truncate">{item.name}</p>
                              <p className="text-[10px] text-[#0f4035] font-semibold">🏪 {item.shop}</p>
                              <p className="text-[10px] text-[#74736e]">📍 {getItemDistance(item).toFixed(1)} km away</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold font-mono text-[#2c2c29] mb-1">₹{item.price}</p>
                              <button
                                onClick={() => handleAddToCart(item)}
                                className="bg-[#1d9e75] hover:bg-[#147a5a] text-white text-[10px] font-bold px-2 py-1 rounded transition"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filtered Shops list */}
                  {getFilteredShops().length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {getFilteredShops().map((shop) => (
                        <motion.div
                          key={shop.id}
                          whileHover={{ scale: 1.005 }}
                          onClick={() => {
                            setSelectedShopId(shop.id);
                            setCurrentPage("category");
                          }}
                          className="bg-white border border-[#e2e0d8] p-4 rounded-xl cursor-pointer hover:border-[#1d9e75] hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            <span className="text-3xl w-14 h-14 bg-[#e1f5ee] rounded-2xl flex items-center justify-center shrink-0">
                              {shop.icon}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-[#2c2c29]">{shop.name}</h3>
                                <span className="bg-[#e1f5ee] text-[#085041] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                  {shop.cat}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#74736e] leading-relaxed mt-1 flex flex-wrap items-center gap-1.5">
                                <span>⭐ {shop.rating} ({shop.reviews} reviews)</span>
                                <span>•</span>
                                <span className={shop.open ? "text-[#1d9e75] font-semibold" : "text-[#e24b4a] font-semibold"}>
                                  {shop.open ? "● Open" : "● Closed"}
                                </span>
                                <span>•</span>
                                <span>{shop.addr}</span>
                              </p>
                              {/* Tags pills */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {shop.tags.map((tag) => (
                                  <span key={tag} className="bg-[#f1efe8] text-[#5f5e5a] text-[10px] px-2 py-0.5 rounded-full font-medium">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center md:flex-col md:items-end justify-between border-t md:border-none border-[#f1efe8] pt-2 md:pt-0">
                            <div className="bg-[#e1f5ee] text-[#085041] text-xs font-bold px-3 py-1.5 rounded-full font-mono flex items-center gap-1">
                              <span>📍</span> {getShopDistance(shop).toFixed(1)} km away
                            </div>
                            <span className="hidden md:inline-flex items-center gap-1 text-[#1d9e75] text-xs font-semibold mt-1.5">
                              Browse Catalog <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-[#e2e0d8] p-8 rounded-2xl text-center text-sm text-[#74736e]">
                      No matching merchants or catalog items found. Try different criteria.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= PAGE: CATEGORY ================= */}
          {currentPage === "category" && (
            <motion.div
              key="category"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <button
                onClick={() => {
                  setSelectedCatId(null);
                  setSelectedShopId(null);
                  setSelectedShopFilter(null);
                  setCurrentPage("home");
                }}
                className="flex items-center gap-1 text-xs text-[#1d9e75] font-bold hover:underline mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to dashboard
              </button>

              {/* Catalog Header */}
              {activeCategory && !selectedShopId && (
                <div className="bg-white border border-[#e2e0d8] p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                  <span className="text-4xl bg-[#e1f5ee] w-16 h-16 rounded-2xl flex items-center justify-center shrink-0">
                    {activeCategory.icon}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold">{activeCategory.name}</h2>
                    <p className="text-xs text-[#74736e] leading-relaxed mt-1">{activeCategory.desc}</p>
                  </div>
                </div>
              )}

              {activeShop && (
                <div className="bg-white border border-[#e2e0d8] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl bg-[#e1f5ee] w-16 h-16 rounded-2xl flex items-center justify-center shrink-0">
                      {activeShop.icon}
                    </span>
                    <div>
                      <h2 className="text-xl font-bold">{activeShop.name}</h2>
                      <p className="text-xs text-[#74736e] leading-relaxed mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span>⭐ {activeShop.rating} Rating</span>
                        <span>•</span>
                        <span>{activeShop.addr}</span>
                        <span>•</span>
                        <span className={activeShop.open ? "text-[#1d9e75] font-semibold" : "text-red-500 font-semibold"}>
                          {activeShop.open ? "Open" : "Closed"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="bg-[#e1f5ee] text-[#085041] text-xs font-bold px-3 py-1.5 rounded-full font-mono">
                      📍 {getShopDistance(activeShop).toFixed(1)} km away
                    </span>
                  </div>
                </div>
              )}

              {/* Shop Filters inside Category catalog view */}
              {selectedCatId && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold uppercase text-[#74736e] tracking-wider mr-2 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3 text-[#1d9e75]" /> Filter Store:
                  </span>
                  <button
                    onClick={() => setSelectedShopFilter(null)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                      selectedShopFilter === null
                        ? "bg-[#1d9e75] border-[#1d9e75] text-white"
                        : "bg-white border-[#e2e0d8] text-[#5f5e5a] hover:border-gray-400"
                    }`}
                  >
                    All Stores
                  </button>
                  {Array.from(
                    new Set(
                      inventory
                        .filter((item) => item.cat === activeCategory?.name || item.cat.toLowerCase().includes(selectedCatId || ""))
                        .map((item) => item.shop)
                    )
                  ).map((shopName) => (
                    <button
                      key={shopName}
                      onClick={() => setSelectedShopFilter(shopName)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                        selectedShopFilter === shopName
                          ? "bg-[#1d9e75] border-[#1d9e75] text-white"
                          : "bg-white border-[#e2e0d8] text-[#5f5e5a] hover:border-gray-400"
                      }`}
                    >
                      {shopName}
                    </button>
                  ))}
                </div>
              )}

              {/* Items Catalog List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(selectedShopId
                  ? inventory.filter((item) => item.shop === activeShop?.name)
                  : inventory.filter((item) => {
                      const matchesCategory = item.cat === activeCategory?.name || item.cat.toLowerCase().includes(selectedCatId || "");
                      const matchesFilter = selectedShopFilter ? item.shop === selectedShopFilter : true;
                      return matchesCategory && matchesFilter;
                    })
                ).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[#e2e0d8] rounded-2xl overflow-hidden hover:shadow-md transition flex flex-col"
                  >
                    {/* Item graphic */}
                    <div className="h-32 bg-[#faf9f6] flex items-center justify-center text-5xl select-none relative">
                      {item.icon}
                      <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[10px] font-mono px-2 py-0.5 rounded-full">
                        Qty: {item.qty} left
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-[#5f5e5a] truncate">{item.cat}</p>
                        <h4 className="text-sm font-bold text-[#2c2c29] mt-0.5 line-clamp-1">{item.name}</h4>
                        {!selectedShopId && (
                          <div className="space-y-0.5 mt-1">
                            <p className="text-[10px] text-[#1d9e75] font-semibold truncate">🏪 {item.shop}</p>
                            <p className="text-[10px] text-[#74736e]">📍 {getItemDistance(item).toFixed(1)} km away</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-[#f1efe8] pt-2.5">
                        <span className="text-base font-extrabold font-mono text-[#2c2c29]">₹{item.price}</span>
                        <button
                          onClick={() => handleAddToCart(item)}
                          disabled={item.qty === 0}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer select-none ${
                            item.qty === 0
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-[#1d9e75] hover:bg-[#147a5a] text-white"
                          }`}
                        >
                          {item.qty === 0 ? "Out of Stock" : "+ Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty State checks */}
                {(selectedShopId
                  ? inventory.filter((item) => item.shop === activeShop?.name).length === 0
                  : inventory.filter((item) => {
                      const matchesCategory = item.cat === activeCategory?.name || item.cat.toLowerCase().includes(selectedCatId || "");
                      const matchesFilter = selectedShopFilter ? item.shop === selectedShopFilter : true;
                      return matchesCategory && matchesFilter;
                    }).length === 0
                ) && (
                  <div className="col-span-full bg-white border border-[#e2e0d8] p-8 rounded-2xl text-center text-sm text-[#74736e]">
                    No items available under this catalog filter.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ================= PAGE: CART ================= */}
          {currentPage === "cart" && (
            <motion.div
              key="cart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <button
                onClick={() => setCurrentPage("home")}
                className="flex items-center gap-1 text-xs text-[#1d9e75] font-bold hover:underline mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Continue shopping
              </button>

              <h2 className="text-xl font-bold text-[#2c2c29] border-b border-[#faf9f6] pb-2">Your Shopping Cart</h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Cart list */}
                <div className="lg:col-span-2 space-y-3">
                  {cart.length > 0 ? (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-[#e2e0d8] p-4 rounded-xl flex items-center gap-4"
                      >
                        <span className="text-3xl shrink-0 bg-[#f1efe8] w-12 h-12 rounded-lg flex items-center justify-center">
                          {item.icon}
                        </span>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-[#2c2c29] truncate">{item.name}</h4>
                          <p className="text-[10px] text-[#5f5e5a] mt-0.5">🏪 {item.shop}</p>
                          <p className="text-xs font-bold text-[#1d9e75] font-mono mt-0.5">₹{item.price} each</p>
                        </div>

                        {/* Quantity adjusters */}
                        <div className="flex items-center bg-[#faf9f6] border border-[#d3d1c7] rounded-lg p-0.5">
                          <button
                            onClick={() => handleUpdateCartQty(item.id, -1)}
                            className="p-1.5 hover:bg-[#e2e0d8] rounded transition text-[#2c2c29]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-3 text-xs font-bold font-mono">{item.qty}</span>
                          <button
                            onClick={() => handleUpdateCartQty(item.id, 1)}
                            className="p-1.5 hover:bg-[#e2e0d8] rounded transition text-[#2c2c29]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right shrink-0 min-w-[70px]">
                          <p className="text-sm font-bold font-mono text-[#2c2c29]">₹{item.price * item.qty}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-[#e2e0d8] p-8 rounded-2xl text-center text-sm text-[#74736e]">
                      Shopping cart is currently empty. Go back and select some items!
                    </div>
                  )}
                </div>

                {/* Checkout Summary panel */}
                {cart.length > 0 && (
                  <div className="bg-white border border-[#e2e0d8] p-5 rounded-xl shadow-sm space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#74736e] border-b border-[#f1efe8] pb-2">
                      Cost Breakdown
                    </h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-[#5f5e5a]">
                        <span>Basket Subtotal</span>
                        <span className="font-mono font-medium text-[#2c2c29]">
                          ₹{cart.reduce((acc, item) => acc + item.price * item.qty, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#5f5e5a]">
                        <span>Standard Delivery</span>
                        <span className="font-mono font-medium text-[#2c2c29]">₹30</span>
                      </div>
                      <div className="border-t border-dashed border-[#d3d1c7] my-2" />
                      <div className="flex justify-between text-sm font-bold text-[#2c2c29]">
                        <span>Estimated Total</span>
                        <span className="font-mono">
                          ₹{cart.reduce((acc, item) => acc + item.price * item.qty, 0) + 30}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setCurrentPage("checkout")}
                      className="w-full bg-[#1d9e75] hover:bg-[#147a5a] text-white py-3 rounded-xl font-bold text-sm transition shadow-md"
                    >
                      Proceed to Checkout →
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ================= PAGE: CHECKOUT ================= */}
          {currentPage === "checkout" && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <button
                onClick={() => setCurrentPage("cart")}
                className="flex items-center gap-1 text-xs text-[#1d9e75] font-bold hover:underline mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to cart
              </button>

              <h2 className="text-xl font-bold text-[#2c2c29]">Complete your Order</h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-4">
                  {/* Shipping Form */}
                  <div className="bg-white border border-[#e2e0d8] p-5 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-sm font-bold uppercase text-[#74736e] tracking-wider border-b pb-2 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#1d9e75]" /> 📍 Delivery Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#5f5e5a] uppercase mb-1">Full Name</label>
                        <input
                          type="text"
                          value={checkoutName}
                          onChange={(e) => setCheckoutName(e.target.value)}
                          className="w-full border border-[#d3d1c7] px-3.5 py-2.5 rounded-xl bg-gray-50 text-[#74736e] font-semibold cursor-not-allowed text-sm focus:outline-none"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5f5e5a] uppercase mb-1">Contact Phone</label>
                        <input
                          type="tel"
                          value={checkoutPhone}
                          onChange={(e) => setCheckoutPhone(e.target.value)}
                          className="w-full border border-[#d3d1c7] px-3.5 py-2.5 rounded-xl bg-gray-50 text-[#74736e] font-semibold cursor-not-allowed text-sm focus:outline-none"
                          readOnly
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] uppercase mb-1">Street Address</label>
                      <input
                        type="text"
                        placeholder="House / Apartment no., building street name, landmark"
                        value={checkoutAddress}
                        onChange={(e) => setCheckoutAddress(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#1d9e75] focus:ring-1 focus:ring-[#1d9e75]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#5f5e5a] uppercase mb-1">City</label>
                        <input
                          type="text"
                          placeholder="Your city name"
                          value={checkoutCity || userLocName}
                          onChange={(e) => setCheckoutCity(e.target.value)}
                          className="w-full border border-[#d3d1c7] px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#1d9e75]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5f5e5a] uppercase mb-1">PIN Code</label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 201010"
                          value={checkoutPin}
                          onChange={(e) => setCheckoutPin(e.target.value.replace(/\D/g, ""))}
                          className="w-full border border-[#d3d1c7] px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#1d9e75]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Selection */}
                  <div className="bg-white border border-[#e2e0d8] p-5 rounded-2xl shadow-sm space-y-3">
                    <h3 className="text-sm font-bold uppercase text-[#74736e] tracking-wider border-b pb-2">
                      🛵 Shipping Option
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setDelivMethod("standard")}
                        className={`border rounded-xl p-4 cursor-pointer transition flex items-start gap-3 ${
                          delivMethod === "standard"
                            ? "bg-[#e1f5ee] border-[#1d9e75]"
                            : "bg-white border-[#e2e0d8] hover:border-gray-400"
                        }`}
                      >
                        <div className="w-5 h-5 bg-[#1d9e75]/10 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {delivMethod === "standard" && <div className="w-2.5 h-2.5 rounded-full bg-[#1d9e75]" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#2c2c29]">Standard Delivery</p>
                          <p className="text-xs text-[#5f5e5a] mt-0.5">30–60 mins · ₹30 flat fee</p>
                        </div>
                      </div>

                      <div
                        onClick={() => setDelivMethod("express")}
                        className={`border rounded-xl p-4 cursor-pointer transition flex items-start gap-3 ${
                          delivMethod === "express"
                            ? "bg-[#e1f5ee] border-[#1d9e75]"
                            : "bg-white border-[#e2e0d8] hover:border-gray-400"
                        }`}
                      >
                        <div className="w-5 h-5 bg-[#1d9e75]/10 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {delivMethod === "express" && <div className="w-2.5 h-2.5 rounded-full bg-[#1d9e75]" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#2c2c29]">Express Delivery</p>
                          <p className="text-xs text-[#5f5e5a] mt-0.5">15–20 mins · ₹60 priority fee</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Selection */}
                  <div className="bg-white border border-[#e2e0d8] p-5 rounded-2xl shadow-sm space-y-3">
                    <h3 className="text-sm font-bold uppercase text-[#74736e] tracking-wider border-b pb-2">
                      💳 Preferred Payment
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "upi", name: "UPI / QR Code", icon: <Smartphone className="w-4 h-4" /> },
                        { id: "card", name: "Card Transfer", icon: <CreditCard className="w-4 h-4" /> },
                        { id: "wallet", name: "My Wallet", icon: <Wallet className="w-4 h-4" /> },
                        { id: "cod", name: "Cash on Delivery", icon: <Banknote className="w-4 h-4" /> }
                      ].map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setPayMethod(p.id as any)}
                          className={`border rounded-xl p-3.5 cursor-pointer transition flex flex-col items-center justify-center text-center gap-1.5 ${
                            payMethod === p.id
                              ? "bg-[#e1f5ee] border-[#1d9e75] text-[#085041]"
                              : "bg-white border-[#e2e0d8] text-[#5f5e5a] hover:border-gray-400"
                          }`}
                        >
                          <span className="text-[#1d9e75]">{p.icon}</span>
                          <span className="text-xs font-bold">{p.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* QR block details if UPI */}
                    {payMethod === "upi" && (
                      <div className="bg-[#e6f1fb] border border-[#bcdbf7] p-3 rounded-xl flex items-center gap-3.5 text-xs text-[#1e5080] mt-3">
                        <span className="text-2xl font-bold">📱</span>
                        <div>
                          <p className="font-bold">UPI Payment Proxy Code</p>
                          <p className="mt-0.5">Transfer directly to address: <strong className="font-mono select-all bg-white/70 px-1 border rounded text-[#133557]">localmart@upi</strong></p>
                        </div>
                      </div>
                    )}
                    
                    {payMethod === "card" && (
                      <div className="p-3 bg-gray-50 border rounded-xl space-y-2.5 mt-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="block text-[10px] uppercase font-bold text-[#74736e] mb-1">Card Number</label>
                            <input type="text" placeholder="1234 5678 9012 3456" className="w-full text-xs border bg-white rounded-lg p-2 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-[#74736e] mb-1">CVV</label>
                            <input type="password" maxLength={3} placeholder="123" className="w-full text-xs border bg-white rounded-lg p-2 focus:outline-none text-center" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirm Panel Summary */}
                <div className="space-y-4">
                  <div className="bg-white border border-[#e2e0d8] p-5 rounded-xl shadow-sm space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#74736e] border-b pb-2">
                      Review Purchase
                    </h3>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {cart.map((x) => (
                        <div key={x.id} className="flex justify-between items-center text-xs text-[#444340]">
                          <span className="truncate max-w-[150px]">
                            {x.icon} {x.name} <strong className="text-[10px] text-[#74736e]">×{x.qty}</strong>
                          </span>
                          <span className="font-mono font-medium text-[#2c2c29]">₹{x.price * x.qty}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-[#e2e0d8] pt-3.5 space-y-2 text-xs">
                      <div className="flex justify-between text-[#5f5e5a]">
                        <span>Subtotal</span>
                        <span className="font-mono">₹{cart.reduce((acc, item) => acc + item.price * item.qty, 0)}</span>
                      </div>
                      <div className="flex justify-between text-[#5f5e5a]">
                        <span>Delivery Option</span>
                        <span className="font-mono">₹{delivMethod === "express" ? 60 : 30}</span>
                      </div>
                      <div className="border-t border-[#d3d1c7] pt-2" />
                      <div className="flex justify-between text-base font-extrabold text-[#2c2c29]">
                        <span>Grand Total</span>
                        <span className="font-mono">
                          ₹{cart.reduce((acc, item) => acc + item.price * item.qty, 0) + (delivMethod === "express" ? 60 : 30)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handlePlaceOrder}
                      className="w-full bg-[#1d9e75] hover:bg-[#147a5a] text-white py-3.5 rounded-xl font-bold text-sm transition shadow-md shadow-[#1d9e75]/10"
                    >
                      Authorize Payment & Order
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= PAGE: VOUCHER ================= */}
          {currentPage === "voucher" && latestOrder && (
            <motion.div
              key="voucher"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-xl mx-auto py-4 space-y-4 text-center"
            >
              <div className="flex items-center justify-center mb-2">
                <CheckCircle2 className="w-14 h-14 text-[#1d9e75] drop-shadow-sm" />
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight">Purchase Confirmed!</h2>
              <p className="text-xs text-[#5f5e5a] max-w-sm mx-auto leading-relaxed">
                Thank you for supporting your local neighborhood merchants. Present this invoice voucher to your delivery executive.
              </p>

              {/* Printable Voucher Receipt */}
              <div className="bg-white border-2 border-dashed border-[#1d9e75] rounded-3xl p-6 text-left shadow-lg relative overflow-hidden max-w-md mx-auto my-6 print:border-none print:shadow-none">
                {/* Header ribbon */}
                <div className="bg-[#1d9e75] text-[#ffffff] -mx-6 -mt-6 p-4 text-center mb-4">
                  <h3 className="font-bold text-lg tracking-tight">🛍️ LocalMart Receipt</h3>
                  <p className="text-[11px] text-[#c8f0e3] font-medium uppercase mt-0.5 tracking-wider">
                    Neighborhood Fast Delivery
                  </p>
                </div>

                <div className="flex justify-between text-[11px] font-mono text-[#74736e] pb-1 border-b">
                  <span>Order ID: <strong className="text-gray-900">{latestOrder.id}</strong></span>
                  <span>{latestOrder.date}</span>
                </div>

                <div className="py-2 text-xs">
                  <p className="text-xs text-[#5f5e5a]">📍 Region Location:</p>
                  <p className="font-bold text-[#2c2c29]">{latestOrder.loc}</p>
                </div>

                <div className="my-2 bg-[#e1f5ee] p-3 rounded-xl border border-[#c3ede0]">
                  <p className="text-[10px] uppercase font-bold text-[#085041] tracking-wider">Purchased From Stores:</p>
                  <p className="text-xs font-bold text-[#085041] mt-0.5 leading-normal">{latestOrder.shops.join(", ")}</p>
                </div>

                {/* Items */}
                <div className="py-2.5">
                  <p className="text-[10px] font-extrabold uppercase text-[#74736e] tracking-wider mb-2">Item Breakdown</p>
                  <div className="space-y-2 border-b pb-3 mb-2.5">
                    {latestOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs text-[#2c2c29]">
                        <span>{item.icon} {item.name} ×{item.qty}</span>
                        <span className="font-mono font-medium">₹{item.price * item.qty}</span>
                      </div>
                    ))}
                    
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Delivery Fee ({latestOrder.del === "express" ? "Express" : "Standard"})</span>
                      <span className="font-mono">₹{latestOrder.del === "express" ? 60 : 30}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-base font-extrabold text-[#2c2c29]">
                    <span>Grand Total Paid</span>
                    <span className="font-mono">₹{latestOrder.total}</span>
                  </div>
                </div>

                <div className="border-t border-[#f1efe8] pt-2.5 text-[11px] space-y-1 text-[#5f5e5a]">
                  <p><strong>Payment Mode:</strong> {latestOrder.pay.toUpperCase()}</p>
                  <p><strong>Recipient Name:</strong> {latestOrder.name}</p>
                </div>

                {/* Decorative cut details */}
                <div className="absolute -bottom-4 left-0 right-0 h-4 bg-gradient-to-t from-gray-100 to-transparent" />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setCurrentPage("home")}
                  className="bg-white hover:bg-gray-100 text-[#1d9e75] border border-[#1d9e75] font-bold text-xs px-5 py-2.5 rounded-xl transition"
                >
                  🏠 Return Home
                </button>
                <button
                  onClick={handlePrintVoucher}
                  className="bg-[#1d9e75] hover:bg-[#147a5a] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / PDF Invoice
                </button>
              </div>
            </motion.div>
          )}

          {/* ================= PAGE: MERCHANT ADMIN ================= */}
          {currentPage === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Heading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-[#2c2c29] flex items-center gap-2">
                    🏪 Merchant Dashboard
                  </h2>
                  <p className="text-xs text-[#74736e] mt-1">
                    Manage your localized store, add catalog listings, or process Excel imports.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentPage("home")}
                  className="bg-white border border-[#e2e0d8] hover:border-gray-400 text-xs font-bold px-4 py-2 rounded-xl transition shrink-0 self-start sm:self-center"
                >
                  ← Return to Store
                </button>
              </div>

              {/* Merchant Shop Setup Parameters and Registered Shops Directory (Dual columns for instant Delete visibility!) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Column 1: Store Profile Settings Form */}
                <div className="lg:col-span-7 bg-white border border-[#e2e0d8] p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase text-[#1d9e75] tracking-wider border-b pb-2 flex justify-between items-center">
                    <span>🏪 Active Store Profile</span>
                    <span className="text-[10px] bg-emerald-100 text-[#085041] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                      Currently Editing
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">Registered Shop Name</label>
                      <input
                        type="text"
                        value={merchantShopName}
                        onChange={(e) => setMerchantShopName(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#1d9e75]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">Primary Category</label>
                      <select
                        value={merchantShopCat}
                        onChange={(e) => setMerchantShopCat(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3 py-2 rounded-xl bg-white text-sm focus:outline-none focus:border-[#1d9e75]"
                      >
                        <option>Grocery</option>
                        <option>Garments</option>
                        <option>Medicines</option>
                        <option>Books</option>
                        <option>Stationery</option>
                        <option>Electronics</option>
                        <option>Dairy & Bakery</option>
                        <option>Personal Care</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">Local Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Sector 5, Lal Kuan"
                        value={merchantShopAddr}
                        onChange={(e) => setMerchantShopAddr(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#1d9e75]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">Radius Distance (km)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={merchantShopDist}
                        onChange={(e) => setMerchantShopDist(parseFloat(e.target.value) || 0.5)}
                        className="w-full border border-[#d3d1c7] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#1d9e75]"
                      />
                    </div>
                  </div>

                  {/* Location manual coordinate settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">GPS Latitude (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 28.67000"
                        value={merchantShopLat}
                        onChange={(e) => setMerchantShopLat(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#1d9e75]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">GPS Longitude (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 77.45500"
                        value={merchantShopLng}
                        onChange={(e) => setMerchantShopLng(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#1d9e75]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={captureMerchantLocation}
                    className="w-full bg-white hover:bg-gray-50 border border-[#1d9e75] text-[#1d9e75] text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    📍 Use Current Location (Auto-Fill Coordinates)
                  </button>
                  {merchantLocStatus && (
                    <p className="text-[11px] font-semibold text-center text-[#085041] mt-1">{merchantLocStatus}</p>
                  )}
                </div>

                {/* Column 2: All Registered Shops with instant Delete buttons */}
                <div className="lg:col-span-5 bg-white border border-[#e2e0d8] p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase text-red-700 tracking-wider border-b pb-2 flex justify-between items-center">
                      <span>🏪 Registered Shops ({shops.length})</span>
                      <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
                        Admin Actions
                      </span>
                    </h3>
                    <p className="text-[10px] text-[#74736e] mt-1.5 leading-normal">
                      Click a store name to switch the profile editor to it. Use the red trash button to delete the shop and all its items.
                    </p>

                    <div className="mt-3 divide-y max-h-[220px] overflow-y-auto pr-1 border rounded-xl overflow-hidden bg-[#faf9f6]">
                      {shops.length === 0 ? (
                        <div className="text-center py-8 text-[#74736e] text-xs font-semibold bg-white">
                          No registered shops. Add some items to auto-provision.
                        </div>
                      ) : (
                        shops.map((s) => {
                          const isActive = s.name.toLowerCase() === merchantShopName.toLowerCase();
                          return (
                            <div
                              key={s.id}
                              className={`p-2.5 flex items-center justify-between gap-2.5 transition cursor-pointer hover:bg-white ${
                                isActive ? "bg-emerald-50/50 border-l-4 border-emerald-500" : "bg-white"
                              }`}
                              onClick={() => {
                                setMerchantShopName(s.name);
                                setMerchantShopCat(s.cat);
                                setMerchantShopAddr(s.addr || "");
                                setMerchantShopDist(s.dist);
                                setMerchantShopLat(s.lat !== null ? String(s.lat) : "");
                                setMerchantShopLng(s.lng !== null ? String(s.lng) : "");
                                triggerToast(`Switched active profile to ${s.name}`);
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base shrink-0 bg-white w-7 h-7 rounded border flex items-center justify-center">
                                  {s.icon || "🏪"}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#2c2c29] truncate flex items-center gap-1">
                                    <span>{s.name}</span>
                                    {isActive && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    )}
                                  </p>
                                  <p className="text-[10px] text-[#74736e] truncate">{s.cat} • {s.dist} km</p>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Stop row click switching
                                  handleDeleteShop(s.id);
                                }}
                                className="bg-[#fff1f1] hover:bg-[#ffe3e3] border border-[#ffd5d5] text-[#c53030] p-1.5 rounded-lg transition shrink-0"
                                title={`Delete ${s.name} and catalog`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-red-50/50 border border-red-200/50 p-2.5 rounded-xl text-[10px] text-red-900/80 leading-normal">
                    <strong>⚠️ Caution:</strong> Deleting a registered shop will permanently purge its corresponding product catalog and reset stock indices.
                  </div>
                </div>
              </div>

              {/* TAB SELECTION RAIL */}
              <div className="flex bg-white border border-[#e2e0d8] p-1 rounded-xl gap-1 shadow-sm">
                {[
                  { id: "inventory", label: "📦 Inventory Items", icon: <ClipboardList className="w-4 h-4" /> },
                  { id: "add", label: "➕ Add New Item", icon: <PlusCircle className="w-4 h-4" /> },
                  { id: "upload", label: "📊 Excel Upload", icon: <FileSpreadsheet className="w-4 h-4" /> },
                  { id: "orders", label: "📋 Client Orders", icon: <ClipboardList className="w-4 h-4" /> },
                  { id: "shops", label: "🏪 Registered Shops", icon: <SlidersHorizontal className="w-4 h-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAdminTab(tab.id as any)}
                    className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      activeAdminTab === tab.id
                        ? "bg-[#1d9e75] text-white"
                        : "text-[#5f5e5a] hover:bg-[#faf9f6] hover:text-[#2c2c29]"
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB CONTAINER: INVENTORY */}
              {activeAdminTab === "inventory" && (
                <div className="bg-white border border-[#e2e0d8] rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#faf9f6] text-[#5f5e5a] border-b uppercase font-bold tracking-wider">
                          <th className="p-4">Catalog Item</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Merchant Store</th>
                          <th className="p-4">Price</th>
                          <th className="p-4">Stock Qty</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-medium text-[#2c2c29]">
                        {inventory.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="p-4 flex items-center gap-2">
                              <span className="text-lg bg-[#faf9f6] w-8 h-8 rounded flex items-center justify-center shrink-0 border">
                                {item.icon}
                              </span>
                              <span className="font-bold truncate max-w-[150px]">{item.name}</span>
                            </td>
                            <td className="p-4 font-semibold text-[#5f5e5a]">{item.cat}</td>
                            <td className="p-4 font-semibold text-[#1d9e75] truncate max-w-[120px]">{item.shop}</td>
                            <td className="p-4 font-mono font-bold">₹{item.price}</td>
                            <td className="p-4 font-mono">{item.qty}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  item.qty > 50
                                    ? "bg-[#e1f5ee] text-[#085041]"
                                    : item.qty > 10
                                    ? "bg-[#faeeda] text-[#633806]"
                                    : "bg-[#fcebeb] text-[#a32d2d]"
                                }`}
                              >
                                {item.qty > 50 ? "In Stock" : item.qty > 10 ? "Low Stock" : "Critical"}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleRemoveInventoryItem(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition"
                                title="Delete catalog item"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {inventory.length === 0 && (
                    <div className="p-8 text-center text-sm text-[#74736e]">
                      No catalog inventory listed yet. Create one manually or upload spreadsheet.
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTAINER: ADD ITEM */}
              {activeAdminTab === "add" && (
                <div className="bg-white border border-[#e2e0d8] p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#74736e] border-b pb-1.5">
                    Register Item under {merchantShopName}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">Item Title Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Organic Strawberries 250g"
                        value={addItemName}
                        onChange={(e) => setAddItemName(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:border-[#1d9e75]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">Item Category</label>
                      <select
                        value={addItemCat}
                        onChange={(e) => setAddItemCat(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3.5 py-2 rounded-xl bg-white text-sm focus:outline-none"
                      >
                        <option>Grocery</option>
                        <option>Garments</option>
                        <option>Medicines</option>
                        <option>Books</option>
                        <option>Stationery</option>
                        <option>Electronics</option>
                        <option>Dairy & Bakery</option>
                        <option>Personal Care</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">Selling Price (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 120"
                        value={addItemPrice}
                        onChange={(e) => setAddItemPrice(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3.5 py-2 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">In-Stock Quantity</label>
                      <input
                        type="number"
                        placeholder="e.g. 100"
                        value={addItemQty}
                        onChange={(e) => setAddItemQty(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3.5 py-2 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5f5e5a] mb-1">Single Character Emoji Icon</label>
                      <input
                        type="text"
                        placeholder="e.g. 🍓"
                        maxLength={4}
                        value={addItemIcon}
                        onChange={(e) => setAddItemIcon(e.target.value)}
                        className="w-full border border-[#d3d1c7] px-3.5 py-2 rounded-xl text-sm focus:outline-none text-center"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddNewItem}
                    className="w-full bg-[#1d9e75] hover:bg-[#147a5a] text-white py-3 rounded-xl font-bold text-sm shadow transition"
                  >
                    Publish to Store Inventory
                  </button>
                </div>
              )}

              {/* TAB CONTAINER: EXCEL UPLOAD */}
              {activeAdminTab === "upload" && (
                <div className="space-y-4">
                  {/* File Upload zone with full drag & drop support */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                      dragOver
                        ? "bg-[#e1f5ee] border-[#1d9e75]"
                        : "bg-white border-[#d3d1c7] hover:border-[#1d9e75] hover:bg-[#faf9f6]"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                    />

                    <FileSpreadsheet className="w-12 h-12 text-[#1d9e75] mx-auto mb-3" />
                    <strong className="text-base text-[#2c2c29] block">Upload Inventory Spreadsheet</strong>
                    <p className="text-xs text-[#5f5e5a] mt-1">
                      Drag & Drop your <code className="bg-[#faf9f6] border px-1 rounded">.xlsx</code>, <code className="bg-[#faf9f6] border px-1 rounded">.xls</code>, or <code className="bg-[#faf9f6] border px-1 rounded">.csv</code> file, or click to browse
                    </p>

                    <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] font-semibold text-[#74736e]">
                      <span>Required Columns:</span>
                      <span className="bg-[#faf9f6] px-2 py-0.5 rounded border">Name</span>
                      <span className="bg-[#faf9f6] px-2 py-0.5 rounded border">Category</span>
                      <span className="bg-[#faf9f6] px-2 py-0.5 rounded border">Price</span>
                      <span className="bg-[#faf9f6] px-2 py-0.5 rounded border">Quantity</span>
                      <span className="bg-[#faf9f6] px-2 py-0.5 rounded border">Icon (Emoji)</span>
                    </div>
                  </div>

                  {excelPreview && (
                    <div className="p-3 bg-[#e1f5ee] border border-[#a2ebd2] rounded-xl text-xs text-[#085041] font-semibold leading-relaxed">
                      {excelPreview}
                    </div>
                  )}

                  <div className="bg-[#faeeda] border border-[#f1dcb8] p-4 rounded-xl text-xs text-[#7c541c] space-y-1.5 leading-relaxed">
                    <p className="font-bold uppercase tracking-wider">💡 Excel Integration Blueprint Notes</p>
                    <p>
                      1. Adding items automatically links them to <strong>{merchantShopName}</strong>. If the store isn't registered, we'll auto-provision it.
                    </p>
                    <p>
                      2. All imported products and merchants are saved dynamically to local cache. They remain persistent after refreshing the browser tab.
                    </p>
                    <p className="font-semibold mt-1">Sample Row Schema:</p>
                    <p className="font-mono bg-white/60 p-1.5 rounded border">Tata Salt 1kg | Grocery | 25 | 200 | 🧂</p>
                  </div>
                </div>
              )}

              {/* TAB CONTAINER: REGISTERED SHOPS */}
              {activeAdminTab === "shops" && (
                <div className="bg-white border border-[#e2e0d8] rounded-2xl overflow-hidden shadow-sm p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-3">
                    <div>
                      <h3 className="text-sm font-bold uppercase text-[#1d9e75] tracking-wider">
                        🏪 Registered Shops Directory ({shops.length})
                      </h3>
                      <p className="text-[11px] text-[#74736e] mt-0.5">
                        Removing a shop will automatically delete all of its listed catalog items as well.
                      </p>
                    </div>
                  </div>

                  {shops.length === 0 ? (
                    <div className="text-center py-8 text-[#74736e] text-xs font-semibold">
                      No shops are registered. Register new items or use excel upload to auto-provision.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#faf9f6] text-[#5f5e5a] border-b uppercase font-bold tracking-wider">
                            <th className="p-3">Store Name</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Address</th>
                            <th className="p-3">Radius Distance</th>
                            <th className="p-3">Coordinates (Lat, Lng)</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-medium text-[#2c2c29]">
                          {shops.map((shop) => (
                            <tr key={shop.id} className="hover:bg-gray-50/50">
                              <td className="p-3 flex items-center gap-2.5">
                                <span className="text-lg bg-[#faf9f6] w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border">
                                  {shop.icon || "🏪"}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-bold block truncate max-w-[150px]">{shop.name}</span>
                                  <span className="text-[10px] text-[#74736e]">ID: {shop.id}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-bold">
                                  {shop.cat}
                                </span>
                              </td>
                              <td className="p-3 text-[#74736e] truncate max-w-[150px]">{shop.addr || "N/A"}</td>
                              <td className="p-3 font-mono">{shop.dist} km</td>
                              <td className="p-3 font-mono text-[#74736e]">
                                {shop.lat !== null && shop.lng !== null
                                  ? `${shop.lat.toFixed(5)}, ${shop.lng.toFixed(5)}`
                                  : "Not set"}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDeleteShop(shop.id)}
                                  className="bg-[#fff1f1] hover:bg-[#ffe3e3] text-[#c53030] p-2 rounded-xl transition border border-[#ffd5d5] inline-flex items-center justify-center"
                                  title={`Delete "${shop.name}" and its catalog items`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTAINER: ORDERS */}
              {activeAdminTab === "orders" && (
                <div className="space-y-3">
                  {orders.length > 0 ? (
                    orders.map((o) => (
                      <div
                        key={o.id}
                        className="bg-white border border-[#e2e0d8] p-4 rounded-xl shadow-sm space-y-2.5 text-xs text-[#2c2c29]"
                      >
                        <div className="flex justify-between font-bold border-b pb-1.5">
                          <span className="text-[#1d9e75] text-sm">ID: {o.id}</span>
                          <span className="text-[#5f5e5a]">{o.date}</span>
                        </div>

                        <div>
                          <p className="text-[#74736e]">📍 Client Location Delivery:</p>
                          <p className="font-bold text-sm mt-0.5">{o.loc}</p>
                        </div>

                        <div>
                          <p className="text-[#74736e] mb-1">Purchased items ({o.items.length}):</p>
                          <div className="bg-[#faf9f6] p-2 rounded-lg border flex flex-wrap gap-1.5 font-medium">
                            {o.items.map((it) => (
                              <span key={it.id} className="bg-white px-2 py-1 rounded border text-[10px] text-gray-800">
                                {it.icon} {it.name} (×{it.qty})
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t pt-2 mt-2">
                          <span className="text-sm font-extrabold text-[#2c2c29]">₹{o.total}</span>
                          <span className="bg-[#e1f5ee] text-[#085041] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Confirmed
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-[#e2e0d8] p-8 rounded-2xl text-center text-sm text-[#74736e]">
                      No orders placed in this session/neighborhood yet.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- FOOTER CARD --- */}
      <footer className="mt-12 bg-white border-t border-[#e2e0d8] py-6 text-center text-xs text-[#74736e]">
        <div className="max-w-5xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-gray-800">🛍️ LocalMart — Hyperlocal Community Marketplace</p>
          <p>Created securely. All local data is persisted inside your client browser.</p>
        </div>
      </footer>
    </div>
  );
}
