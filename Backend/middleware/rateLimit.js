import rateLimit from 'express-rate-limit';


// For Redis Store

export const rateLimitMiddleware = (options = {}) => {
    const defaultOptions = {
        windowMs: 60 * 1000, // 1 min
        max: 100, // each iP tp 100 req per windowMs
        message: {
            success: false,
            error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: "Too many requests from this IP, please try again later."
            }
        },
        standardHeaders: true, // for 'RateLimit-*' headers
        legacyHeaders: false,  // disable 'X-RateLimit-*' headers
        
        KeyGenerator: (req) => {
            return req.user?.id || req.ip;
        },

        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: {
                    code: "RATE_LIMIT_EXCEEDED",
                    message: options.message || "Too many requests, please try again later."
                }
            });
        },

        skipSuccessfulRequests: false,
        skipFailedRequests: false,

    };

    const config = { ...defaultOptions, ...options};

    return rateLimit(config);
};

// For different endpoint types

export const standardRateLimit = rateLimitMiddleware({
    windowMs: 60 * 1000, 
    max: 100, // 100 req/min
    message: "Too many requests, please try again later."
});

export const bulkOperationRateLimit = rateLimitMiddleware({
    windowMs: 60 * 1000,
    max: 10, // 10 req/min
    message: "Too many bulk operations, please try again later."
});

export const fileUploadRateLimit = rateLimitMiddleware({
    windowMs: 60 * 1000,
    max: 5,
    message: "Too many file upload requests, please try again later."
});

export const authRateLimit = rateLimitMiddleware({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many authentication attempts, please try again later.",
    skipSuccessfulRequests: true
});


