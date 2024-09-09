import { Router } from "express";
import {
  getAllUsers,
  getAllChats,
  getAllMessages,
} from "../controllers/admin.controller.js";
const router = Router();

router.route("/").get();
router.route("/verify").post();
router.route("/logout").get();
router.route("/users").get(getAllUsers);
router.route("/chats").get(getAllChats);
router.route("/messages").get(getAllMessages);
router.route("/stats").get();

export default router;
