import express from "express";
import Admin from "../models/Admin.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  comparePassword,
  createAdminToken,
  hashPassword,
} from "../utils/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await comparePassword(
      password,
      admin.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = createAdminToken(admin);

    return res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| CURRENT ADMIN
|--------------------------------------------------------------------------
*/
router.get("/me", requireAdmin, async (req, res) => {
  return res.json({
    success: true,
    admin: {
      id: req.admin._id,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
});

/*
|--------------------------------------------------------------------------
| CHANGE PASSWORD
|--------------------------------------------------------------------------
*/
router.patch("/password", requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 10) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 10 characters.",
      });
    }

    const passwordMatches = await comparePassword(
      currentPassword,
      req.admin.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    req.admin.passwordHash = await hashPassword(newPassword);
    req.admin.passwordChangedAt = new Date();

    await req.admin.save();

    return res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE ADMIN ACCOUNT
|--------------------------------------------------------------------------
*/
router.delete("/account", requireAdmin, async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    if (!password || confirmation !== "DELETE MY ACCOUNT") {
      return res.status(400).json({
        success: false,
        message: 'Enter your password and type "DELETE MY ACCOUNT".',
      });
    }

    const passwordMatches = await comparePassword(
      password,
      req.admin.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect.",
      });
    }

    await Admin.findByIdAndDelete(req.admin._id);

    return res.json({
      success: true,
      message: "Admin account deleted.",
    });
  } catch (error) {
    console.error("Delete admin account error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete admin account.",
    });
  }
});

export default router;