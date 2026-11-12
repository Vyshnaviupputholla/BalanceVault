

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const prisma = require("./db/prisma");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const accountRoutes = require("./routes/accounts");
const rateLimiter = require("./middleware/rateLimiter");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));

app.use(express.json());
app.use("/api", rateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/accounts", accountRoutes);
// Backend health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "BalanceVault backend is running"
  });
});

// Database readiness check
app.get("/ready", async (req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");

    res.status(200).json({
      status: "ready",
      database: "connected"
    });
  } catch (error) {
    res.status(503).json({
      status: "not_ready",
      database: "disconnected"
    });
  }
});

app.listen(PORT, () => {
  console.log(`BalanceVault backend running on port ${PORT}`);
});
