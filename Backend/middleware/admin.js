// middleware/admin.js
export const adminMiddleware = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Authentication required."
                }
            });
        }
        console.table(req.user);
        // Check if user has admin role
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "Admin access required."
                }
            });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Authorization error."
            }
        });
    }
};
