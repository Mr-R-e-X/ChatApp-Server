/**
 * Import necessary modules from Mongoose.
 *
 * - `Schema`: To define the structure of the MongoDB document.
 * - `models`: To retrieve existing models.
 * - `model`: To create new models.
 */
import mongoose, { Schema, model } from "mongoose";

/**
 * Mongoose schema for the Request model.
 *
 * @typedef {Object} Request
 * @property {string} status - The status of the request ("pending", "accepted", or "rejected").
 * @property {Schema.Types.ObjectId} sender - The ID of the user sending the request.
 * @property {Schema.Types.ObjectId} receiver - The ID of the user receiving the request.
 *
 * @extends Schema
 */
const requestSchema = new Schema(
  {
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "rejected"],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Mongoose model for requests.
 *
 * The Request model is used to create and retrieve request documents from the database. It uses the
 * `requestSchema` to enforce the structure of the documents.
 *
 * @type {mongoose.models<Request>}
 */

export const Request =
  mongoose.models.Request || mongoose.model("Request", requestSchema);
