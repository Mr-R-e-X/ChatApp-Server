/**
 * Import necessary modules for setting up the Express server and middleware.
 *
 * @module express - `express`: Main framework for building the server.
 * @module path - `path`: Utility for handling and transforming file paths.
 * @module cookie-parser - `cookie-parser`: Middleware for parsing cookies from the request.
 * @module cors - `cors`: Middleware for enabling Cross-Origin Resource Sharing (CORS).
 */

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { initializeIO } from "./socket.js";

/**
 * Initialize express application.
 */
const app = express();
const server = createServer(app);
/**
 * Enable CORS with specific origin and credentials settings.
 */
app.use(
  cors({
    origin: process.env.CORS,
    credentials: true,
  })
);
initializeIO(server);
/**
 * Set up middleware for request parsing and static file serving:
 *
 * - `express.json()`: Parses incoming requests with JSON payloads.
 * - `express.urlencoded({ extended: true })`: Parses incoming requests with URL-encoded payloads.
 * - `express.static(path.resolve("public"))`: Serves static files from the "public" directory.
 * - `cookieParser()`: Parses cookies attached to the client request object.
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("public")));
app.use(cookieParser());

/**
 * Basic route to check if the sever is running
 *
 * @name get/
 * @function
 * @memberof module:express
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {String} - Sends a wekcome message to the client
 */

app.get("/", (req, res) => {
  res.send("Welcome to Chat App Server...!!!");
});

/**
 * Import user router for handling user-related routes.
 * @module userRouter
 */
import userRouter from "./routes/user.routes.js";
import chatRouter from "./routes/chat.routes.js";
import adminRouter from "./routes/admin.routes.js";
/**
 * Use userRouter for routes starting with /api/user.
 */
app.use("/api/user", userRouter);
app.use("/api/chats", chatRouter);
app.use("/api/admin", adminRouter);

export default server;
