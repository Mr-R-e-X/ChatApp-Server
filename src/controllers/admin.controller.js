import AsyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { User } from "../models/user.schema.js";
import { Chat } from "../models/chat.schema.js";
import { Message } from "../models/message.schema.js";

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

export { getAllUsers, getAllChats, getAllMessages };
