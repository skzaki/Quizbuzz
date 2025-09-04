// middleware/validation.js
import { validationResult } from 'express-validator';
import { contestsQuerySchema } from '../Models/zodSchema.js';

// Express validator error handler
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid input data",
                details: errors.array().map(error => ({
                    field: error.param,
                    message: error.msg,
                    value: error.value
                }))
            }
        });
    }
    
    next();
};

// Validate query parameters for contest list endpoint

export const validateContestQuery = (req, res, next) => {
    try {
        const validation = contestsQuerySchema.safeParse(req.query);
        
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid query parameters",
                    details: validation.error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                        value: err.input
                    }))
                }
            });
        }
        
        // Replace query with validated data
        req.query = validation.data;
        next();
    } catch (error) {
        console.error('Query validation error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Query validation error"
            }
        });
    }
};

// Validate MongoDB ObjectId parameter
export const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: `Invalid ${paramName} format`,
                    details: [
                        {
                            field: paramName,
                            message: "Must be a valid 24-character MongoDB ObjectId"
                        }
                    ]
                }
            });
        }
        
        next();
    };
};