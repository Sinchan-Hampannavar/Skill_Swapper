require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

// --- MIDDLEWARE ---
app.use(cors()); // Allows your Netlify frontend to talk to this backend
app.use(express.json()); // Allows server to parse JSON data

// --- DATABASE CONNECTION ---
// Pulls the Atlas string from Render Environment Variables for security
const dbURI = process.env.MONGODB_URI;

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
    timestamp: { type: Date, default: Date.now }
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
        res.status(500).json({ error: "Login failed" });
    }
});

// Get All Users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch users" });
    }
});

// Send a Message or Transaction
app.post('/api/messages', async (req, res) => {
    const { sender, recipient, text, isTransaction } = req.body;
    
    try {
        if (isTransaction) {
            const payer = await User.findOne({ name: sender });
            if (!payer || payer.balance < 1) return res.status(400).json({ error: "Insufficient credits!" });
            
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
        res.status(500).json({ error: "Could not fetch messages" });
    }
});

// --- SERVER START ---
// Use process.env.PORT for Render compatibility (defaulting to 10000)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));