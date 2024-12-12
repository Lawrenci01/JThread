import { Server } from "socket.io";  
import http from "http";  
import express from "express";  
import Message from "../models/messageModel.js";  
import Conversation from "../models/conversationModel.js";  

const app = express();  
const server = http.createServer(app);  
const io = new Server(server, {  
    cors: {  
        origin: process.env.CLIENT_URL || "http://localhost:3000", // Use an environment variable  
        methods: ["GET", "POST"],  
    },  
});  

const userSocketMap = {}; // userId: socketId  

export const getRecipientSocketId = (recipientId) => {  
    return userSocketMap[recipientId];  
};  

io.on("connection", (socket) => {  
    console.log(`User connected: ${socket.id}`);  
    
    const userId = socket.handshake.query.userId;  

    if (userId && userId !== "undefined") {  
        userSocketMap[userId] = socket.id;  

        io.emit("getOnlineUsers", Object.keys(userSocketMap));  
    }  

    socket.on("markMessagesAsSeen", async ({ conversationId, userId }) => {  
        try {  
            await Message.updateMany(  
                { conversationId: conversationId, seen: false },  
                { $set: { seen: true } }  
            );  
            await Conversation.updateOne(  
                { _id: conversationId },  
                { $set: { "lastMessage.seen": true } }  
            );  
            io.to(userSocketMap[userId]).emit("messagesSeen", { conversationId });  
        } catch (error) {  
            console.error(`Error marking messages as seen: ${error}`);  
        }  
    });  

    socket.on("disconnect", () => {  
        console.log(`User disconnected: ${socket.id}`);  
        const disconnectedUserId = Object.keys(userSocketMap).find(userId => userSocketMap[userId] === socket.id);  
        if (disconnectedUserId) {  
            delete userSocketMap[disconnectedUserId];  
            io.emit("getOnlineUsers", Object.keys(userSocketMap));  
        }  
    });  
});  

export { io, server, app };
