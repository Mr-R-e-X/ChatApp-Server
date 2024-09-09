/**
 * A class representing a standard API response.
 * This class is used to create consistent response objects for API endpoints.
 */
class ApiResponse {
  /**
   * Creates an instance of ApiResponse.
   *
   * /**
   * @param {number} statusCode - The HTTP status code associated with the response.
   * @param {*} data - The data associated with the response. Can be of any type.
   * @param {string} [message="success"] - A message providing aditional information associated with the response.
   */

  constructor(statusCode, data, message = "success") {
    this.statusCode = statusCode; // HTTP status code of the response
    this.data = data; // Data payload of the response
    this.message = message; // Message accompanying the response
    this.success = statusCode < 400; // Boolean indicating if the response was successful (true for status codes below 400)
  }
}

export default ApiResponse;
