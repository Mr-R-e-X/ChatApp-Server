/**
 * Import necessary modules from Mongoose.
 *
 * - `Schema`: Used to define the structure of MongoDB documents.
 * - `models`: Used to retrieve existing models.
 * - `model`: Used to create new models.
 */
import mongoose, { Schema } from "mongoose";

/**
 * Mongoose schema for the Chat model.
 *
 * This schema represents a chat in a chat application. It includes the name of the chat, a flag indicating if it is a group chat, the user who created the chat, and the members of the chat.
 *
 * @typedef {Object} Chat
 * @property {string} name - The name of the chat.
 * @property {boolean} groupChat - A flag indicating if the chat is a group chat. Defaults to false.
 * @property {Schema.Types.ObjectId} creator - The ID of the user who created the chat.
 * @property {Array<Schema.Types.ObjectId>} members - An array of user IDs representing the members of the chat.
 *
 * @extends Schema
 */
const chatSchema = new Schema(
  {
    name: { type: String, required: true },
    groupChat: {
      type: Boolean,
      default: false,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      }
    ]
  },
  {
    timestamps: true,
  }
);

/**
 * Mongoose model for chats.
 *
 * The Chat model is used to create and manage chat documents in the MongoDB database.
 *
 * @type {mongoose.models<Chat>}
 */
export const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
