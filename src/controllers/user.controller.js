import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import AsyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.schema.js";
import { uploadFileInCloudinary } from "../utils/cloudinary.js";
import { generateJwtTokens } from "../utils/generateJwtTokens.js";
import { COOKIE_OPTIONS } from "../constants/constants.js";
import { Chat } from "../models/chat.schema.js";
import { Request } from "../models/request.schema.js";
import { emitEvent } from "../utils/features.js";
import {
  NEW_REQUEST_ALERT,
  REFTCH_CHATS,
} from "../constants/event.constants.js";

const registerUser = AsyncHandler(async (req, res) => {
  const { name, username, email, password, bio } = req.body;
  const avatar = req.file;

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser)
    throw new ApiError(409, "User already exists with same username or email");
  const uploadAvatar = await uploadFileInCloudinary(avatar.path);
  const newUser = await User.create({
    name,
    username,
    email,
    password,
    bio: bio ? bio : "Hey there! I am using chat app!",
    avatar: uploadAvatar,
  });
  const createdUser = await User.findById(newUser._id);
  res.status(201).json(new ApiResponse(201, { createdUser }));
});

const login = AsyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  const user = await User.findOne({
    $or: [{ username }, { email }],
  }).select("password");

  if (!user || !(await user.matchPassword(password)))
    throw new ApiError(401, "Invalid email or password");

  const tokens = await generateJwtTokens(User, user._id);
  const existingUser = await User.findById(user._id).select(
    "-refreshToken -createdAt -updatedAt -__v"
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

const getProfile = AsyncHandler(async (req, res) => {
  const user = await User.findById(req?.user._id).select(
    "-refreshToken -createdAt -updatedAt -__v"
  );
  console.log(user);
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
  console.log(myFriendsIds);
  const AllUsersExceptFriends = await User.aggregate([
    {
      $match: {
        _id: { $nin: myFriendsIds },
      },
    },
    {
      $match: {
        $or: [
          { username: { $regex: name, $options: "i" } },
          { name: { $regex: name, $options: "i" } },
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
  console.log(request);
  if (request) throw new ApiError(400, "Friend request already exists");
  await Request.create({
    sender: senderId,
    receiver,
  });

  emitEvent(req, NEW_REQUEST_ALERT, [receiver]);

  return res
    .status(201)
    .json(new ApiResponse(201, "Request sent successfully"));
});

const acceptFriendRequest = AsyncHandler(async (req, res) => {
  const { requestId, accept } = req.body;
  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) throw new ApiError(404, "Request not found");
  if (request.receiver._id.toString() !== req.user._id.toString())
    throw new ApiError(401, "You are unauthorized to acceept this request");
  if (!accept) {
    request.status = "rejected";
    await request.save();
    return res
      .status(200)
      .json(new ApiResponse(200, "Friend Request rejected"));
  }
  const members = [request.receiver._id, request.sender._id];
  request.status = "accepted";
  await Promise.all([
    Chat.create({
      members,
      name: `${request.receiver.name}-${request.sender.name}`,
    }),
    request.save(),
  ]);
  emitEvent(req, REFTCH_CHATS, members);
  return res.status(200).json(new ApiResponse(200, "Friend Request accepted"));
});

const getUserNotifications = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const requests = await Request.find({
    receiver: userId,
    status: "pending",
  }).populate("sender", "name, avatar");

  console.log(requests);

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
              $in: [ObjectId("66d2af990cb27b53877a174e")],
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
          $ne: ObjectId("66d2af990cb27b53877a174e"),
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        username: 1,
        avatar: "$members.avatar.url",
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
  }else{
    return res.status(200).json(new ApiResponse(200, { friends }));
  }
});

export {
  registerUser,
  login,
  getProfile,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getUserNotifications,
  getUserFriends,
};
