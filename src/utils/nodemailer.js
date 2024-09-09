import nodemailer from "nodemailer";
import ApiError from "./apiError.js";

/**
 * Configures the SMTP Transporter for sending emails.
 *
 * @type {import('nodemailer').Transporter}
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVICE,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_EMAIL_PASSWORD,
  },
});

/**
 * Sends an email using the configured SMTP transporter.
 *
 * @param {string} userMail - The email address of the recipient.
 * @param {string} emailSubject - The subject line for the email.
 * @param {string} emailBody - The HTML content of the email.
 * @returns {Promise<string>} The response from the SMTP server.
 * @throws {Error} If there is an error sending the email.
 */

async function sendMailToUser(userMail, emailSubject, emailBody) {
  try {
    const mailOpts = {
      from: process.env.SMTP_EMAIL,
      to: userMail,
      subject: emailSubject,
      html: emailBody,
    };
    const info = await transporter.sendMail(mailOpts);
    return info.response;
  } catch (error) {
    console.error("Error sending email: ", error);
    throw new ApiError(
      500,
      `Something went wrong while sending mail. Original error: ${error.message}`
    );
  }
}

export default sendMailToUser;
