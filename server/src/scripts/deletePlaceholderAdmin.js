/* eslint-disable no-undef */
import "dotenv/config";
import mongoose from "mongoose";

import Admin from "../models/Admin.js";

async function deleteAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing.");
    }

    if (!email) {
      throw new Error("ADMIN_EMAIL must be set in .env.");
    }

    const normalizedEmail = email.toLowerCase().trim();

    await mongoose.connect(process.env.MONGODB_URI);

    const result = await Admin.deleteOne({
      email: normalizedEmail,
    });

    if (result.deletedCount === 1) {
      console.log(`Admin deleted successfully: ${normalizedEmail}`);
    } else {
      console.log(`Admin was not found: ${normalizedEmail}`);
    }
  } catch (error) {
    console.error("Delete admin failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

deleteAdmin();