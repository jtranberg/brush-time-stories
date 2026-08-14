/* eslint-disable no-undef */
import "dotenv/config";
import mongoose from "mongoose";

import Admin from "../models/Admin.js";
import { hashPassword } from "../utils/auth.js";

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing.");
    }

    if (!email || !password) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env."
      );
    }

    if (password.length < 10) {
      throw new Error(
        "ADMIN_PASSWORD must be at least 10 characters."
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const existingAdmin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingAdmin) {
      console.log(`Admin already exists: ${existingAdmin.email}`);
      return;
    }

    const passwordHash = await hashPassword(password);

    const admin = await Admin.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "ADMIN",
    });

    console.log(`Admin created successfully: ${admin.email}`);
  } catch (error) {
    console.error("Create admin failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();