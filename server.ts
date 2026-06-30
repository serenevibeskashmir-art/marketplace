import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import twilio from "twilio";
import { Pool } from "pg";

// In-memory cache for storing OTPs during a session
// Key: phone number, Value: { code: string, expires: number }
const otpCache = new Map<string, { code: string; expires: number }>();

// --- POSTGRES SETUP ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
}

// NOTE: these no longer silently swallow errors and return {} — they throw,
// so the API routes that call them can report a real 500 with the actual
// Postgres error instead of pretending the database is "empty". The old
// silent-failure behavior was the most likely root cause of "shops don't
// sync across devices": if DATABASE_URL was missing/misconfigured in the
// deployed environment, every /api/data call would quietly return {} forever,
// so no device could ever see another device's data.
async function readDataStore(): Promise<any> {
  const result = await pool.query(`SELECT key, value FROM app_data`);
  const data: any = {};
  for (const row of result.rows) {
    data[row.key] = row.value;
  }
  return data;
}

async function writeDataStore(data: any) {
  const entries = Object.entries(data);
  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO app_data (key, value, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (key)
       DO UPDATE SET value = $2, updated_at = now()`,
      [key, JSON.stringify(value)]
    );
  }
}

async function startServer() {
  await ensureTable();

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" })); // Support large inventories

  // API Route: Get all shared cloud data (Shops, Inventory, Orders)
  app.get("/api/data", async (req, res) => {
    try {
      const data = await readDataStore();
      res.json({
        shops: data.shops || null,
        inventory: data.inventory || null,
        orders: data.orders || null,
      });
    } catch (err: any) {
      console.error("[/api/data] failed to read from Postgres:", err);
      res.status(500).json({ error: err.message || "Failed to read data store" });
    }
  });

  // API Route: Sync shops
  app.post("/api/data/shops", async (req, res) => {
    try {
      const { shops } = req.body;
      if (Array.isArray(shops)) {
        await writeDataStore({ shops });
        return res.json({ success: true, message: "Shops synced successfully!" });
      }
      res.status(400).json({ error: "Invalid shops array" });
    } catch (err: any) {
      console.error("[/api/data/shops] failed to write to Postgres:", err);
      res.status(500).json({ error: err.message || "Failed to write shops" });
    }
  });

  // API Route: Sync inventory
  app.post("/api/data/inventory", async (req, res) => {
    try {
      const { inventory } = req.body;
      if (Array.isArray(inventory)) {
        await writeDataStore({ inventory });
        return res.json({ success: true, message: "Inventory synced successfully!" });
      }
      res.status(400).json({ error: "Invalid inventory array" });
    } catch (err: any) {
      console.error("[/api/data/inventory] failed to write to Postgres:", err);
      res.status(500).json({ error: err.message || "Failed to write inventory" });
    }
  });

  // API Route: Sync orders
  app.post("/api/data/orders", async (req, res) => {
    try {
      const { orders } = req.body;
      if (Array.isArray(orders)) {
        await writeDataStore({ orders });
        return res.json({ success: true, message: "Orders synced successfully!" });
      }
      res.status(400).json({ error: "Invalid orders array" });
    } catch (err: any) {
      console.error("[/api/data/orders] failed to write to Postgres:", err);
      res.status(500).json({ error: err.message || "Failed to write orders" });
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

startServer().catch((err) => {
  console.error("[FATAL] Failed to start server (likely a Postgres connection issue):", err);
  process.exit(1);
});
