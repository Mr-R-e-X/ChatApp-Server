import {
  ALERT,
  NEW_ATTACHMENT,
  NEW_MESSAGE_ALERT,
  REFTCH_CHATS,
} from "../constants/event.constants.js";
import { Chat } from "../models/chat.schema.js";
import { Message } from "../models/message.schema.js";
import { User } from "../models/user.schema.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import AsyncHandler from "../utils/asyncHandler.js";
import { deleteFileFromCloudinary } from "../utils/cloudinary.js";
import { emitEvent } from "../utils/features.js";

const createNewGroup = AsyncHandler(async (req, res) => {
  const { name, members } = req.body;

  const allMembers = [...members, req.user?._id];

  await Chat.create({
    name,
    groupChat: true,
    creator: req.user?._id,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
  emitEvent(req, REFTCH_CHATS, allMembers);

  return res.status(201).json(
    new ApiResponse(201, {
      message: `Group named "${name}" created successfully!`,
    })
  );
});

const getUserChats = AsyncHandler(async (req, res) => {
  let chats = await Chat.aggregate([
    {
      $match: {
        members: {
          $in: [req.user._id],
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "memberDetails",
      },
    },
    {
      $addFields: {
        memberDetails: {
          $filter: {
            input: "$memberDetails",
            as: "member",
            cond: {
              $ne: ["$$member._id", req.user._id],
            },
          },
        },
      },
    },
    {
      $unwind: "$memberDetails",
    },
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        groupChat: { $first: "$groupChat" },
        creator: { $first: "$creator" },
        admins: { $first: "$admins" },
        memberAvatars: { $push: "$memberDetails.avatar.url" },
        members: { $push: "$memberDetails._id" },
      },
    },
    {
      $addFields: {
        avatar: {
          $cond: {
            if: "$groupChat",
            then: {
              $slice: ["$memberAvatars", 3],
            },
            else: {
              $arrayElemAt: ["$memberAvatars", 0],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        groupChat: 1,
        creator: 1,
        admins: 1,
        avatar: 1,
        members: 1,
      },
    },
  ]);
  return res.status(200).json(new ApiResponse(200, { chats }));
});

const getUserGroups = AsyncHandler(async (req, res) => {
  const groups = await Chat.aggregate([
    {
      $match: {
        $or: [
          {
            creator: req.user._id,
          },
          {
            admins: {
              $in: [req.user._id],
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "memberDetails",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "admins",
        foreignField: "_id",
        as: "adminDetails",
      },
    },
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        groupChat: { $first: "$groupChat" },
        creator: { $first: "$creator" },
        admin: { $first: "$adminDetails._id" },
        members: { $first: "$memberDetails._id" },
        memberAvatars: { $first: "$memberDetails.avatar.url" },
      },
    },
    {
      $addFields: {
        avatar: {
          $slice: ["$memberAvatars", 3],
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        groupChat: 1,
        creator: 1,
        admin: 1,
        avatar: 1,
        members: 1,
      },
    },
  ]);

  return res.status(200).json(new ApiResponse(200, { groups }));
});

const addMembersInGroup = AsyncHandler(async (req, res) => {
  const { chatId, members } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found.");
  if (!chat.groupChat)
    throw new ApiError(400, "You can only add members to a group chat.");
  if (chat.creator.toString() !== req.user?._id.toString())
    throw new ApiError(
      403,
      "You are not allowed to add members to this group chat."
    );

  const users = await User.find({ _id: { $in: members } }, "_id name");

  const uniqueNewMembers = users
    .filter((user) => !chat.members.includes(user._id.toString()))
    .map((user) => user._id.toString());

  if (chat.members.length + uniqueNewMembers.length > 100) {
    return new ApiError(400, "Group maximum members limit reached");
  }

  chat.members.push(...uniqueNewMembers);
  await chat.save();

  const allUsersNames = users
    .filter((user) => uniqueNewMembers.includes(user._id.toString()))
    .map((user) => user.name)
    .join(", ");

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUsersNames} added to the group by ${req.user.name}`
  );
  emitEvent(req, REFTCH_CHATS, chat.members);

  return res.status(200).json(
    new ApiResponse(200, {
      message: `${allUsersNames} added successfully to the group`,
    })
  );
});

const removeMemberFromGroup = AsyncHandler(async (req, res) => {
  const { userId, chatId } = req.body;

  const [chat, userThatWillBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);

  if (!chat) throw new ApiError(404, "Chat not found!");
  if (!chat.groupChat)
    throw new ApiError(404, "User can only be removed from a group chat.");

  const isCreator = chat.creator.toString() === req.user._id.toString();
  const isAdmin = chat.admins.includes(req.user._id.toString());
  const isRemovingAdmin = chat.admins.includes(userId.toString());

  if (!isCreator && !isAdmin)
    throw new ApiError(
      403,
      "You are not allowed to remove members from this group chat."
    );

  if (chat.members.length <= 3)
    throw new ApiError(400, "Group must have at least 3 members.");

  if (!isCreator && isRemovingAdmin)
    throw new ApiError(400, "An admin cannot remove another admin.");

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );

  if (isCreator) {
    chat.admins = chat.admins.filter(
      (admin) => admin.toString() !== userId.toString()
    );
  }

  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${userThatWillBeRemoved.name} was removed from the group by ${req.user.name}`
  );
  emitEvent(req, REFTCH_CHATS, chat.members);

  return res.status(200).json(
    new ApiResponse(200, {
      message: `${userThatWillBeRemoved.name} was removed successfully from the group`,
    })
  );
});

const assignCreator = AsyncHandler(async (req, res) => {
  const { userId, chatId } = req.body;

  const [chat, userThatWillBeNewCreator] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId),
  ]);

  if (!chat) {
    throw new ApiError(400, "Chat not found!");
  }
  if (!userThatWillBeNewCreator) {
    throw new ApiError(400, "User not found!");
  }

  if (!chat.groupChat) {
    throw new ApiError(400, "You can assign creator for a group chat only!");
  }
  if (userThatWillBeNewCreator._id.toString() !== userId.toString()) {
    throw new ApiError(400, "Provide a valid user ID!");
  }
  if (chat.creator.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "Unauthorized!");
  }
  if (!chat.members.includes(userThatWillBeNewCreator._id.toString())) {
    throw new ApiError(400, "Creator should be a member of this group");
  }

  chat.admins = chat.admins.filter(
    (admin) =>
      admin.toString() !== userThatWillBeNewCreator._id.toString() &&
      admin.toString() !== chat.creator.toString()
  );
  chat.admins.push(req.user._id);

  chat.creator = userThatWillBeNewCreator._id;

  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${userThatWillBeNewCreator.name} is now the group creator, assigned by ${req.user.name}`
  );
  emitEvent(req, REFTCH_CHATS, chat.members);

  return res.status(200).json(
    new ApiResponse(200, {
      message: `${userThatWillBeNewCreator.name} is now the new group creator`,
    })
  );
});

const assignAdmin = AsyncHandler(async (req, res) => {
  const { userId, chatId } = req.body;

  if (!chatId) {
    return new ApiError(400, "No Chat Id provided!");
  }
  if (!userId) {
    throw new ApiError(400, "Please provide a member.");
  }

  const [chat, userThatWillBeNewAdmin] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId),
  ]);

  if (!chat) {
    throw new ApiError(400, "Chat not found!");
  }
  if (!userThatWillBeNewAdmin) {
    throw new ApiError(400, "User not found!");
  }

  if (!chat.groupChat) {
    throw new ApiError(400, "You can assign admin for a group chat only!");
  }
  if (userThatWillBeNewAdmin._id.toString() !== userId.toString()) {
    throw new ApiError(400, "Provide a valid user ID!");
  }

  if (
    chat.creator.toString() !== req.user._id.toString() &&
    !chat.admins.includes(req.user._id.toString())
  ) {
    throw new ApiError(400, "Unauthorized!");
  }

  if (chat.admins.includes(userId.toString())) {
    throw new ApiError(400, "User is already an admin!");
  }

  chat.admins.push(userThatWillBeNewAdmin._id);

  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${userThatWillBeNewAdmin.name} is now an admin by ${req.user.name}`
  );
  emitEvent(req, REFTCH_CHATS, chat.members);

  return res.status(200).json(
    new ApiResponse(200, {
      message: `${userThatWillBeNewAdmin.name} is now an admin`,
    })
  );
});

const leaveGroup = AsyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const chat = await Chat.findById(chatId);
  if (!chat) return new ApiError(404, "Chat not found!");

  if (chat.creator.toString() === req.user._id.toString()) {
    return new ApiError(
      400,
      "Creator cannot leave the group without selecting a new creator."
    );
  }

  const userId = req.user._id.toString();
  chat.members = chat.members.filter((member) => member.toString() !== userId);
  chat.admins = chat.admins.filter((admin) => admin.toString() !== userId);

  // Save changes and emit events
  await chat.save();
  emitEvent(req, ALERT, chat.members, `${req.user.name} left the group`);
  emitEvent(req, REFTCH_CHATS, chat.members);

  return res
    .status(200)
    .json(new ApiResponse(200, { message: "Left group successfully" }));
});

const sendAttachments = AsyncHandler(async (req, res) => {
  const { chatId } = req.body;

  const [chat, me] = await Promise.all([
    Chat.find(chatId),
    User.find(req.user._id),
  ]);
  if (!chat) throw new ApiError(400, "Chat not found");
  const files = req.files || [];
  if (files.length === 0) throw new ApiError(400, "No attachments provided");

  // UPLOAD CLODINARY PENDING
  const attachments = [];

  const messageForRealTime = {
    content: "",
    attachments,
    sender: {
      _id: me._id,
      name: me.name,
    },
    chat: chat._id,
  };
  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chat._id,
  };

  const message = await Message.create(messageForDB);

  emitEvent(req, NEW_ATTACHMENT, chat.members, {
    message: messageForRealTime,
    chatId: chat._id,
  });

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId: chat._id });

  return res.status(200).json(new ApiResponse(200, { message }));
});

const getChatDetails = AsyncHandler(async (req, res) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();
    if (!chat) throw new ApiError(404, "Chat Not Found...!!");
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    return res.status(200).json(new ApiResponse(200, { chat }));
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) throw new ApiError(404, "Chat Not Found...!!");
    return res.status(200).json(new ApiResponse(200, { chat }));
  }
});

const changeGroupName = AsyncHandler(async (req, res) => {
  const chatId = req.params.id;
  const { name } = req.body;
  if (!chatId) throw new ApiError(400, "Chat id not provided");
  if (!name) throw new ApiError(400, "New Name not provided");
  let chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");
  if (!chat.groupChat)
    throw new ApiError(400, "You can only edit name of group chat");
  if (
    !chat.creator.toString === req.user._id.toString() &&
    !chat.admins.includes(req.user._id.toString())
  )
    throw new ApiError(400, "You are not allowed to change Group Name");
  chat.name = name;
  await chat.save();
  emitEvent(req, REFTCH_CHATS, chat.members);
  return res
    .status(200)
    .json(new ApiResponse(200, { message: "Group Name Updated" }));
});

const deleteChat = AsyncHandler(async (req, res) => {
  const { id: chatId } = req.params;
  if (!chatId) throw new ApiError(400, "Chat ID not provided");

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  const userId = req.user._id.toString();

  if (!chat.groupChat && chat.creator.toString() !== userId)
    throw new ApiError(403, "You are not allowed to delete this Group");

  if (!chat.groupChat && !chat.members.includes(userId))
    throw new ApiError(403, "You are not allowed to delete this Group");

  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const publicIds = messagesWithAttachments.flatMap(({ attachments }) =>
    attachments.map(({ publicId }) => publicId)
  );

  // Delete attachments, chat, and messages concurrently
  await Promise.all([
    deleteFileFromCloudinary(publicIds),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFTCH_CHATS, chat.members);
  // Optional: Notify members about the deletion
  // emitEvent(req, ALERT, chat.members, `${req.user.name} deleted the group`);

  return res
    .status(200)
    .json(new ApiResponse(200, { message: "Chat deleted successfully" }));
});

const getMessages = AsyncHandler(async (req, res) => {
  const { id: chatId } = req.params;
  const { page = 1 } = req.query;
  const resultPerPage = 20;
  const skippedMessages = (page - 1) * resultPerPage;

  const [messages, totalMessages] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skippedMessages)
      .limit(resultPerPage)
      .populate("sender", "name")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);
  const totalPages = Math.ceil(totalMessages / resultPerPage);

  return res.status(200).json(
    new ApiResponse(200, {
      messages: messages.reverse(),
      totalPages,
    })
  );
});

export {
  createNewGroup,
  getUserChats,
  getUserGroups,
  addMembersInGroup,
  removeMemberFromGroup,
  assignAdmin,
  assignCreator,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  changeGroupName,
  deleteChat,
  getMessages,
};
