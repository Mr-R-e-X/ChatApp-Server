/**
 * A higher-order function for handling asynchronous route handlers.
 * This function wraps an asynchronous function and automatically catches any errors,
 * passing them to the error handler middleware.
 *
 * @param {Function} func - The asynchronous route handler function to be wrapped.
 * @returns {Function} A new function that executes the original function and catches any errors.
 */
const AsyncHandler = (func) => async (req, res, next) => {
  try {
    await func(req, res, next);
  } catch (error) {
    // Handle the error by sending a JSON response with the error code and message
    res
      .status(error.code|| error.statusCode || 500)
      .json({ success: false, message: error.message });
  }
};

export default AsyncHandler;
