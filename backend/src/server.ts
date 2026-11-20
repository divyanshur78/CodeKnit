
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
import { pool } from "./config/database";
import authRoutes from "./routes/authRoutes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CodeKnit backend is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/api/db-health", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS time"
    );

    res.status(200).json({
      success: true,
      message: "Database connection is healthy",
      database: result.rows[0].database,
      timestamp: result.rows[0].time
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      message: "Database connection unavailable"
    });
  }
});

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`CodeKnit backend running at http://localhost:${PORT}`);
});
