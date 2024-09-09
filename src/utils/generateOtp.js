import crypto from "crypto";
/**
 * Generates a random 6-character OTP (One-Time Password).
 * The OTP consists of alphanumeric characters, created using a base64 encoded random buffer.
 *
 *
 * @return {string} OTP - a 6-character OTP consisting of uppercase and lowercase letters and digits
 */
const generateRandomOtp = () => {
  const base64buffer = crypto.randomBytes(8); //Generate a 8bit random bytes
  const otp = base64buffer
    .toString("base64") // Convert the bytes to a base64 string
    .replace(/[^a-zA-Z0-9]/g, "") // Remove any non-alphanumeric characters
    .slice(0, 6); // Limit the otp to 6 characters
  return otp;
};

export default generateRandomOtp;
