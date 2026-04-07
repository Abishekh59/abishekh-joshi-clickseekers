import { Server } from "socket.io";

let io: Server | null = null;

export const setIo = (socketIo: Server) => {
  io = socketIo;
};

export const getIo = (): Server | null => {
  return io;
};
