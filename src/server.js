import "./env.js";
import server from "./app.js";
import connectToDB from "./config/mongodb.js";
/**
 * The port number on which the server will run.
 * This is typically loaded from environment variables for flexibility.
 * @constant {string|number}
 */
const PORT = process.env.PORT;

/**
 * Initializes the connection to the MongoDB database.
 * If the connection is successful, the server starts listening on the specified port.
 * If there is an error in connecting to the database or starting the server, it logs the error.
 */
connectToDB()
  .then(() => {
    /**
     * Starts the Express server and listens on the specified port.
     * Logs a message indicating the server is running and the port number.
     */
    const app = server.listen(PORT, () => {
      console.log(`⚙️ Server is running at port --> ${process.env.PORT}`);
    });
    /**
     * Event listener for server errors.
     * Logs the error to the console.
     * @param {Error} error - The error object caught by the server.
     */
    app.on("error", (error) => {
      console.log("😵‍💫 Error in Server ON --> ", error);
      throw error;
    });
  })
  .catch((err) => {
    console.log("😵‍💫 MONGODB Conection Failed in Server.js --> ", err);
  });
