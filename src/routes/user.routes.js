import { Router } from "express";
import { singleAvatar } from "../middlewares/multer.middleware.js";
import authenticateToken from "../middlewares/auth.middleware.js";
import {
  validateHandler,
  validateRegistration,
  validateLogin,
  validateNewFriendRequest,
  validateAcceptedFriendRequest,
} from "../middlewares/validators.middleware.js";
import {
  login,
  registerUser,
  getProfile,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getUserNotifications,
  logout,
  getUserFriends,
  removeFriendRequest,
} from "../controllers/user.controller.js";

const router = Router();

router
  .route("/new")
  .post(singleAvatar, validateRegistration(), validateHandler, registerUser);
router.route("/").post(validateLogin(), validateHandler, login);

// Authenticated routes
router.use(authenticateToken);
router.route("/get-profile").get(getProfile);
router.route("/search").get(searchUsers);
router
  .route("/send-request")
  .post(validateNewFriendRequest(), validateHandler, sendFriendRequest);

router.route("/remove-request").delete(removeFriendRequest);

router
  .route("/accept-request")
  .put(validateAcceptedFriendRequest(), validateHandler, acceptFriendRequest);

router.route("/notifications").get(getUserNotifications);
router.route("/logout").get(logout);

router.route("/friends").get(getUserFriends);
export default router;
