import { Router } from "express";
import {
  authenticateAdminToken,
  checkAdminAccess,
} from "../middlewares/auth.middleware.js";
import {
  adminLogin,
  verifyAdmin,
  getAllUsers,
  getAllChats,
  getAllMessages,
  getDahboardStats,
  adminLogout,
} from "../controllers/admin.controller.js";
import {
  validateAdminLogin,
  validateHandler,
} from "../middlewares/validators.middleware.js";
const router = Router();
router.use(checkAdminAccess);
router.route("/verify").post(validateAdminLogin(), validateHandler, adminLogin);
router.use(authenticateAdminToken);
router.route("/").get(verifyAdmin);
router.route("/logout").get(adminLogout);
router.route("/users").get(getAllUsers);
router.route("/chats").get(getAllChats);
router.route("/messages").get(getAllMessages);
router.route("/stats").get(getDahboardStats);
router.route("/logout").get(adminLogout);

export default router;
