const express = require('express');
const { allMessage, sendMessage } = require('../controller/messageController');
const { protect } = require('../middleware/authmiddleware');
const Message = require('../model/MessageModel');
const Router = express.Router();

Router.post('/', protect, sendMessage);
Router.get('/:chatId', protect, allMessage);

// GET last message of a chat
Router.get('/last/:chatId', protect, async (req, res) => {
  const chatId = req.params.chatId;
  try {
    const lastMsg = await Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .limit(1)
      .populate('sender', 'name email');

    res.json(lastMsg[0] || null);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = Router;
