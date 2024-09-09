/**
 * Import necessary modules from Mongoose.
 *
 * - `Schema`: To define the structure of the MongoDB document.
 * - `models`: To retrieve existing models.
 * - `model`: To create new models.
 */
import mongoose, { Schema } from "mongoose";

/**
 * Mongoose schema for the Message model.
 *
 * This schema represents a message in a chat application. It includes the content of the message,
 * the sender's user ID, the associated chat ID, and any attachments associated with the message.
 *
 * @typedef {Object} Message
 * @property {string} content - The content of the message.
 * @property {Schema.Types.ObjectId} sender - The ID of the user who sent the message.
 * @property {Schema.Types.ObjectId} chat - The ID of the chat to which the message belongs.
 * @property {Array<Object>} attachments - A list of attachments included with the message.
 * @property {string} attachments.publicId - The public ID of the attachment.
 * @property {string} attachments.url - The URL of the attachment.
 *
 * @extends Schema
 */

const messageSchema = new Schema(
  {
    content: String,
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    attachments: [
      {
        publicId: { type: String, required: true },
        url: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

/**
 * Mongoose model for messages.
 *
 * The Message model is used to create and manage message documents in the MongoDB database.
 *
 * @type {mongoose.models<Message>}
 */
export const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
