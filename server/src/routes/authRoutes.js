import express from "express";

import User from "../models/User.js";
import requireUser from "../middleware/requireUser.js";
import {
  comparePassword,
  createUserToken,
  hashPassword,
} from "../utils/auth.js";

const router = express.Router();

/* =========================================================
   REGISTER
   ========================================================= */

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (password.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 10 characters.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account already exists with that email.",
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
    });

    const token = createUserToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error) {
    console.error("User registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
});

/* =========================================================
   LOGIN
   ========================================================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await comparePassword(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = createUserToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error) {
    console.error("User login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in.",
    });
  }
});

/* =========================================================
   CURRENT USER
   ========================================================= */

router.get("/me", requireUser, async (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      subscriptionStatus: req.user.subscriptionStatus,
      subscriptionPlan: req.user.subscriptionPlan,
    },
  });
});

/* =========================================================
   CHANGE PASSWORD
   ========================================================= */

router.patch("/password", requireUser, async (req, res) => {
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
      req.user.passwordHash,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    req.user.passwordHash = await hashPassword(newPassword);
    req.user.passwordChangedAt = new Date();

    await req.user.save();

    return res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change user password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password.",
    });
  }
});

/* =========================================================
   DELETE ACCOUNT
   ========================================================= */

router.delete("/account", requireUser, async (req, res) => {
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
      req.user.passwordHash,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect.",
      });
    }

    await User.findByIdAndDelete(req.user._id);

    return res.json({
      success: true,
      message: "Account deleted.",
    });
  } catch (error) {
    console.error("Delete user account error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete account.",
    });
  }
});

export default router;