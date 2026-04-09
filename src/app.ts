import cors from "cors";
import "dotenv/config";
import type { Request, Response } from "express";
import express from "express";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import photographerRoutes from "./routes/photographerRoutes";
import userRoutes from "./routes/userRoutes";
import { setIo } from "./utils/socketInstance";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust this in production
    methods: ["GET", "POST"],
  },
});

// Set the global io instance for services
setIo(io);

// Middleware
const defaultAllowedOrigins = [
  "http://localhost:8000",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://127.0.0.1:3000",
  "https://abishekh-joshi-clickseekers.onrender.com",
];

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = envAllowedOrigins.length > 0 ? envAllowedOrigins : defaultAllowedOrigins;

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    console.log("CORS Request Origin:", origin);
    console.log("Allowed Origins:", allowedOrigins);

    // Allow server-to-server/no-origin requests and local network origins
    const isLocalNetwork = origin && /^http:\/\/192\.168\.\d+\.\d+(?::\d+)?$/.test(origin);
    const isAllowed = !origin || allowedOrigins.includes(origin) || isLocalNetwork;

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log("CORS blocked for origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["content-type", "authorization", "accept", "origin", "x-requested-with"],
  exposedHeaders: ["content-type", "authorization"],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'None'}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.io to request object
app.use((req: any, res, next) => {
  req.io = io;
  next();
});

// Serve uploaded images
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));

// Routes
app.get("/", async (req: Request, res: Response) => {
  res.send("This is the backend of Clickseekers");
});

// User routes
app.use("/api/users", userRoutes);

// Client routes
import clientRoutes from "./routes/clientRoutes";
app.use("/api/client", clientRoutes);

// Photographer routes
app.use('/api/photographer', photographerRoutes);

// Package routes
import packageRoutes from './routes/packageRoutes';
app.use('/api/packages', packageRoutes);

// Booking routes
import bookingRoutes from './routes/bookingRoutes';
app.use('/api/bookings', bookingRoutes);

// Chat routes
import chatRoutes from './routes/chatRoutes';
app.use('/api/chat', chatRoutes);

// Rewards routes
import rewardsRoutes from './routes/rewardsRoutes';
app.use('/api/rewards', rewardsRoutes);

// Availability routes
import availabilityRoutes from './routes/availabilityRoutes';
app.use('/api/availability', availabilityRoutes);

// Admin routes
import adminRoutes from './routes/adminRoutes';
app.use('/api/admin', adminRoutes);

// Payment routes
import paymentRoutes from './routes/paymentRoutes';
app.use('/api/payment', paymentRoutes);

// Load port from .env or fallback to 3000
const PORT = process.env.PORT || 3000;

// Socket.io context
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const onlineUsers = new Map<string, Set<string>>(); // userId -> set of socket ids

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.user_id) {
        socket.data.userId = String(decoded.user_id).toLowerCase();
      }
    } catch (e) {
      console.warn("Invalid socket token");
    }
  }
  next();
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  const userId = socket.data.userId;
  if (userId) {
    let sockets = onlineUsers.get(userId);
    if (!sockets) {
      sockets = new Set();
      onlineUsers.set(userId, sockets);
      // First connection - broadcast online status
      io.emit("user_status", { userId, is_online: true });
    }
    sockets.add(socket.id);
  }

  socket.on("get_user_status", (data) => {
    if (!data || !data.user_id) return;
    const targetId = String(data.user_id).toLowerCase();
    const isOnline = onlineUsers.has(targetId) && onlineUsers.get(targetId)!.size > 0;
    socket.emit("user_status", { userId: targetId, is_online: isOnline });
  });

  socket.on("join_room", (targetUserId) => {
    const normalizedId = String(targetUserId).toLowerCase();
    socket.join(normalizedId);
    console.log(`User/Socket ${socket.id} joined room ${normalizedId}`);
  });

  socket.on("send_message", (data) => {
    // data: { senderId, receiverId, text, ... }
    const normalizedReceiverId = String(data.receiverId).toLowerCase();
    io.to(normalizedReceiverId).emit("new_message", data);
  });

  socket.on("booking_update", (data) => {
    // data: { userId, status, ... }
    const normalizedUserId = String(data.userId).toLowerCase();
    io.to(normalizedUserId).emit("booking_updated", data);
  });

  socket.on("new_booking_request", (data) => {
    // data: { photographerId, ... }
    const normalizedPhotographerId = String(data.photographerId).toLowerCase();
    io.to(normalizedPhotographerId).emit("new_booking", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    if (userId) {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline status
          io.emit("user_status", { userId, is_online: false });
        }
      }
    }
  });
});


// Global error handler (always returns JSON)
import type { NextFunction } from "express";

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Handle CORS errors and all other errors
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ success: false, message: message });
});

// Initialize automated jobs
import { initBookingScheduler } from './services/bookingScheduler';
import { initRewardsScheduler } from './services/rewardsScheduler';
initBookingScheduler();
initRewardsScheduler();

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});