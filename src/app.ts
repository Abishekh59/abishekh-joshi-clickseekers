import cors from "cors";
import "dotenv/config";
import type { Request, Response } from "express";
import express from "express";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import photographerRoutes from "./routes/photographerRoutes";
import userRoutes from "./routes/userRoutes";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust this in production
    methods: ["GET", "POST"],
  },
});

// Middleware
const defaultAllowedOrigins = [
  "http://localhost:8000",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://127.0.0.1:3000",
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

// Load port from .env or fallback to 3000
const PORT = process.env.PORT || 3000;

// Socket.io context
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join_room", (userId) => {
    const normalizedId = String(userId).toLowerCase();
    socket.join(normalizedId);
    console.log(`User ${normalizedId} joined room`);
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

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});