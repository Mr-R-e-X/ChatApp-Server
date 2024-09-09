/**
 * Import the `config` function from `dotenv` to load environment variables
 * from a `.env` file into `process.env`.
 *
 * The `dotenv` package reads the `.env` file and merges its key-value pairs
 * into `process.env`, making these environment variables available throughout
 * the application.
 *
 * This setup is essential for managing environment-specific configurations
 * securely and conveniently.
 *
 * @module dotenv
 */
import { config } from "dotenv";

/**
 * Load environment variables from `.env` file into `process.env`.
 * This should be called at the start of the application to ensure all
 * environment variables are available throughout the application lifecycle.
 */
config();
