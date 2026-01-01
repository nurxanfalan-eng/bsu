// Dashboard Functionality with Baku Time (UTC+4) and Auto-scroll

const socket = io();
let currentUser = null;
let currentFaculty = null;
let currentPrivateChat = null;
let blockedUsers = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentUser();
    initializeSocketListeners();
});

// Load Current User
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        
        currentUser = await response.json();
        
        // Update UI with user info
        updateUserProfile();
        
        // Join socket
        socket.emit('join', currentUser.id);
        
    } catch (error) {
        console.error('Error loading user:', error);
        window.location.href = '/';
    }
}

// Update User Profile UI
function updateUserProfile() {
    const initial = currentUser.fullName.charAt(0).toUpperCase();
    
    document.getElementById('userName').textContent = currentUser.fullName;
    document.getElementById('userFaculty').textContent = currentUser.faculty;
    document.getElementById('userInitial').textContent = initial;
    
    if (currentUser.profileImage) {
        document.getElementById('userAvatar').innerHTML = `<img src="${currentUser.profileImage}" alt="Profile">`;
    }
    
    // Update modal
    document.getElementById('modalUserName').textContent = currentUser.fullName;
    document.getElementById('modalUserEmail').textContent = currentUser.email;
    document.getElementById('modalUserFaculty').textContent = currentUser.faculty;
    document.getElementById('modalUserDegree').textContent = currentUser.degree;
    document.getElementById('modalUserCourse').textContent = currentUser.course;
    document.getElementById('profilePreviewInitial').textContent = initial;
    
    if (currentUser.profileImage) {
        document.getElementById('profilePreview').innerHTML = `<img src="${currentUser.profileImage}" alt="Profile">`;
    }
}

// Initialize Socket Listeners
function initializeSocketListeners() {
    // Settings updated
    socket.on('settings-updated', (settings) => {
        document.getElementById('todayTopic').textContent = settings.todayTopic;
        document.getElementById('rulesContent').textContent = settings.rules;
    });
    
    // Faculty message
    socket.on('faculty-message', (message) => {
        if (currentFaculty === currentUser.faculty) {
            appendFacultyMessage(message);
        }
    });
    
    // Faculty messages history
    socket.on('faculty-messages-history', (messages) => {
        displayFacultyMessages(messages);
    });
    
    // Private message
    socket.on('private-message', (message) => {
        if (currentPrivateChat) {
            const otherUserId = currentPrivateChat.id;
            if (message.senderId === otherUserId || message.recipientId === otherUserId) {
                appendPrivateMessage(message);
            }
        }
    });
    
    // Private messages history
    socket.on('private-messages-history', (messages) => {
        displayPrivateMessages(messages);
    });
    
    // User deactivated
    socket.on('user-deactivated', (data) => {
        if (data.userId === currentUser.id) {
            alert('Hesabınız deaktiv edildi');
            logout();
        }
    });
}

// Get Baku Time (UTC+4)
function getBakuTime() {
    const now = new Date();
    // Get UTC time
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    // Add 4 hours for Baku (UTC+4)
    const bakuTime = new Date(utc + (3600000 * 4));
    return bakuTime;
}

// Format time for display (HH:MM format with Baku time)
function formatTime(timestamp) {
    const date = new Date(timestamp);
    // Convert to Baku time
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const bakuTime = new Date(utc + (3600000 * 4));
    
    const hours = bakuTime.getHours().toString().padStart(2, '0');
    const minutes = bakuTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Show Rules
function showRules() {
    hideAllSections();
    document.getElementById('rulesSection').style.display = 'block';
    setActiveMenu(0);
}

// Show Faculties
async function showFaculties() {
    hideAllSections();
    document.getElementById('facultiesSection').style.display = 'block';
    setActiveMenu(1);
    
    try {
        const response = await fetch('/api/faculties');
        const faculties = await response.json();
        
        const container = document.getElementById('facultiesList');
        container.innerHTML = '';
        
        faculties.forEach(faculty => {
            const card = document.createElement('div');
            card.className = 'faculty-card';
            card.innerHTML = `
                <h3>${faculty}</h3>
                <p>Chat otağına daxil ol</p>
            `;
            card.onclick = () => openFacultyChat(faculty);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading faculties:', error);
    }
}

// Open Faculty Chat
function openFacultyChat(faculty) {
    hideAllSections();
    document.getElementById('chatSection').style.display = 'flex';
    document.getElementById('chatTitle').textContent = faculty;
    currentFaculty = faculty;
    
    // Load messages
    socket.emit('get-faculty-messages', faculty);
}

// Back to Faculties
function backToFaculties() {
    currentFaculty = null;
    document.getElementById('chatMessages').innerHTML = '';
    showFaculties();
}

// Display Faculty Messages
function displayFacultyMessages(messages) {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    
    messages.forEach(message => {
        appendFacultyMessage(message, false);
    });
    
    // Scroll to bottom
    scrollToBottom(container);
}

// Append Faculty Message
function appendFacultyMessage(message, shouldScroll = true) {
    const container = document.getElementById('chatMessages');
    const isAtBottom = isScrolledToBottom(container);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.dataset.userId = message.userId;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    if (message.userImage) {
        avatarDiv.innerHTML = `<img src="${message.userImage}" alt="${message.userName}">`;
    } else {
        avatarDiv.textContent = message.userName.charAt(0).toUpperCase();
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    
    const authorSpan = document.createElement('span');
    authorSpan.className = 'message-author';
    authorSpan.textContent = message.userName;
    
    const infoSpan = document.createElement('span');
    infoSpan.className = 'message-info';
    infoSpan.textContent = `${message.degree} • ${message.course}-ci kurs`;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(message.timestamp);
    
    headerDiv.appendChild(authorSpan);
    headerDiv.appendChild(infoSpan);
    headerDiv.appendChild(timeSpan);
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = message.text;
    
    bubbleDiv.appendChild(textDiv);
    
    // Add context menu button (if not own message)
    if (message.userId !== currentUser.id) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        const menuBtn = document.createElement('button');
        menuBtn.className = 'message-menu-btn';
        menuBtn.innerHTML = '⋮';
        menuBtn.onclick = (e) => showContextMenu(e, message.userId);
        
        actionsDiv.appendChild(menuBtn);
        bubbleDiv.appendChild(actionsDiv);
    }
    
    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(bubbleDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    container.appendChild(messageDiv);
    
    // Auto-scroll if user was at bottom or if it's a new message from current user
    if (shouldScroll && (isAtBottom || message.userId === currentUser.id)) {
        scrollToBottom(container);
    }
}

// Send Message
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    socket.emit('faculty-message', { text });
    input.value = '';
}

// Enter key to send message
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Show Private Chats
function showPrivateChats() {
    hideAllSections();
    document.getElementById('privateChatsSection').style.display = 'block';
    setActiveMenu(2);
    
    // This would be populated with actual private conversations
    // For now, it's just a placeholder
    document.getElementById('privateChatsList').innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Şəxsi mesaj yoxdur</p>';
}

// Back to Private Chats
function backToPrivateChats() {
    currentPrivateChat = null;
    document.getElementById('privateChatMessages').innerHTML = '';
    showPrivateChats();
}

// Display Private Messages
function displayPrivateMessages(messages) {
    const container = document.getElementById('privateChatMessages');
    container.innerHTML = '';
    
    messages.forEach(message => {
        appendPrivateMessage(message, false);
    });
    
    // Scroll to bottom
    scrollToBottom(container);
}

// Append Private Message
function appendPrivateMessage(message, shouldScroll = true) {
    const container = document.getElementById('privateChatMessages');
    const isAtBottom = isScrolledToBottom(container);
    
    const isSent = message.senderId === currentUser.id;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message' + (isSent ? ' sent' : '');
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    
    if (isSent) {
        if (currentUser.profileImage) {
            avatarDiv.innerHTML = `<img src="${currentUser.profileImage}" alt="${currentUser.fullName}">`;
        } else {
            avatarDiv.textContent = currentUser.fullName.charAt(0).toUpperCase();
        }
    } else {
        if (message.senderImage) {
            avatarDiv.innerHTML = `<img src="${message.senderImage}" alt="${message.senderName}">`;
        } else {
            avatarDiv.textContent = message.senderName.charAt(0).toUpperCase();
        }
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(message.timestamp);
    
    headerDiv.appendChild(timeSpan);
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = message.text;
    
    bubbleDiv.appendChild(textDiv);
    
    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(bubbleDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    container.appendChild(messageDiv);
    
    // Auto-scroll if user was at bottom or if it's a new message from current user
    if (shouldScroll && (isAtBottom || isSent)) {
        scrollToBottom(container);
    }
}

// Send Private Message
function sendPrivateMessage() {
    const input = document.getElementById('privateMessageInput');
    const text = input.value.trim();
    
    if (!text || !currentPrivateChat) return;
    
    socket.emit('private-message', {
        recipientId: currentPrivateChat.id,
        text
    });
    
    input.value = '';
}

// Enter key to send private message
document.getElementById('privateMessageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendPrivateMessage();
    }
});

// Context Menu
let contextMenuUserId = null;

function showContextMenu(event, userId) {
    event.stopPropagation();
    
    const menu = document.getElementById('contextMenu');
    menu.classList.add('show');
    
    // Position menu
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    
    contextMenuUserId = userId;
}

// Hide context menu on click outside
document.addEventListener('click', () => {
    document.getElementById('contextMenu').classList.remove('show');
});

// Start Private Chat from Context Menu
function startPrivateChat() {
    // Find the user from messages
    const messageElement = document.querySelector(`[data-user-id="${contextMenuUserId}"]`);
    if (!messageElement) return;
    
    const authorElement = messageElement.querySelector('.message-author');
    const userName = authorElement.textContent;
    
    const infoElement = messageElement.querySelector('.message-info');
    const userInfo = infoElement.textContent;
    
    const avatarElement = messageElement.querySelector('.message-avatar');
    const userImage = avatarElement.querySelector('img')?.src || null;
    const userInitial = avatarElement.textContent;
    
    // Set current private chat
    currentPrivateChat = {
        id: contextMenuUserId,
        name: userName,
        info: userInfo,
        image: userImage,
        initial: userInitial
    };
    
    // Open private chat
    hideAllSections();
    document.getElementById('privateChatSection').style.display = 'flex';
    
    document.getElementById('privateChatName').textContent = userName;
    document.getElementById('privateChatInfo').textContent = userInfo;
    
    if (userImage) {
        document.getElementById('privateChatAvatar').innerHTML = `<img src="${userImage}" alt="${userName}">`;
    } else {
        document.getElementById('privateChatAvatar').innerHTML = `<span id="privateChatInitial">${userInitial}</span>`;
    }
    
    // Load messages
    socket.emit('get-private-messages', contextMenuUserId);
}

// Block User
function blockUser() {
    if (confirm('Bu istifadəçini əngəlləmək istədiyinizdən əminsiniz?')) {
        socket.emit('block-user', contextMenuUserId);
        blockedUsers.add(contextMenuUserId);
        
        // Remove all messages from this user
        document.querySelectorAll(`[data-user-id="${contextMenuUserId}"]`).forEach(el => {
            el.remove();
        });
        
        alert('İstifadəçi əngəlləndi');
    }
}

// Report User
function reportUser() {
    if (confirm('Bu istifadəçini şikayət etmək istədiyinizdən əminsiniz?')) {
        socket.emit('report-user', contextMenuUserId);
        alert('İstifadəçi şikayət edildi');
    }
}

// Profile Settings Modal
function showProfileSettings() {
    document.getElementById('profileModal').classList.add('show');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('show');
}

// Upload Profile Image
async function uploadProfileImage() {
    const input = document.getElementById('profileImageInput');
    const file = input.files[0];
    
    if (!file) return;
    
    const formData = new FormData();
    formData.append('profileImage', file);
    
    try {
        const response = await fetch('/api/user/profile-image', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser.profileImage = data.profileImage;
            updateUserProfile();
            alert('Profil şəkli yeniləndi');
        } else {
            alert(data.error || 'Xəta baş verdi');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Server xətası');
    }
}

// Logout
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/';
    }
}

// Helper Functions
function hideAllSections() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
}

function setActiveMenu(index) {
    document.querySelectorAll('.menu-item').forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Auto-scroll helper functions
function isScrolledToBottom(element) {
    // Check if user is within 100px of the bottom
    return element.scrollHeight - element.clientHeight - element.scrollTop < 100;
}

function scrollToBottom(element) {
    // Smooth scroll to bottom
    element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
    });
}
