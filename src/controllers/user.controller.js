import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import AsyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.schema.js";
import { uploadFileInCloudinary } from "../utils/cloudinary.js";
import { generateJwtTokens } from "../utils/generateJwtTokens.js";
import { COOKIE_OPTIONS } from "../constants/constants.js";
import { Chat } from "../models/chat.schema.js";
import { Request } from "../models/request.schema.js";
import { emitAlertEvent, emitEvent } from "../utils/features.js";
import {
  NEW_FRIEND,
  NEW_REQUEST,
  NEW_REQUEST_ALERT,
  REFTCH_CHATS,
} from "../constants/event.constants.js";
import { escapeRegex } from "../utils/helper.js";

const registerUser = AsyncHandler(async (req, res) => {
  const { name, username, email, password, bio } = req.body;
  const avatar = req.file;

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser)
    throw new ApiError(409, "User already exists with same username or email");
  const uploadAvatar = await uploadFileInCloudinary(avatar);
  console.log(uploadAvatar);
  const newUser = await User.create({
    name,
    username,
    email,
    password,
    bio: bio ? bio : "Hey there! I am using chat app!",
    avatar: uploadAvatar,
  });
  const createdUser = await User.findById(newUser._id);
  console.log(createdUser);
  const tokens = await generateJwtTokens(User, createdUser._id);
  res
    .status(201)
    .cookie("accessToken", tokens.accessToken, COOKIE_OPTIONS)
    .cookie("refreshToken", tokens.refreshToken, COOKIE_OPTIONS)
    .json(
      new ApiResponse(201, {
        user: createdUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      })
    );
});

const login = AsyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const user = await User.findOne({
    $or: [{ username }, { email }],
  }).select("password");

  if (!user || !(await user.matchPassword(password)))
    throw new ApiError(401, "Invalid email or password");

  const tokens = await generateJwtTokens(User, user._id);
  console.log(tokens);
  const existingUser = await User.findById(user._id).select(
    "-refreshToken -updatedAt -__v"
  );
  return res
    .status(200)
    .cookie("accessToken", tokens.accessToken, COOKIE_OPTIONS)
    .cookie("refreshToken", tokens.refreshToken, COOKIE_OPTIONS)
    .json(
      new ApiResponse(200, {
        user: existingUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      })
    );
});

const logout = AsyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: "" });
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, { message: "Logged out successfully" }));
});

const getProfile = AsyncHandler(async (req, res) => {
  const user = await User.findById(req?.user._id).select(
    "-refreshToken -updatedAt -__v"
  );
  return res.status(200).json(new ApiResponse(200, { user }));
});

const searchUsers = AsyncHandler(async (req, res) => {
  const { name = "" } = req.query;
  const userId = req.user._id;
  const myChats = await Chat.find({
    groupChat: false,
    members: { $in: userId },
  });
  const myFriendsIds = myChats
    .flatMap((chat) => chat.members)
    .filter((member) => member.toString() !== userId.toString());

  myFriendsIds.push(userId);
  const escapedName = escapeRegex(name);
  console.log(escapedName);
  const AllUsersExceptFriends = await User.aggregate([
    {
      $match: {
        _id: { $nin: myFriendsIds },
      },
    },
    {
      $match: {
        $or: [
          { username: { $regex: escapedName, $options: "i" } },
          { name: { $regex: escapedName, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        username: 1,
        avatar: "$avatar.url",
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { users: AllUsersExceptFriends }));
});

const sendFriendRequest = AsyncHandler(async (req, res) => {
  const { receiver } = req.body;

  const senderId = req.user._id;
  if (senderId.toString() === receiver.toString())
    throw new ApiError(404, "Can't send friend request to own");
  const request = await Request.findOne({
    $or: [
      { sender: senderId, receiver: receiver },
      { sender: receiver, receiver: senderId },
    ],
  });

  if (request) throw new ApiError(400, "Friend request already exists");
  await Request.create({
    sender: senderId,
    receiver,
  });

  emitAlertEvent(
    req,
    NEW_REQUEST,
    [receiver._id],
    `${req.user.name} send you friend request`
  );

  return res
    .status(201)
    .json(new ApiResponse(201, { message: "Request sent successfully" }));
});

const acceptFriendRequest = AsyncHandler(async (req, res) => {
  const { requestId, accept } = req.body;
  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request || request.status === "accepted")
    throw new ApiError(404, "Request not found");
  if (request.receiver._id.toString() !== req.user._id.toString())
    throw new ApiError(401, {
      message: "You are unauthorized to acceept this request",
    });
  if (!accept) {
    request.status = "rejected";
    await request.save();
    return res
      .status(200)
      .json(new ApiResponse(200, { message: "Friend Request rejected" }));
  }
  const members = [request.receiver._id, request.sender._id];
  request.status = "accepted";
  const [newChat] = await Promise.all([
    Chat.create({
      members,
      name: `${request.receiver.name}-${request.sender.name}`,
    }),
    request.save(),
  ]);

  emitEvent(req, REFTCH_CHATS, members, newChat._id);
  emitAlertEvent(
    req,
    NEW_FRIEND,
    [request.sender._id, request.receiver._id],
    `${request.sender.name} and ${request.receiver.name} are friends now.`
  );
  return res
    .status(200)
    .json(new ApiResponse(200, { message: "Friend Request accepted" }));
});

const getUserNotifications = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const requests = await Request.find({
    receiver: userId,
    status: "pending",
  }).populate("sender", "name avatar");

  const allRequests = requests.map(({ _id, sender, status }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
    status,
  }));

  return res.status(200).json(new ApiResponse(200, { allRequests }));
});

const getUserFriends = AsyncHandler(async (req, res) => {
  const { chatId } = req.query;
  const friends = await Chat.aggregate([
    {
      $match: {
        $and: [
          {
            members: {
              $in: [req?.user?._id],
            },
          },
          { groupChat: false },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "members",
      },
    },
    {
      $unwind: "$members",
    },
    {
      $match: {
        "members._id": {
          $ne: req?.user?._id,
        },
      },
    },
    {
      $group: {
        _id: "$members._id",
        name: { $first: "$members.name" },
        username: { $first: "$members.username" },
        avatar: { $first: "$members.avatar.url" },
        email: { $first: "$members.email" },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        username: 1,
        bio: 1,
        email: 1,
        avatar: 1,
      },
    },
  ]);
  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );
    return res
      .status(200)
      .json(new ApiResponse(200, { friends: availableFriends }));
  } else {
    return res.status(200).json(new ApiResponse(200, { friends }));
  }
});

const removeFriendRequest = AsyncHandler(async (req, res) => {
  const { requestId } = req.body;
  const request = await Request.findById(requestId);
  if (!request) throw new ApiError(404, "Request not found");
  if (request.sender.toString() !== req.user?._id.toString())
    throw new ApiError(401, "You are not allowed to do this");
  if (request.status !== "pending")
    throw new ApiError(403, "Request already accepted or rejected");
  await request.deleteOne();
  return res
    .status(200)
    .json(new ApiResponse("Request removed", { request: request._id }));
});

export {
  registerUser,
  login,
  logout,
  getProfile,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getUserNotifications,
  getUserFriends,
  removeFriendRequest,
};
