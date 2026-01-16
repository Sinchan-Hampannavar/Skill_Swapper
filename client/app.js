const API_URL = "https://skill-swapper-1.onrender.com/api";
let currentUser = null;
let currentChatPartner = null;
let allUsersCache = [];

window.onload = () => {
    const saved = localStorage.getItem('skillswap_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        setupUI();
        refreshUI();
        setInterval(fetchMessages, 3000);
    }
};

function setupUI() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('user-badge').classList.remove('hidden');
    document.getElementById('my-name').innerText = currentUser.name;
    document.getElementById('my-avatar').innerText = currentUser.name[0].toUpperCase();
}

async function refreshUI() {
    try {
        const res = await fetch(`${API_URL}/users`);
        allUsersCache = await res.json();
        
        const me = allUsersCache.find(u => u.name === currentUser.name);
        if(me) document.getElementById('balance-display').innerText = `${me.balance.toFixed(1)} Hours`;

        renderUserGrid(allUsersCache);
    } catch (err) {
        console.error("Error refreshing UI:", err);
    }
}

function renderUserGrid(users) {
    const grid = document.getElementById('user-grid');
    const others = users.filter(u => u.name !== currentUser.name);
    
    grid.innerHTML = others.map(user => `
        <div class="bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:shadow-xl transition-all">
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">${user.avatar}</div>
                <div class="flex gap-1">
                    ${(user.badges || []).map(b => `<span class="bg-amber-100 text-amber-600 text-[8px] font-bold px-2 py-1 rounded-full uppercase">${b}</span>`).join('')}
                </div>
            </div>
            <h4 class="text-xl font-extrabold text-slate-900">${user.name}</h4>
            <div class="mt-4 space-y-1">
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Teaches</p>
                <p class="text-sm text-slate-600 font-medium">${user.skill}</p>
            </div>
            <button onclick="openChat('${user.name}', '${user.avatar}')" class="w-full mt-6 bg-slate-900 text-white py-3 rounded-2xl font-bold text-xs hover:bg-emerald-600 transition-all">Message Mentor</button>
        </div>
    `).join('');
}

// SEARCH LOGIC
document.getElementById('search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allUsersCache.filter(u => 
        u.name.toLowerCase().includes(term) || u.skill.toLowerCase().includes(term)
    );
    renderUserGrid(filtered);
});

async function sendCredit() {
    if(!confirm(`Send 1.0 Hour to ${currentChatPartner}?`)) return;
    const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser.name, recipient: currentChatPartner, text: `🤝 PAID: 1.0 hour credit sent.`, isTransaction: true })
    });
    if (res.ok) { refreshUI(); fetchMessages(); }
}

function generateMeetLink() {
    const link = `https://meet.jit.si/SkillSwap-${Math.floor(Math.random()*10000)}`;
    document.getElementById('message-input').value = `Meet here: ${link}`;
}

// Standard Messaging & Auth
function openChat(name, avatar) {
    currentChatPartner = name;
    document.getElementById('chat-with-name').innerText = name;
    document.getElementById('chat-avatar').innerText = avatar;
    document.getElementById('chat-view').classList.remove('hidden');
    setTimeout(() => document.getElementById('chat-view').classList.add('active'), 10);
    fetchMessages();
}

async function handleSendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if(!text) return;
    await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ sender: currentUser.name, recipient: currentChatPartner, text })
    });
    input.value = ""; fetchMessages();
}

async function fetchMessages() {
    if (document.getElementById('chat-view').classList.contains('hidden')) return;
    const res = await fetch(`${API_URL}/messages?user1=${currentUser.name}&user2=${currentChatPartner}`);
    const msgs = await res.json();
    document.getElementById('chat-messages').innerHTML = msgs.map(m => `
        <div class="flex ${m.sender === currentUser.name ? 'justify-end' : 'justify-start'} mb-2">
            <div class="${m.sender === currentUser.name ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-800'} p-3 rounded-2xl max-w-[85%] text-xs font-medium">${m.text}</div>
        </div>
    `).join('');
    const box = document.getElementById('chat-messages'); box.scrollTop = box.scrollHeight;
}

async function handleLogin() {
    const name = document.getElementById('login-name').value;
    const skill = document.getElementById('login-skill').value;
    const want = document.getElementById('login-want').value;

    if (!name || !skill) {
        alert("Please enter Name and Skill");
        return;
    }

    try {
        console.log("Attempting to connect to:", `${API_URL}/login`);
        const res = await fetch(`${API_URL}/login`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ name, skill, want }) 
        });

        if (!res.ok) throw new Error(`Server responded with ${res.status}`);

        const data = await res.json();
        console.log("Login successful:", data);

        localStorage.setItem('skillswap_user', JSON.stringify(data.user));
        location.reload(); // This "navigates" by refreshing the page to trigger window.onload
    } catch (error) {
        console.error("Login Error:", error);
        alert("Server Connection Error. Your backend might be waking up (Render free tier). Please wait 30 seconds and try again.");
    }
}

function handleLogout() { localStorage.removeItem('skillswap_user'); location.reload(); }
function closeChat() { document.getElementById('chat-view').classList.remove('active'); setTimeout(() => document.getElementById('chat-view').classList.add('hidden'), 400); }