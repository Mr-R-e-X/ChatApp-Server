import AsyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { User } from "../models/user.schema.js";
import { Chat } from "../models/chat.schema.js";
import { Message } from "../models/message.schema.js";
import jwt from "jsonwebtoken";
import { COOKIE_OPTIONS } from "../constants/constants.js";

const adminLogin = AsyncHandler(async (req, res) => {
  const { secretKey } = req.body;
  const isMatched = secretKey === process.env.ADMIN_SECRET_KEY;
  if (!isMatched) {
    throw new ApiError(401, "Invalid secret key");
  }
  const adminToken = jwt.sign({}, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: 1000 * 60 * 15,
  });

  return res
    .status(200)
    .cookie("adminToken", adminToken, COOKIE_OPTIONS)
    .json(new ApiResponse(200, "Welcome Boss"));
});

const verifyAdmin = AsyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, { admin: true }));
});

const getAllUsers = AsyncHandler(async (req, res) => {
  const users = await User.aggregate([
    {
      $lookup: {
        from: "chats",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$$userId", "$members"] },
            },
          },
          {
            $project: { groupChat: 1 },
          },
        ],
        as: "chats",
      },
    },
    {
      $addFields: {
        groups: {
          $size: {
            $filter: {
              input: "$chats",
              as: "chat",
              cond: {
                $eq: ["$$chat.groupChat", true],
              },
            },
          },
        },
        friends: {
          $size: {
            $filter: {
              input: "$chats",
              as: "chat",
              cond: {
                $eq: ["$$chat.groupChat", false],
              },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        username: 1,
        avatar: "$avatar.url",
        groups: 1,
        friends: 1,
      },
    },
  ]);

  return res.status(200).json(new ApiResponse(200, { users }));
});

const getAllChats = AsyncHandler(async (req, res) => {
  const chats = await Chat.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              avatar: "$avatar.url",
            },
          },
        ],
        as: "membersDetails",
      },
    },
    {
      $addFields: {
        avatars: {
          $slice: [
            {
              $map: {
                input: "$membersDetails",
                as: "member",
                in: "$$member.avatar",
              },
            },
            3,
          ],
        },

        creatorDetails: {
          $cond: {
            if: { $eq: ["$groupChat", true] },
            then: {
              $filter: {
                input: "$membersDetails",
                as: "member",
                cond: {
                  $eq: ["$$member._id", "$creator"],
                },
              },
            },
            else: [],
          },
        },
        adminDetails: {
          $cond: {
            if: { $eq: ["$groupChat", true] },
            then: {
              $filter: {
                input: "$membersDetails",
                as: "member",
                cond: {
                  $in: ["$$member._id", { $ifNull: ["$admins", []] }],
                },
              },
            },
            else: [],
          },
        },
      },
    },
    {
      $lookup: {
        from: "messages",
        localField: "_id",
        foreignField: "chat",
        as: "messages",
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        groupChat: 1,
        creatorDetails: {
          $arrayElemAt: ["$creatorDetails", 0],
        },
        adminDetails: 1,
        membersDetails: 1,
        avatars: 1,
        totalMembers: { $size: "$membersDetails" },
        totalMessages: { $size: "$messages" },
      },
    },
  ]);
  return res.status(200).json(new ApiResponse(200, { chats }));
});

const getAllMessages = AsyncHandler(async (req, res) => {
  const messages = await Message.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              username: 1,
              avatar: "$avatar.url",
            },
          },
        ],
        as: "senderDetails",
      },
    },
    {
      $lookup: {
        from: "chats",
        localField: "chat",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              groupChat: 1,
            },
          },
        ],
        as: "chatDetails",
      },
    },
    {
      $project: {
        _id: 1,
        attachments: 1,
        content: 1,
        createdAt: 1,
        sender: {
          $arrayElemAt: ["$senderDetails", 0],
        },
        chat: { $arrayElemAt: ["$chatDetails", 0] },
      },
    },
  ]);
  return res.status(200).json(200, { messages });
});

const getDahboardStats = AsyncHandler(async (req, res) => {
  const [totalUsers, totalChats, totalMessages, totalGroups] =
    await Promise.all([
      User.countDocuments(),
      Chat.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments({ groupChat: true }),
    ]);
  const today = new Date();
  const last7days = new Date();
  last7days.setDate(today.getDate() - 7);
  const last7daysMessages = await Message.find({
    createdAt: { $gte: last7days, $lte: today },
  }).select("createdAt");
  const messages = new Array(7).fill(0);
  const dayInMS = 1000 * 60 * 60 * 24;
  last7daysMessages.forEach((message) => {
    const idx = (today.getTime() - message.createdAt.getTime()) / dayInMS;
    const index = Math.floor(idx);
    messages[6 - index]++;
  });

  const stats = {
    totalUsers,
    totalChats,
    totalGroups,
    totalMessages,
    messagesChart: messages,
  };
  return res.status(200).json(new ApiResponse(200, { stats }));
});

const adminLogout = AsyncHandler(async (req, res) => {
  res.clearCookie("adminToken");
  return res.status(200).json(new ApiResponse(200, "Logged out successfully"));
});

export {
  adminLogin,
  verifyAdmin,
  getAllUsers,
  getAllChats,
  getAllMessages,
  getDahboardStats,
  adminLogout,
};
