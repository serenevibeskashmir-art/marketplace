import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import twilio from "twilio";
import fs from "fs";

// In-memory cache for storing OTPs during a session
// Key: phone number, Value: { code: string, expires: number }
const otpCache = new Map<string, { code: string; expires: number }>();

const DATA_FILE = path.join(process.cwd(), "data_store.json");

function readDataStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading data store file:", err);
  }
  return {};
}

function writeDataStore(data: any) {
  try {
    const current = readDataStore();
    const updated = { ...current, ...data };
    fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing data store file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" })); // Support large inventories

  // API Route: Get all shared cloud data (Shops, Inventory, Orders)
  app.get("/api/data", (req, res) => {
    try {
      const data = readDataStore();
      res.json({
        shops: data.shops || null,
        inventory: data.inventory || null,
        orders: data.orders || null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Sync shops
  app.post("/api/data/shops", (req, res) => {
    try {
      const { shops } = req.body;
      if (Array.isArray(shops)) {
        writeDataStore({ shops });
        return res.json({ success: true, message: "Shops synced successfully!" });
      }
      res.status(400).json({ error: "Invalid shops array" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Sync inventory
  app.post("/api/data/inventory", (req, res) => {
    try {
      const { inventory } = req.body;
      if (Array.isArray(inventory)) {
        writeDataStore({ inventory });
        return res.json({ success: true, message: "Inventory synced successfully!" });
      }
      res.status(400).json({ error: "Invalid inventory array" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Sync orders
  app.post("/api/data/orders", (req, res) => {
    try {
      const { orders } = req.body;
      if (Array.isArray(orders)) {
        writeDataStore({ orders });
        return res.json({ success: true, message: "Orders synced successfully!" });
      }
      res.status(400).json({ error: "Invalid orders array" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Send SMS OTP
  app.post("/api/otp/send", async (req, res) => {
    try {
      const { name, phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const cleanPhone = phone.trim().replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }

      // Generate a secure 4-digit code
      const otp = String(Math.floor(1000 + Math.random() * 9000));
      const expires = Date.now() + 5 * 60 * 1000; // 5 minutes validity
      otpCache.set(cleanPhone, { code: otp, expires });

      // Retrieve Twilio configurations
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      const isTwilioConfigured = !!(accountSid && authToken && twilioPhone);

      if (isTwilioConfigured) {
        try {
          const client = twilio(accountSid, authToken);
          // Format phone with plus if not already present
          const formattedTo = phone.trim().startsWith("+") ? phone.trim() : `+91${cleanPhone}`; // Default to Indian country code +91 if no country code provided, or let user type full

          const message = await client.messages.create({
            body: `LocalMart: Your verification OTP is ${otp}. Valid for 5 mins.`,
            from: twilioPhone.trim(),
            to: formattedTo,
          });

          console.log(`[Twilio SMS] Sent message SID ${message.sid} to ${formattedTo}`);
          return res.json({
            success: true,
            simulated: false,
            message: "SMS sent successfully!",
          });
        } catch (twilioErr: any) {
          console.error("[Twilio Error]", twilioErr);
          // Fall back gracefully with detail so the user knows what failed
          return res.json({
            success: true,
            simulated: true,
            otp,
            error: `Twilio error: ${twilioErr.message}. Falling back to demo mode code.`,
          });
        }
      } else {
        // Simulated fallback mode
        console.log(`[SMS Simulation] OTP for ${cleanPhone} is ${otp}`);
        return res.json({
          success: true,
          simulated: true,
          otp,
          message: "No Twilio credentials found. Simulated SMS successfully.",
        });
      }
    } catch (err: any) {
      console.error("[OTP Send Error]", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // API Route: Verify SMS OTP
  app.post("/api/otp/verify", (req, res) => {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ error: "Phone and OTP code are required" });
      }

      const cleanPhone = phone.trim().replace(/\D/g, "");
      const cached = otpCache.get(cleanPhone);

      if (!cached) {
        return res.status(400).json({ error: "No code was requested for this phone number." });
      }

      if (Date.now() > cached.expires) {
        otpCache.delete(cleanPhone);
        return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
      }

      if (cached.code !== otp.trim()) {
        return res.status(400).json({ error: "Invalid verification code." });
      }

      // Successful verification
      otpCache.delete(cleanPhone);
      res.json({ success: true, message: "Verification successful!" });
    } catch (err: any) {
      console.error("[OTP Verify Error]", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware for development or Static Asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
