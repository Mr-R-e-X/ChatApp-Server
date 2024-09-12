import { Server } from "socket.io";

let io;

export const initializeIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected ", socket.id);

    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
