import { Router } from "express";
import authenticateToken from "../middlewares/auth.middleware.js";
import {
  validateNewGroup,
  validateAddMembers,
  validateUserAndChatId,
  validateSendAttachments,
  validateChatId,
  validateHandler,
  validateRenameGroup,
} from "../middlewares/validators.middleware.js";
import {
  createNewGroup,
  getUserChats,
  getUserGroups,
  addMembersInGroup,
  removeMemberFromGroup,
  leaveGroup,
  assignCreator,
  assignAdmin,
  sendAttachments,
  getChatDetails,
  changeGroupName,
  deleteChat,
  getMessages,
} from "../controllers/chat.controller.js";
import { attachmentMulter } from "../middlewares/multer.middleware.js";
const router = Router();
router.use(authenticateToken);
router
  .route("/new-group")
  .post(validateNewGroup(), validateHandler, createNewGroup);
router.route("/get-chats").get(getUserChats);
router.route("/get-groups").get(getUserGroups);
router
  .route("/add-members")
  .put(validateAddMembers(), validateHandler, addMembersInGroup);
router
  .route("/remove-member")
  .put(validateUserAndChatId(), validateHandler, removeMemberFromGroup);
router
  .route("/assign-creator")
  .put(validateUserAndChatId(), validateHandler, assignCreator);
router
  .route("/assign-admin")
  .put(validateUserAndChatId(), validateHandler, assignAdmin);
router
  .route("/leave/:id")
  .delete(validateChatId(), validateHandler, leaveGroup);

// attachments need to handle
router
  .route("/message")
  .post(
    attachmentMulter,
    validateSendAttachments(),
    validateHandler,
    sendAttachments
  );
router
  .route("/messages/:id")
  .get(validateChatId(), validateHandler, getMessages);
router
  .route("/:id")
  .get(validateChatId(), validateHandler, getChatDetails)
  .put(validateRenameGroup(), validateHandler, changeGroupName)
  .delete(validateChatId(), validateHandler, deleteChat);
export default router;
