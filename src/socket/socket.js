import cookieParser from "cookie-parser";
import { v4 as uuid } from "uuid";
import {
  ACCEPTED_INCOMING_CALL,
  CALL_ACCEPTED,
  CONNECT_TO_ROOM,
  ICE_CANDIDATE,
  INCOMING_CALL,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  RECEIVE_ICE_CANDIDATE,
  RTC_FINAL_NEGOTIATION,
  RTC_NEGOTIATION,
  RTC_NEGOTIATION_DONE,
  RTC_NEGOTIATION_NEEDED,
  START_NEW_CALL,
  START_TYPING,
  STOP_TYPING,
} from "../constants/event.constants.js";
import { socketAuthenticator } from "../middlewares/auth.middleware.js";
import { Chat } from "../models/chat.schema.js";
import { Message } from "../models/message.schema.js";
import { getSocketIDs } from "../utils/features.js";

const userSocketIDs = new Map();
const offers = new Map();

const initializeIO = (io) => {
  io.use((socket, next) => {
    cookieParser()(
      socket.request,
      socket.request.res,
      async (err) => await socketAuthenticator(err, socket, next)
    );
  });

  const mountJoinChat = (socket) => {
    socket.on(CONNECT_TO_ROOM, ({ chatId }) => {
      socket.join(chatId);
      console.log(`User ${socket.id} joined room ${chatId}`);
    });
  };

  try {
    io.on("connection", (socket) => {
      console.log("A user connected ", socket.id);

      const user = socket.user;
      if (user && user._id) {
        userSocketIDs.set(user._id.toString(), socket.id);
        console.log("User connected: ", userSocketIDs);
      }

      mountJoinChat(socket);

      socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
        const messageForRealTime = {
          content: message,
          _id: uuid(),
          sender: {
            _id: user._id,
            username: user.username,
            name: user.name,
          },
          chatId: chatId,
          createdAt: new Date().toISOString(),
        };
        const messageForDB = {
          content: message,
          sender: user._id,
          chat: chatId,
        };
        io.in(chatId).emit(NEW_MESSAGE, { message: messageForRealTime });

        getSocketIDs(members).forEach((socketId) => {
          console.log(
            `Sending ${messageForRealTime} to ${socketId} using ${NEW_MESSAGE_ALERT}`
          );
          io.to(socketId).emit(NEW_MESSAGE_ALERT, { chatId: chatId });
        });

        try {
          await Message.create(messageForDB);
        } catch (error) {
          console.log(error);
        }
      });

      socket.on(START_TYPING, ({ chatId, members }) => {
        console.log("started typing :: ", chatId);
        socket.broadcast.to(chatId).emit(START_TYPING, { chatId, members });
      });

      socket.on(STOP_TYPING, ({ chatId, members }) => {
        console.log("stopped typing :: ", chatId);
        socket.broadcast.to(chatId).emit(STOP_TYPING, { chatId, members });
      });

      socket.on(ICE_CANDIDATE, async ({ room, candidate, userId }) => {
        console.log(`room from line 100 ${room.chatId}`);
        const chatDetails = await Chat.findById(room.chatId);
        if (!chatDetails) {
          console.log("Chat not found");
          return;
        }
        const memberSockets = chatDetails.members.map((member) =>
          userSocketIDs.get(member.toString())
        );
        memberSockets.forEach((id) => {
          console.log("EMITTING ICE CANDIDATE");
          socket.to(id).emit(RECEIVE_ICE_CANDIDATE, {
            room,
            candidate,
            userId,
          });
        });
      });

      socket.on(START_NEW_CALL, async ({ room, offer }) => {
        const chatDetails = await Chat.findById(room.chatId);
        if (!chatDetails) {
          console.log("Chat not found");
          return;
        }

        const memberSockets = chatDetails.members.map((member) =>
          userSocketIDs.get(member.toString())
        );
        offers.set(chatDetails._id.toString(), {
          room,
          offer,
          roomName: chatDetails.name,
          roomMembers: chatDetails.members,
        });

        memberSockets.forEach((id) => {
          console.log("EMITTING INCOMING CALL");
          socket.to(id).emit(INCOMING_CALL, {
            room,
            offer,
          });
        });
      });

      socket.on(ACCEPTED_INCOMING_CALL, async ({ room, offer }) => {
        const { roomMembers } = offers.get(room.chatId);
        if (!offer || !roomMembers) {
          console.log("Offer or room members not found");
          return;
        }
        const chatDetails = await Chat.findById(room.chatId);
        if (!chatDetails) {
          console.log("Chat not found");
          return;
        }
        const memberSockets = roomMembers.map((member) =>
          userSocketIDs.get(member.toString())
        );

        memberSockets.forEach((id) => {
          console.log("EMITING ACCEPTRD CALL");
          socket.to(id).emit(ACCEPTED_INCOMING_CALL, {
            room,
            offer,
          });
        });
      });

      socket.on(CALL_ACCEPTED, async ({ room, answer }) => {
        const { offer, roomMembers } = offers.get(room.chatId);
        if (!offer || !roomMembers) {
          console.log("Offer or room members not found");
          return;
        }
        const memberSockets = roomMembers.map((member) =>
          userSocketIDs.get(member.toString())
        );

        memberSockets.forEach((id) => {
          socket.to(id).emit(CALL_ACCEPTED, {
            room,
            answer,
          });
        });
        // const hostSocket = userSocketIDs.get(room.hostUser);
        // console.log("CALL_ACCEPTED HOST ::  " + hostSocket);
        // socket.to(hostSocket).emit(ANSWER_RESPONSE, {
        //   room,
        //   answer,
        // });
      });

      socket.on(RTC_NEGOTIATION_NEEDED, async ({ room, offerNego }) => {
        console.log("RTC NEGOTIATION :: " + room);
        console.log("OFFER NEGO :: " + offerNego);
        const { offer, roomMembers, roomName } = offers.get(
          room.chatId.toString()
        );
        if (!offer || !roomMembers) {
          console.log("Offer or room members not found");
          return;
        }
        offers.set(room.chatId, {
          roomName,
          roomMembers,
          room,
          offer: offerNego,
        });
        const memberSockets = roomMembers.map((member) =>
          userSocketIDs.get(member.toString())
        );

        memberSockets.forEach((id) => {
          console.log("EMITTING RTC_NEGOTIATION");
          socket.to(id).emit(RTC_NEGOTIATION, {
            room,
            offer: offerNego,
          });
        });
      });

      socket.on(RTC_NEGOTIATION_DONE, async ({ room, answer }) => {
        const { offer, roomMembers } = offers.get(room.chatId.toString());
        if (!offer || !roomMembers) {
          console.log("Offer or room members not found");
          return;
        }
        const memberSockets = roomMembers.map((member) =>
          userSocketIDs.get(member.toString())
        );
        memberSockets.forEach((id) => {
          console.log("EMITTING RTC_FINAL_NEGOTIATION");
          socket.to(id).emit(RTC_FINAL_NEGOTIATION, {
            room,
            answer,
          });
        });
      });

      socket.on("disconnect", () => {
        console.log("user has disconnected 🚫. userId: " + socket.user?._id);
        if (socket.user?._id) {
          socket.leave(socket.user._id);
        }
      });
    });
  } catch (error) {
    socket.emit(
      ERROR_EVENT,
      error?.message || "Something went wrong while connecting to the socket."
    );
  }
};

const emitSocketEvent = (req, event, roomId, payload) => {
  req.app.get("io").in(roomId).emit(event, payload);
};

export { initializeIO, userSocketIDs };
