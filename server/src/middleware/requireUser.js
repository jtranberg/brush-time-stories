import User from "../models/User.js";
import { verifyUserToken } from "../utils/auth.js";

export default async function requireUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "User authentication required.",
      });
    }

    const token = authHeader.slice(7);
    const decoded = verifyUserToken(token);

    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid user token.",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("User auth error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired user session.",
    });
  }
}