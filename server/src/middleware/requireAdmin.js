import Admin from "../models/Admin.js";
import { verifyAdminToken } from "../utils/auth.js";

export default async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required.",
      });
    }

    const token = authHeader.slice(7);

    const decoded = verifyAdminToken(token);

    if (!decoded?.adminId || decoded.role !== "ADMIN") {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token.",
      });
    }

    const admin = await Admin.findById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin account no longer exists.",
      });
    }

    req.admin = admin;

    next();
  } catch (error) {
    console.error("Admin auth error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin session.",
    });
  }
}