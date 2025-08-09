// middleware/admin.js
export const adminMiddleware = (req, res, next) => {
    // Assuming `req.user.role` exists from authMiddleware
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied: Admins only" });
    }
    next();
};
