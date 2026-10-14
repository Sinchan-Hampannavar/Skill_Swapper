const API_URL = "https://skill-swapper-1.onrender.com/api";

let currentUser = null;
let currentChatPartner = null;
let allUsersCache = [];
let unreadData = []; // NEW

window.onload = () => {
    const saved = sessionStorage.getItem("skillswap_user");
    if (!saved) return;

    try {
        currentUser = JSON.parse(saved);
    } catch (error) {
        console.error("Could not read the saved profile:", error);
        sessionStorage.removeItem("skillswap_user");
        return;
    }

    if (!currentUser || !currentUser.name) {
        sessionStorage.removeItem("skillswap_user");
        return;
    }

    setupUI();
    refreshUI();
    fetchUnread(); // NEW
    setInterval(() => { // NEW
        fetchMessages();
        fetchUnread();
    }, 3000);
};

// When another tab creates or updates a profile, refresh this tab's list.
window.addEventListener("storage", (event) => {
    if (event.key === "skillswap_users_updated" && currentUser) {
        refreshUI();
    }
});

function setupUI() {
    document.getElementById("login-overlay").classList.add("hidden");
    document.getElementById("user-badge").classList.remove("hidden");
    document.getElementById("my-name").innerText = currentUser.name;
    document.getElementById("my-avatar").innerText =
        currentUser.name[0].toUpperCase();
}

async function refreshUI() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) {
            throw new Error(`Could not load profiles (${response.status})`);
        }

        allUsersCache = await response.json();

        const myProfile = allUsersCache.find(
            (user) => user.name === currentUser.name
        );

        if (myProfile) {
            const balance = Number(myProfile.balance ?? 0);
            document.getElementById("balance-display").innerText =
                `${balance.toFixed(1)} Hours`;
        }

        renderUserGrid(allUsersCache);
    } catch (error) {
        console.error("Error refreshing profiles:", error);
    }
}

// ---------- NEW: notifications ----------
async function fetchUnread() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/unread?user=${encodeURIComponent(currentUser.name)}`);
        if (!res.ok) return;
        unreadData = await res.json();
        renderNotifications();
    } catch (error) {
        console.error("Unread error:", error);
    }
}

function renderNotifications() {
    const total = unreadData.reduce((sum, u) => sum + u.count, 0);
    const badge = document.getElementById("bell-badge");
    const panel = document.getElementById("notif-panel");
    if (!badge || !panel) return;

    badge.innerText = total > 9 ? "9+" : total;
    badge.classList.toggle("hidden", total === 0);

    panel.innerHTML = unreadData.length === 0
        ? `<p class="text-xs text-slate-400 text-center p-4">No new messages</p>`
        : unreadData.map((u) => `
            <button onclick="openFromNotification('${u._id}')"
                class="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center gap-3">
                <div class="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black">${u._id[0].toUpperCase()}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-slate-900">${u._id}</p>
                    <p class="text-xs text-slate-500 truncate">${u.last}</p>
                </div>
                <span class="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">${u.count}</span>
            </button>
        `).join("");
}

function toggleNotifications() {
    document.getElementById("notif-panel").classList.toggle("hidden");
}

function openFromNotification(name) {
    document.getElementById("notif-panel").classList.add("hidden");
    const user = allUsersCache.find((u) => u.name === name);
    openChat(name, user?.avatar || "");
}
// ---------- end notifications ----------

function renderUserGrid(users) {
    const grid = document.getElementById("user-grid");
    if (!grid || !currentUser) return;

    const others = users.filter((user) => user.name !== currentUser.name);

    grid.innerHTML = others.map((user) => `
        <div class="bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:shadow-xl transition-all">
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">
                    ${user.avatar || user.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div class="flex gap-1">
                    ${(user.badges || []).map((badge) => `
                        <span class="bg-amber-100 text-amber-600 text-[8px] font-bold px-2 py-1 rounded-full uppercase">${badge}</span>
                    `).join("")}
                </div>
            </div>

            <h4 class="text-xl font-extrabold text-slate-900">${user.name}</h4>

            <div class="mt-4 space-y-1">
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Teaches</p>
                <p class="text-sm text-slate-600 font-medium">${user.skill || ""}</p>
            </div>

            <button
                onclick="openChat('${user.name}', '${user.avatar || ""}')"
                class="w-full mt-6 bg-slate-900 text-white py-3 rounded-2xl font-bold text-xs hover:bg-emerald-600 transition-all">
                Message Mentor
            </button>
        </div>
    `).join("");
}

const searchInput = document.getElementById("search-input");
if (searchInput) {
    searchInput.addEventListener("input", (event) => {
        const term = event.target.value.toLowerCase();

        const filteredUsers = allUsersCache.filter((user) =>
            user.name.toLowerCase().includes(term) ||
            (user.skill || "").toLowerCase().includes(term)
        );

        renderUserGrid(filteredUsers);
    });
}

async function sendCredit() {
    if (!currentUser || !currentChatPartner) return;
    if (!confirm(`Send 1.0 Hour to ${currentChatPartner}?`)) return;

    try {
        const response = await fetch(`${API_URL}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sender: currentUser.name,
                recipient: currentChatPartner,
                text: "🤝 PAID: 1.0 hour credit sent.",
                isTransaction: true
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Could not send the credit.");
            return;
        }

        alert("Payment successful!");
        await refreshUI();
    } catch (error) {
        console.error("Credit error:", error);
        alert("Could not connect to the server.");
    }
}

function generateMeetLink() {
    const input = document.getElementById("message-input");
    if (!input) return;

    const roomNumber = Math.floor(Math.random() * 10000);
    input.value = `Meet here: https://meet.jit.si/SkillSwap-${roomNumber}`;
}

async function openChat(name, avatar) {
    if (!currentUser) return;

    currentChatPartner = name;

    document.getElementById("chat-with-name").innerText = name;
    document.getElementById("chat-avatar").innerText = avatar || name[0] || "?";
    document.getElementById("chat-view").classList.remove("hidden");

    setTimeout(() => {
        document.getElementById("chat-view").classList.add("active");
    }, 10);

    await fetchMessages();
}

async function handleSendMessage() {
    if (!currentUser || !currentChatPartner) return;

    const input = document.getElementById("message-input");
    const text = input.value.trim();
    if (!text) return;

    try {
        const response = await fetch(`${API_URL}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sender: currentUser.name,
                recipient: currentChatPartner,
                text
            })
        });

        if (!response.ok) {
            throw new Error(`Message failed (${response.status})`);
        }

        input.value = "";
        await fetchMessages();
    } catch (error) {
        console.error("Message error:", error);
        alert("Could not send the message.");
    }
}

async function fetchMessages() {
    if (!currentUser || !currentChatPartner) return;

    const chatView = document.getElementById("chat-view");
    if (!chatView || chatView.classList.contains("hidden")) return;

    try {
        const user1 = encodeURIComponent(currentUser.name);
        const user2 = encodeURIComponent(currentChatPartner);
        const response = await fetch(
            `${API_URL}/messages?user1=${user1}&user2=${user2}`
        );

        if (!response.ok) {
            throw new Error(`Could not load messages (${response.status})`);
        }

        const messages = await response.json();

        document.getElementById("chat-messages").innerHTML = messages.map((message) => `
            <div class="flex ${message.sender === currentUser.name ? "justify-end" : "justify-start"} mb-2">
                <div class="${message.sender === currentUser.name ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-slate-100 text-slate-800"} p-3 rounded-2xl max-w-[85%] text-xs font-medium">
                    ${message.text}
                </div>
            </div>
        `).join("");

        const box = document.getElementById("chat-messages");
        box.scrollTop = box.scrollHeight;

        // NEW: mark messages as read once the chat is open
        const hasUnread = messages.some(
            (m) => m.sender === currentChatPartner && !m.read
        );
        if (hasUnread) {
            await fetch(`${API_URL}/mark-read`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sender: currentChatPartner,
                    recipient: currentUser.name
                })
            });
            fetchUnread();
        }
    } catch (error) {
        console.error("Could not load messages:", error);
    }
}

async function handleLogin() {
    const name = document.getElementById("login-name").value.trim();
    const skill = document.getElementById("login-skill").value.trim();
    const want = document.getElementById("login-want").value.trim();

    if (!name || !skill) {
        alert("Please enter your name and the skill you teach.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, skill, want })
        });

        const data = await response.json();

        if (!response.ok || !data.user) {
            throw new Error(data.error || "Login failed.");
        }

        // Each browser tab keeps its own signed-in profile.
        sessionStorage.setItem("skillswap_user", JSON.stringify(data.user));

        // Tell the other tabs to reload their profile lists.
        localStorage.setItem(
            "skillswap_users_updated",
            `${Date.now()}-${Math.random()}`
        );

        location.reload();
    } catch (error) {
        console.error("Login error:", error);
        alert(error.message || "Could not connect to the server. Try again shortly.");
    }
}

function handleLogout() {
    sessionStorage.removeItem("skillswap_user");
    location.reload();
}

function closeChat() {
    const chatView = document.getElementById("chat-view");
    chatView.classList.remove("active");

    setTimeout(() => {
        chatView.classList.add("hidden");
        currentChatPartner = null;
    }, 400);
}