import type { Request, Response } from "express";
import prisma from "../model";
import { getFullImageUrl } from "../utils/imageUtils";

// Send a message
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const senderId = req.user?.user_id;

        if (!senderId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { receiverId, message } = req.body;

        if (!receiverId || !message) {
            res.status(400).json({ message: "Receiver ID and message are required" });
            return;
        }

        // Save message to database
        const newMessage = await prisma.chat.create({
            data: {
                sender_id: senderId,
                receiver_id: receiverId,
                message: message,
            },
            include: {
                sender: {
                    select: {
                        user_id: true,
                        full_name: true,
                        profile_image: true,
                    },
                },
                receiver: {
                    select: {
                        user_id: true,
                        full_name: true,
                        profile_image: true,
                    },
                },
            },
        });

        // Create Notification
        const sender = await prisma.user.findUnique({ where: { user_id: senderId }, select: { full_name: true } });
        const notification = await prisma.notification.create({
            data: {
                user_id: receiverId,
                title: 'New Message',
                type: 'CHAT',
                message: `${sender?.full_name || 'Someone'} sent you a message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
                is_read: false
            }
        });

        // Emit real-time update via Socket.io
        // Access the io instance attached to the request object in app.ts
        const io = (req as any).io;
        if (io) {
            const normalizedSenderId = String(senderId).toLowerCase();
            const normalizedReceiverId = String(receiverId).toLowerCase();
            io.to(normalizedSenderId).emit("new_message", newMessage);
            io.to(normalizedReceiverId).emit("new_message", newMessage);

            // Emit new_notification
            io.to(normalizedReceiverId).emit('new_notification', {
                ...notification,
                userId: receiverId
            });
        }

        const transformedMessage = {
            ...newMessage,
            sender: newMessage.sender ? {
                ...newMessage.sender,
                profile_image: getFullImageUrl(newMessage.sender.profile_image)
            } : null,
            receiver: newMessage.receiver ? {
                ...newMessage.receiver,
                profile_image: getFullImageUrl(newMessage.receiver.profile_image)
            } : null
        };

        res.status(201).json({ success: true, data: transformedMessage });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Get chat history with a specific user
export const getChatHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const currentUserId = req.user?.user_id;

        if (!currentUserId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { userId } = req.params; // The other user's ID

        if (!userId) {
            res.status(400).json({ message: "User ID is required" });
            return;
        }

        const messages = await prisma.chat.findMany({
            where: {
                OR: [
                    { sender_id: currentUserId, receiver_id: userId },
                    { sender_id: userId, receiver_id: currentUserId },
                ],
            },
            orderBy: {
                sent_at: "asc",
            },
            include: {
                sender: {
                    select: {
                        user_id: true,
                        full_name: true,
                        profile_image: true,
                    },
                },
                receiver: {
                    select: {
                        user_id: true,
                        full_name: true,
                        profile_image: true,
                    },
                },
            },
        });

        const transformedMessages = messages.map((msg: any) => ({
            ...msg,
            sender: msg.sender ? {
                ...msg.sender,
                profile_image: getFullImageUrl(msg.sender.profile_image)
            } : null,
            receiver: msg.receiver ? {
                ...msg.receiver,
                profile_image: getFullImageUrl(msg.receiver.profile_image)
            } : null
        }));

        res.status(200).json({ success: true, data: transformedMessages });
    } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Get list of conversations (users the current user has chatted with)
export const getConversations = async (req: Request, res: Response): Promise<void> => {
    try {
        const currentUserId = req.user?.user_id;

        if (!currentUserId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Find all distinct users who have sent messages to or received messages from the current user
        // This is a bit complex with Prisma, often easier to fetch customized distinct lists
        // A simpler approach for now to get started:

        // Get all messages involving the user
        const messages = await prisma.chat.findMany({
            where: {
                OR: [
                    { sender_id: currentUserId },
                    { receiver_id: currentUserId },
                ],
            },
            orderBy: {
                sent_at: 'desc'
            },
            include: {
                sender: {
                    select: {
                        user_id: true,
                        full_name: true,
                        profile_image: true,
                        role: true
                    }
                },
                receiver: {
                    select: {
                        user_id: true,
                        full_name: true,
                        profile_image: true,
                        role: true
                    }
                }
            }
        });

        // Process in memory to get unique conversation partners
        const conversationsMap = new Map();
        const normalizedCurrentId = String(currentUserId).toLowerCase();

        messages.forEach((msg: any) => {
            const senderId = String(msg.sender_id).toLowerCase();
            const partner = senderId === normalizedCurrentId ? msg.receiver : msg.sender;

            if (partner && partner.user_id) {
                const partnerId = String(partner.user_id).toLowerCase();
                if (!conversationsMap.has(partnerId)) {
                    conversationsMap.set(partnerId, {
                        user: {
                            ...partner,
                            profile_image: getFullImageUrl(partner.profile_image)
                        },
                        lastMessage: msg
                    });
                }
            }
        });

        const conversations = Array.from(conversationsMap.values());

        res.status(200).json({ success: true, data: conversations });

    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
