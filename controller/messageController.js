const User = require('../model/UserModel');
const bcrypt = require('bcrypt');
const generateToken = require('../webtoken/generateToken');
const Chat = require('../model/ChatModel');
const Message = require('../model/MessageModel');
const mongoose = require('mongoose');

// GET all messages in a chat
const allMessage = async (req, res) => {
    try {
        let chatId = req.params.chatId;

        // Remove anything after &
        if (chatId.includes('&')) {
            chatId = chatId.split('&')[0];
        }

        // Validate chatId before DB query
        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ message: 'Invalid chat ID format' });
        }

        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'name email')
            .populate('receiver')
            .populate('chat');

        res.json(messages);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// SEND a new message
const sendMessage = async (req, res) => {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
        return res.status(400).json({ message: 'Content and chatId are required' });
    }

    const newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId
    };

    try {
        let savedMessage = await Message.create(newMessage);
        savedMessage = await savedMessage.populate('sender', 'name');
        savedMessage = await savedMessage.populate('chat');
        savedMessage = await savedMessage.populate('receiver');
        savedMessage = await savedMessage.populate({
            path: 'chat.users',
            select: 'name email'
        });

        await Chat.findByIdAndUpdate(chatId, {
            latestMessage: savedMessage
        });

        res.json(savedMessage);
    } catch (err) {
        res.status(400);
        throw new Error(err.message); // FIXED
    }
};

module.exports = { allMessage, sendMessage };
