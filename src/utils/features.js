import { userSocketIDs } from "../socket/socket.js";

const getSocketIDs = (users) => {
  return users.map((user) =>
    userSocketIDs.get(user._id.toString() || user.toString())
  );
};

const emitEvent = (req, event, users, roomId, data = {}) => {
  const io = req.app.get("io");
  io.in(roomId).emit(event, data);
};

const emitAlertEvent = (req, event, users, data = {}) => {
  const io = req.app.get("io");
  const socketIds = getSocketIDs(users);
  socketIds.forEach((socketId) => {
    console.log(`Sending ${data} to ${socketId} using ${event}`);
    io.to(socketId).emit(event, data);
  });
};
export { emitEvent, emitAlertEvent, getSocketIDs };
