/**
 * Import necessary modules and libraries:
 *
 * @module mongoose - `Schema` from Mongoose for defining and creating models in MongoDB.
 * @module bcrypt - `bcrypt` for hashing and comparing passwords.
 * @module jsonwebtoken - `jsonwebtoken` for creating and verifying JSON Web Tokens (JWTs) for user authentication.
 *
 * These imports provide the necessary functionality for defining the user model,
 * handling password security, and managing JWT-based authentication.
 */

import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * Mongoose schema definition for the User model.
 *
 * @typedef {Object} User
 * @property {string} name - The full name of the user.
 * @property {string} username - The unique username for the user.
 * @property {string} email - The unique email address of the user.
 * @property {string} password - The hashed password for the user. This field is not selected by default.
 * @property {boolean} isEmailVerified - Whether the user's email is verified or not.
 * @property {Object} avatar - Avatar information for the user.
 * @property {string} avatar.publicId - The public ID for the user's avatar.
 * @property {string} avatar.url - The URL to the user's avatar image.
 * @property {string} refreshToken - The refresh token for the user (not selected by default).
 *
 * @extends Schema
 */
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    avatar: {
      publicId: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    bio: {
      type: String,
      default: "Hey there I am using chat app",
    },
    refreshToken: {
      type: String,
      default: "",
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Middleware that hashes the user's password before saving the user document.
 *
 * This middleware checks if the password field has been modified and hashes the new password
 * before saving it to the database. If the password hasn't been modified, the middleware
 * proceeds without hashing.
 *
 * @param {Function} next - The next middleware function in the stack.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
});

/**
 * Method to check if a given password matches the user's stored hashed password.
 *
 * This method compares a plain text password with the hashed password stored in the database.
 * It returns a boolean indicating whether the passwords match.
 *
 * @function checkPasswordValid
 * @memberof User
 * @param {string} password - The plain text password to compare.
 * @returns {Promise<boolean>} True if the password is valid, false otherwise.
 */
userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

/**
 * Method to generate a JWT access token for the user.
 *
 * This method creates a JSON Web Token containing the user's ID, email, username, name,
 * and avatar. The token is signed with a secret key and has an expiration time.
 *
 * @function generateAccessToken
 * @memberof User
 * @returns {Promise<string>} The generated JWT access token.
 */
userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      name: this.name,
      avatar: this.avatar,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

/**
 * Method to generate a JWT refresh token for the user.
 *
 * This method creates a JSON Web Token containing the user's ID. The token is signed
 * with a secret key and has an expiration time specified in the environment variables.
 *
 * @function generateRefreshToken
 * @memberof User
 * @returns {Promise<string>} The generated JWT refresh token.
 */
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

/**
 * Export the User model.
 *
 * The User model is exported to be used in other parts of the application.
 * If the User model is already defined in the models, it uses the existing model
 * to avoid re-compiling it.
 *
 * @type {mongoose.models<User>}
 */

export const User = mongoose.models.User || mongoose.model("User", userSchema);
