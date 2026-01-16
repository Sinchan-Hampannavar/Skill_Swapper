require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
// Pulls the Atlas string from .env for security
const dbURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/skillswap";

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
app.post('/api/login', async (req, res) => {
    const { name, skill, want } = req.body;
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
});

app.get('/api/users', async (req, res) => res.json(await User.find()));

app.post('/api/messages', async (req, res) => {
    const { sender, recipient, text, isTransaction } = req.body;
    
    if (isTransaction) {
        const payer = await User.findOne({ name: sender });
        if (!payer || payer.balance < 1) return res.status(400).json({ error: "Insufficient credits!" });
        
        await User.findOneAndUpdate({ name: sender }, { $inc: { balance: -1.0 } });
        await User.findOneAndUpdate({ name: recipient }, { 
            $inc: { balance: 1.0 },
            $addToSet: { badges: "🌟 Top Mentor" } 
        });
    }

    await new Message({ sender, recipient, text }).save();
    res.json({ success: true });
});

app.get('/api/messages', async (req, res) => {
    const { user1, user2 } = req.query;
    res.json(await Message.find({ 
        $or: [
            { sender: user1, recipient: user2 }, 
            { sender: user2, recipient: user1 }
        ] 
    }).sort({ timestamp: 1 }));
});

// --- SERVER START ---
// Use process.env.PORT for cloud hosting compatibility
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));