import { body, validationResult, check, param } from "express-validator";
import ApiError from "../utils/apiError.js";
import AsyncHandler from "../utils/asyncHandler.js";

/**
 * Validator for user registration.
 */
const validateRegistration = () => [
  body("name")
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),
  body("username")
    .isString()
    .withMessage("Username must be a string")
    .trim()
    .notEmpty()
    .withMessage("Username is required"),
  body("email")
    .isString()
    .withMessage("Email must be a string")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password")
    .isString()
    .withMessage("Password must be a string")
    .trim()
    .notEmpty()
    .withMessage("Password is required"),
  body("bio")
    .optional()
    .isString()
    .withMessage("Bio must be a string")
    .custom((value) => {
      if (value && value.length < 5) {
        throw new ApiError(400, "Bio must be at least 5 characters long");
      }
      return true;
    }),
  check("avatar").custom((value, { req }) => {
    if (!req.file) {
      throw new ApiError(400, "Avatar is required and must be a file");
    }
    return true;
  }),
];

/**
 * Validator for user login.
 */
const validateLogin = () => [
  body("email")
    .optional()
    .isString()
    .withMessage("Email must be a string")
    .isEmail()
    .withMessage("Invalid email format"),
  body("username")
    .optional()
    .isString()
    .withMessage("Username must be a string")
    .trim()
    .notEmpty()
    .withMessage("Username is required if email is not provided"),
  body("password")
    .isString()
    .withMessage("Password must be a string")
    .trim()
    .notEmpty()
    .withMessage("Password is required"),
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.username) {
      throw new ApiError(400, "Username or email is required to sign in");
    }
    return true;
  }),
];

/**
 * Validator for creating a new group.
 */
const validateNewGroup = () => [
  body("name")
    .isString()
    .withMessage("Group name must be a string")
    .trim()
    .notEmpty()
    .withMessage("Group name is required"),
  body("members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be an array with between 2 and 100 items")
    .bail()
    .custom((members) => {
      if (!members.every((member) => typeof member === "string")) {
        throw new ApiError(400, "Each member must be a string");
      }
      return true;
    }),
];

/**
 * Validator for adding members to a group.
 */
const validateAddMembers = () => [
  body("chatId")
    .isString()
    .withMessage("Chat ID must be a string")
    .trim()
    .notEmpty()
    .withMessage("Chat ID is required"),
  body("members")
    .isArray({ min: 1, max: 100 })
    .withMessage("Members must be an array with between 1 and 100 items")
    .bail()
    .custom((members) => {
      if (!members.every((member) => typeof member === "string")) {
        throw new ApiError(400, "Each member must be a string");
      }
      return true;
    }),
];

/**
 * Validator for user ID and chat ID.
 */
const validateUserAndChatId = () => [
  body("userId")
    .isString()
    .withMessage("User ID must be a string")
    .trim()
    .notEmpty()
    .withMessage("User ID is required"),
  body("chatId")
    .isString()
    .withMessage("Chat ID must be a string")
    .trim()
    .notEmpty()
    .withMessage("Chat ID is required"),
];

/**
 * Validator for sending attachments.
 */
const validateSendAttachments = () => [
  body("chatId")
    .isString()
    .withMessage("Chat ID must be a string")
    .trim()
    .notEmpty()
    .withMessage("Chat ID is required"),
  check("files").custom((value, { req }) => {
    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, "At least one attachment is required");
    }
    if (req.files.length < 1 || req.files.length > 5) {
      throw new ApiError(400, "Attachments must be between 1 and 5");
    }
    return true;
  }),
];

/**
 * Validator for chat ID in URL parameters.
 */
const validateChatId = () => [
  param("id")
    .isString()
    .withMessage("Chat ID must be a string")
    .trim()
    .notEmpty()
    .withMessage("Chat ID is required"),
];

/**
 * Validator for renaming a group.
 */
const validateRenameGroup = () => [
  param("id")
    .isString()
    .withMessage("Chat ID must be a string")
    .trim()
    .notEmpty()
    .withMessage("Chat ID is required"),
  body("name")
    .isString()
    .withMessage("New group name must be a string")
    .trim()
    .notEmpty()
    .withMessage("New group name is required"),
];

/**
 * Validator for sending a new friend request.
 */
const validateNewFriendRequest = () => [
  body("receiver")
    .isString()
    .withMessage("Receiver ID must be a string")
    .trim()
    .notEmpty()
    .withMessage("Receiver ID is required"),
];

/**
 * Validator for accepting a friend request.
 */
const validateAcceptedFriendRequest = () => [
  body("requestId")
    .isString()
    .withMessage("Request ID must be a string")
    .trim()
    .notEmpty()
    .withMessage("Request ID is required"),
  body("accept")
    .isBoolean()
    .withMessage("Acceptance status must be a boolean")
    .notEmpty()
    .withMessage("Acceptance status is required"),
];

/**
 * Validator for admin login.
 */
const validateAdminLogin = () => [
  body("secretKey")
    .isString()
    .withMessage("Secret key must be a string")
    .trim()
    .notEmpty()
    .withMessage("Secret key is required"),
];

/**
 * Middleware for handling validation errors.
 */
const validateHandler = AsyncHandler((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((error) => error.msg)
      .join("\n");
    console.log(errorMessages);
    throw new ApiError(400, errorMessages);
  }
  next();
});

export {
  validateRegistration,
  validateLogin,
  validateNewGroup,
  validateAddMembers,
  validateUserAndChatId,
  validateSendAttachments,
  validateChatId,
  validateRenameGroup,
  validateNewFriendRequest,
  validateAcceptedFriendRequest,
  validateAdminLogin,
  validateHandler,
};
