/**
 * Import necessary modules.
 *
 * - `Schema`, `models`, `model` from Mongoose: Used to define and interact with MongoDB models.
 * - `bcrypt`: A library for hashing passwords and other sensitive data.
 */
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

/**
 * Mongoose schema for the OTP model.
 *
 * This schema represents an OTP (One-Time Password) associated with a user. It includes the user ID,
 * the OTP itself, and the creation timestamp. The `otp` field is hashed before being saved to the database.
 * The document will automatically expire 600 seconds (10 minutes) after creation.
 *
 * @typedef {Object} OTP
 * @property {Schema.Types.ObjectId} userId - The ID of the user associated with the OTP.
 * @property {string} otp - The hashed OTP.
 * @property {Date} createdAt - The timestamp when the OTP was created.
 *
 * @extends Schema
 */
const otpSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

/**
 * Pre-save middleware to hash the OTP.
 *
 * This middleware runs before an OTP document is saved. It checks if the `otp` field has been modified,
 * and if so, hashes the OTP using bcrypt.
 *
 * @function
 * @name preSave
 * @memberof OTP
 * @param {Function} next - The next middleware function.
 */
userOtpSchema.pre("save", async function (next) {
  if (!this.isModified("otp")) return next();
  this.otp = await bcrypt.hash(this.otp, 12);
});

/**
 * Method to compare a plain OTP with the hashed OTP.
 *
 * This method takes a plain OTP, hashes it, and compares it with the hashed OTP stored in the database.
 *
 * @function
 * @name compareOtp
 * @memberof OTP
 * @param {string} otp - The plain OTP to compare.
 * @returns {Promise<boolean>} - Returns true if the OTP matches, false otherwise.
 */
userOtpSchema.methods.compareOtp = async function (otp) {
  return await bcrypt.compare(otp, this.otp);
};

/**
 * Mongoose model for OTPs.
 *
 * The OTP model is used to create and manage OTP documents in the MongoDB database.
 *
 * @type {mongoose.models<OTP>}
 */
export const OTP = mongoose.models.OTP || mongoose.model("OTP", otpSchema);
