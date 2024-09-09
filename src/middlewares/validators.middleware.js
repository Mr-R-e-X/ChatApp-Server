import { body, validationResult, check, param, query } from "express-validator";
import ApiError from "../utils/apiError.js";

const validateRegistration = () => [
  body("name", "Name is required").trim().notEmpty(),
  body("username", "Username is required").trim().notEmpty(),
  body("email", "Email is required").isEmail(),
  body("password", "Password is required").trim().notEmpty(),
  body("bio")
    .optional()
    .custom((value, { req }) => {
      if (value.length < 5) {
        throw new ApiError(400, "Bio must be at least 5 characters long");
      }
      return true;
    }),
  check("avatar", "Avatar is required").notEmpty(),
];

const validateLogin = () => [
  body("email", "Must be a valid email").optional().trim().isEmail(),
  body("username", "Username is required if email is not provided")
    .optional()
    .trim()
    .notEmpty(),

  body("password", "Password is required").trim().notEmpty(),
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.username) {
      throw new ApiError(401, "Username or email is required to sign in");
    }
    return true;
  }),
];

const validateNewGroup = () => [
  body("name", "Name is required").trim().notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please provide members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be between 1 and 100"),
];

const validateAddMembers = () => [
  body("chatId", "Chat id is required").trim().notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please add members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Members must be between 1 and 100"),
];

const validateUserAndChatId = () => [
  body("userId", "Please provide a member to remove.").trim().notEmpty(),
  body("chatId", "No Chat Id provided!").trim().notEmpty(),
];

const valdateSendAttachments = () => [
  body("chatId", "No Chat Id provided!").trim().notEmpty(),
  check("files")
    .notEmpty()
    .withMessage("Please upload attachments ..!!")
    .isArray({ min: 1, max: 5 })
    .withMessage("Attachments must be send between 1 and 100"),
];

const validateChatId = () => [
  param("id", "No Chat Id provided!").trim().notEmpty(),
];

const validateRenameGroup = () => [
  param("id", "No Chat Id provided!").trim().notEmpty(),
  body("name", "New name is required").trim().notEmpty(),
];

const validateNewFriendRequest = () => [
  body("receiver", "No Chat Id provided!").trim().notEmpty(),
];

const validateAcceptedFriendRequest = () => [
  body("requestId", "No Request Id provided!").trim().notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("accept status not provided")
    .isBoolean()
    .withMessage("accept data type must be boolean"),
];

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessages = errors
    .array()
    .map((error) => error.message)
    .join("\n");
  console.log(errorMessages);
  if (errors.isEmpty()) return next();
  throw new ApiError(400, errorMessages);
};

export {
  validateRegistration,
  validateLogin,
  validateNewGroup,
  validateAddMembers,
  validateUserAndChatId,
  valdateSendAttachments,
  validateChatId,
  validateRenameGroup,
  validateNewFriendRequest,
  validateAcceptedFriendRequest,
  validateHandler,
};
