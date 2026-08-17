import "dotenv/config";
import express from "express";
import cors from "cors";
import { getDb } from "./db.js";
import paymentsRouter from "./routes/payments.js";

process.on("unhandledRejection", (err) => {
  console.error("[Unhandled Rejection]", err);
});

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || "./data/harvest-valley.db";

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5174",
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

app.use("/api/payments", paymentsRouter);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, sandbox: process.env.NOWPAYMENTS_SANDBOX === "true", timestamp: new Date().toISOString() });
});

async function main() {
  await getDb(DB_PATH);
  console.log("📦 Database ready");
  app.listen(PORT, () => {
    console.log(`\n🌾 Harvest Valley API running on http://localhost:${PORT}`);
    console.log(`🧪 Sandbox mode: ${process.env.NOWPAYMENTS_SANDBOX === "true" ? "YES" : "NO"}`);
    console.log(`📦 Database: ${DB_PATH}\n`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
