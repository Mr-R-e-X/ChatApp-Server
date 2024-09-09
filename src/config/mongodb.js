import mongoose from "mongoose";
import { DB_NAME } from "../constants/constants.js";

/**
 * Connects to the MongoDB database.
 *
 * This function establishes a connection to the MongoDB database using Mongoose.
 * The connection URI is dynamically constructed from environment variables.
 *
 * @async
 * @function
 * @returns {Promise<void>} Resolves when the connection is successfully established.
 * @throws {Error} Throws an error if the connection to MongoDB fails.
 */
const connectToDB = async () => {
  try {
    const dbInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n🥁MongoDB connected!! DB Host: ${dbInstance.connection.host}. \n ${dbInstance.connection.name} `
    );
  } catch (error) {
    console.log("😵‍💫MongoDB connection FAILED: ", error);
    process.exit(1);
  }
};
export default connectToDB;
