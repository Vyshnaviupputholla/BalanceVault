
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
});

redisClient.on("error", (error) => {
  console.error("Redis error:", error.message);
});

const redisReady = redisClient.connect();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args)
  }),
  message: {
    message: "Too many requests. Please try again later."
  }
});

module.exports = async (req, res, next) => {
  try {
    await redisReady;
    return limiter(req, res, next);
  } catch (error) {
    console.error("Rate limiter error:", error.message);
    return res.status(503).json({
      message: "Rate limiting service unavailable"
    });
  }
};
