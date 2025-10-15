import rateLimit from 'express-rate-limit';


export const reviewLimiter = rateLimit({
windowMs: 60 * 1000, // 1 min
limit: 30, // 30 requests/min/IP
standardHeaders: 'draft-7',
legacyHeaders: false,
});