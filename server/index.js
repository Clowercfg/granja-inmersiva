import "dotenv/config";
import express from "express";
import cors from "cors";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { initDb, getDb, saveDb } from "./db.js";
import { createDepositsRouter } from "./routes/deposits.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const DB_PATH = join(__dirname, process.env.DB_PATH || "./data/harvest-valley.db");

const app = express();
app.use(cors());
app.use(express.json());

async function start() {
  await initDb(DB_PATH);

  app.use("/api", createDepositsRouter(DB_PATH));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`Harvest Valley API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
