/**
 * Custom error class for API errors.
 * Extends the native JavaScript Error class to provide additional information
 *  such as status code, success flag, error details, and a custom stack trace.
 */
class ApiError extends Error {
  /**
   * creates an instance of ApiError.
   *
   * @param {number} statusCode - The HTTP status code associated with the error.
   * @param {string} [message="Something Went Wrong"] - The error message.
   * @param {Array}  [errors=[]] - An array of error details or validation errors.
   * @param {string} [stack=""] -  Custom stack trace or an empty string to use the default stack trace.
   */

  constructor(
    statusCode,
    message = "Something Went Wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode; // HTTP status code for the error
    this.data = null; // Placeholder for any additional data
    this.success = false; // Indicates that the operation was not successful
    this.errors = errors; // Array containing error details
    if (stack)
      this.stack = stack; // Custom stack trace
    else Error.captureStackTrace(this, this.constructor); // Default stack trace
  }
}

export default ApiError;
