import rateLimit from "express-rate-limit";

export const reviewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 60 req/minute per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again shortly." }
});
