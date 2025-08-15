const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OpenTok = require('opentok');

// Load environment variables first
dotenv.config();

const userRouter = require('./Routes/userRouter');
const chatRouter = require('./Routes/chatRouter');
const messageRouter = require('./Routes/messageRouter');
const Message = require('./model/MessageModel');

const router = express.Router();

// Initialize OpenTok after dotenv
const apiKey = process.env.VONAGE_API_KEY;
const apiSecret = process.env.VONAGE_API_SECRET;

if (!apiKey || !apiSecret) {
    console.error("OpenTok API key or secret not found in .env");
    process.exit(1);
}

const opentok = new OpenTok(apiKey, apiSecret);

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const MongoDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database chat-world');
    } catch (err) {
        console.log('Database connection error:', err.message);
    }
};
MongoDb();

// REST endpoints
app.get('/', (req, res) => {
    res.send('Server is running on localhost:5000');
});

app.use('/user', userRouter);
app.use('/chat', chatRouter);
app.use('/message', messageRouter);
app.use('/video', router);

// Multer setup for local storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload endpoint (local storage)
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).send({ message: 'No file uploaded' });

    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    console.log('File uploaded successfully:', req.file.filename);

    res.json({
      message: 'File uploaded successfully',
      url: fileUrl,
      filename: req.file.filename,
      type: req.file.mimetype.split('/')[0]
    });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).send({ message: 'Upload failed' });
  }
});

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms = new Map();
// Socket.IO events
io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    socket.on('sendMessage', async (msg) => {
        try {
            const newMessage = await Message.create({
                chat: msg.chatId,
                sender: msg.sender?._id || msg.sender.id,
                content: msg.content,
                file: msg.file || null
            });

            const populatedMessage = await newMessage.populate('sender', 'name');

            socket.join(msg.chatId);
            io.to(msg.chatId).emit('newMessage', populatedMessage);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    socket.on("join-call", ({ roomId }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    const set = rooms.get(roomId);
    // tell the new user who is already in the room (excluding self)
    const others = Array.from(set);
    socket.emit("existing-users", others);

    set.add(socket.id);

    const count = set.size;
    socket.to(roomId).emit("user-joined", socket.id, count);
    io.to(roomId).emit("participants-update", count);
  });

  socket.on("leave-call", ({ roomId }) => {
    // cleanup
    socket.leave(roomId);
    const set = rooms.get(roomId);
    if (set) {
      set.delete(socket.id);
      const count = set.size;
      socket.to(roomId).emit("user-left", count);
      io.to(roomId).emit("participants-update", count);
      if (set.size === 0) rooms.delete(roomId);
    }
  });

  // Relay WebRTC offers/answers/ICE
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });
  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });
  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("joinRoom", (roomId) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(socket.id);
  socket.join(roomId);
});

  socket.on("disconnect", () => {
    // remove from any rooms
    for (const [roomId, set] of rooms) {
      if (set.has(socket.id)) {
        set.delete(socket.id);
        const count = set.size;
        socket.to(roomId).emit("user-left", count);
        io.to(roomId).emit("participants-update", count);
        if (set.size === 0) rooms.delete(roomId);
      }
    }
  });
});


// OpenTok session endpoint
router.get('/session', (req, res) => {
  opentok.createSession({ mediaMode: 'routed' }, (err, session) => {
    if (err) {
      console.error('OpenTok session creation error:', err);
      return res.status(500).json({ message: 'Session creation failed', error: err });
    }

    try {
      const token = session.generateToken();
      res.json({ apiKey, sessionId: session.sessionId, token });
    } catch (tokenErr) {
      console.error('Token generation error:', tokenErr);
      res.status(500).json({ message: 'Token generation failed', error: tokenErr });
    }
  });
});


// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
