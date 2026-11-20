
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CodeKnit backend is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`CodeKnit backend running at http://localhost:${PORT}`);
});
