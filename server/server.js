const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
console.log('SERVER FILE UPDATED');

// --- MIDDLEWARE ---
app.use(cors({
    origin: [
        "https://skill-swaper.netlify.app",   // deployed frontend
        "http://127.0.0.1:5500",              // local dev
        "http://localhost:5500"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// --- DATABASE CONNECTION ---
const dbURI = process.env.MONGODB_URI;

if (!dbURI) {
    console.error("❌ MONGODB_URI is not set in environment variables!");
}

mongoose.connect(dbURI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ Connection Error:", err));

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
    name: { type: String, unique: true },
    skill: String,
    want: String,
    avatar: String,
    balance: { type: Number, default: 5.0 },
    badges: { type: [String], default: [] }
});

const messageSchema = new mongoose.Schema({
    sender: String,
    recipient: String,
    text: String,
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// --- ROUTES ---

// Login or Register User
app.post('/api/login', async (req, res) => {
    const { name, skill, want } = req.body;
    try {
        let user = await User.findOne({ name });
        if (!user) {
            user = new User({ name, skill, want, avatar: name.charAt(0).toUpperCase() });
            await user.save();
        } else {
            user.skill = skill;
            user.want = want;
            await user.save();
        }
        res.json({ user });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// Get All Users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        console.error("Users error:", error);
        res.status(500).json({ error: "Could not fetch users" });
    }
});

// Send a Message or Transaction
app.post('/api/messages', async (req, res) => {
    const { sender, recipient, text, isTransaction } = req.body;

    try {
        if (isTransaction) {
            const payer = await User.findOne({ name: sender });
            if (!payer || payer.balance < 1) {
                return res.status(400).json({ error: "Insufficient credits!" });
            }

            await User.findOneAndUpdate({ name: sender }, { $inc: { balance: -1.0 } });
            await User.findOneAndUpdate({ name: recipient }, {
                $inc: { balance: 1.0 },
                $addToSet: { badges: "🌟 Top Mentor" }
            });
        }

        const newMessage = new Message({ sender, recipient, text });
        await newMessage.save();
        res.json({ success: true });
    } catch (error) {
        console.error("Message error:", error);
        res.status(500).json({ error: "Message failed to send" });
    }
});

// Get Chat History between two users
app.get('/api/messages', async (req, res) => {
    const { user1, user2 } = req.query;
    try {
        const messages = await Message.find({
            $or: [
                { sender: user1, recipient: user2 },
                { sender: user2, recipient: user1 }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        console.error("Fetch messages error:", error);
        res.status(500).json({ error: "Could not fetch messages" });
    }
});

// Unread message counts per sender
app.get('/api/unread', async (req, res) => {
    const { user } = req.query;
    try {
        const unread = await Message.aggregate([
            { $match: { recipient: user, read: false } },
            { $sort: { timestamp: 1 } },
            { $group: { _id: "$sender", count: { $sum: 1 }, last: { $last: "$text" } } }
        ]);
        res.json(unread);
    } catch (error) {
        console.error("Unread error:", error);
        res.status(500).json({ error: "Could not fetch unread" });
    }
});

// Mark messages as read
app.post('/api/mark-read', async (req, res) => {
    const { sender, recipient } = req.body;
    try {
        await Message.updateMany(
            { sender, recipient, read: false },
            { $set: { read: true } }
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Mark-read error:", error);
        res.status(500).json({ error: "Could not mark as read" });
    }
});

// --- STATIC FILES (optional, only if /client exists on Render) ---
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// --- SERVER START ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));