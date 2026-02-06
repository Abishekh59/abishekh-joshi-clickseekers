import express from "express";
import * as chatController from "../controllers/chatController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.use(authenticate);

// Send message
router.post("/send", chatController.sendMessage);

// Get chat history with a specific user
router.get("/history/:userId", chatController.getChatHistory);

// Get all conversations list
router.get("/conversations", chatController.getConversations);

export default router;
