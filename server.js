const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Session configuration
const sessionMiddleware = session({
  secret: 'bsu-chat-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionMiddleware);

// Static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Yalnız şəkil faylları yükləyə bilərsiniz!'));
  }
});

// In-memory database (production üçün MongoDB və ya PostgreSQL istifadə edin)
let users = [];
let messages = {
  faculty: {}, // Fakültə chat mesajları
  private: {}  // Şəxsi mesajlar
};
let blockedUsers = {}; // {userId: [blockedUserIds]}
let reportedUsers = {}; // {reportedUserId: [reporterIds]}
let adminSettings = {
  rules: 'BSU Chat qaydalarına xoş gəlmisiniz!\n\n1. Hörmət və nəzakətlə davranın\n2. Spam göndərməyin\n3. Şəxsi məlumatları paylaşmayın\n4. Universitetlə bağlı mövzulara sadiq qalın',
  todayTopic: 'Xoş gəlmisiniz! Bu gün ilk gün.',
  filterWords: ['spam', 'reklam'],
  messageExpiry: {
    group: 24, // 24 saat
    private: 48 // 48 saat
  },
  subAdmins: []
};

// Verification questions
const verificationQuestions = [
  { question: 'Mexanika-riyaziyyat fakültəsi hansı korpusda yerləşir?', answer: '3', options: ['1', '2', '3', 'əsas'] },
  { question: 'Tətbiqi riyaziyyat və kibernetika fakültəsi hansı korpusda yerləşir?', answer: '3', options: ['1', '2', '3', 'əsas'] },
  { question: 'Fizika fakültəsi hansı korpusda yerləşir?', answer: 'əsas', options: ['1', '2', '3', 'əsas'] },
  { question: 'Kimya fakültəsi hansı korpusda yerləşir?', answer: 'əsas', options: ['1', '2', '3', 'əsas'] },
  { question: 'Biologiya fakültəsi hansı korpusda yerləşir?', answer: 'əsas', options: ['1', '2', '3', 'əsas'] },
  { question: 'Ekologiya və torpaqşünaslıq fakültəsi hansı korpusda yerləşir?', answer: 'əsas', options: ['1', '2', '3', 'əsas'] },
  { question: 'Coğrafiya fakültəsi hansı korpusda yerləşir?', answer: 'əsas', options: ['1', '2', '3', 'əsas'] },
  { question: 'Geologiya fakültəsi hansı korpusda yerləşir?', answer: 'əsas', options: ['1', '2', '3', 'əsas'] },
  { question: 'Filologiya fakültəsi hansı korpusda yerləşir?', answer: '1', options: ['1', '2', '3', 'əsas'] },
  { question: 'Tarix fakültəsi hansı korpusda yerləşir?', answer: '3', options: ['1', '2', '3', 'əsas'] },
  { question: 'Beynəlxalq münasibətlər və iqtisadiyyat fakültəsi hansı korpusda yerləşir?', answer: '1', options: ['1', '2', '3', 'əsas'] },
  { question: 'Hüquq fakültəsi hansı korpusda yerləşir?', answer: '1', options: ['1', '2', '3', 'əsas'] },
  { question: 'Jurnalistika fakültəsi hansı korpusda yerləşir?', answer: '2', options: ['1', '2', '3', 'əsas'] },
  { question: 'İnformasiya və sənəd menecmenti fakültəsi hansı korpusda yerləşir?', answer: '2', options: ['1', '2', '3', 'əsas'] },
  { question: 'Şərqşünaslıq fakültəsi hansı korpusda yerləşir?', answer: '2', options: ['1', '2', '3', 'əsas'] },
  { question: 'Sosial elmlər və psixologiya fakültəsi hansı korpusda yerləşir?', answer: '2', options: ['1', '2', '3', 'əsas'] }
];

// Faculties list
const faculties = [
  'Mexanika-riyaziyyat fakültəsi',
  'Tətbiqi riyaziyyat və kibernetika fakültəsi',
  'Fizika fakültəsi',
  'Kimya fakültəsi',
  'Biologiya fakültəsi',
  'Ekologiya və torpaqşünaslıq fakültəsi',
  'Coğrafiya fakültəsi',
  'Geologiya fakültəsi',
  'Filologiya fakültəsi',
  'Tarix fakültəsi',
  'Beynəlxalq münasibətlər və iqtisadiyyat fakültəsi',
  'Hüquq fakültəsi',
  'Jurnalistika fakültəsi',
  'İnformasiya və sənəd menecmenti fakültəsi',
  'Şərqşünaslıq fakültəsi',
  'Sosial elmlər və psixologiya fakültəsi'
];

// Initialize faculty message arrays
faculties.forEach(faculty => {
  messages.faculty[faculty] = [];
});

// Helper function - Get random verification questions
function getRandomQuestions() {
  const shuffled = [...verificationQuestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

// Helper function - Filter words
function filterMessage(text) {
  let filtered = text;
  adminSettings.filterWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  return filtered;
}

// Helper function - Clean expired messages
function cleanExpiredMessages() {
  const now = Date.now();
  
  // Clean faculty messages
  Object.keys(messages.faculty).forEach(faculty => {
    messages.faculty[faculty] = messages.faculty[faculty].filter(msg => {
      return (now - msg.timestamp) < (adminSettings.messageExpiry.group * 60 * 60 * 1000);
    });
  });
  
  // Clean private messages
  Object.keys(messages.private).forEach(conversationKey => {
    messages.private[conversationKey] = messages.private[conversationKey].filter(msg => {
      return (now - msg.timestamp) < (adminSettings.messageExpiry.private * 60 * 60 * 1000);
    });
  });
}

// Run cleanup every hour
setInterval(cleanExpiredMessages, 60 * 60 * 1000);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API - Get verification questions
app.get('/api/verification-questions', (req, res) => {
  const questions = getRandomQuestions();
  res.json(questions);
});

// API - Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, phone, password, fullName, faculty, degree, course, verificationAnswers } = req.body;
    
    // Validate email format
    if (!email.endsWith('@bsu.edu.az')) {
      return res.status(400).json({ error: 'Email @bsu.edu.az ilə bitməlidir' });
    }
    
    // Validate phone format
    if (!phone.startsWith('+994') || phone.length !== 13) {
      return res.status(400).json({ error: 'Telefon nömrəsi +994 ilə başlamalı və 9 rəqəm olmalıdır' });
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email || u.phone === phone);
    if (existingUser) {
      if (!existingUser.active) {
        return res.status(403).json({ error: 'Bu hesab deaktiv edilib' });
      }
      return res.status(400).json({ error: 'Bu email və ya telefon artıq qeydiyyatdan keçib' });
    }
    
    // Verify answers (minimum 2 out of 3 correct)
    let correctAnswers = 0;
    verificationAnswers.forEach((answer, index) => {
      const question = verificationQuestions.find(q => q.question === answer.question);
      if (question && question.answer === answer.answer) {
        correctAnswers++;
      }
    });
    
    if (correctAnswers < 2) {
      return res.status(400).json({ error: 'Doğrulama uğursuz. Minimum 2 sual düzgün cavablandırılmalıdır.' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = {
      id: Date.now().toString(),
      email,
      phone,
      password: hashedPassword,
      fullName,
      faculty,
      degree,
      course,
      profileImage: null,
      active: true,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    blockedUsers[newUser.id] = [];
    
    res.json({ success: true, message: 'Qeydiyyat uğurla tamamlandı' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// API - Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Email və ya şifrə yanlışdır' });
    }
    
    if (!user.active) {
      return res.status(403).json({ error: 'Hesabınız deaktiv edilib' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Email və ya şifrə yanlışdır' });
    }
    
    req.session.userId = user.id;
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// API - Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Super admin
    if (username === 'ursamajor' && password === 'ursa618') {
      req.session.adminId = 'super-admin';
      req.session.isSuperAdmin = true;
      return res.json({ success: true, isSuperAdmin: true });
    }
    
    // Sub admin
    const subAdmin = adminSettings.subAdmins.find(a => a.username === username && a.password === password);
    if (subAdmin) {
      req.session.adminId = subAdmin.id;
      req.session.isSuperAdmin = false;
      return res.json({ success: true, isSuperAdmin: false });
    }
    
    res.status(400).json({ error: 'İstifadəçi adı və ya şifrə yanlışdır' });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// API - Get current user
app.get('/api/user', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Daxil olmamısınız' });
  }
  
  const user = users.find(u => u.id === req.session.userId);
  if (!user) {
    return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
  }
  
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// API - Get admin settings
app.get('/api/admin/settings', (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Admin daxil olmayıb' });
  }
  
  res.json({
    rules: adminSettings.rules,
    todayTopic: adminSettings.todayTopic,
    filterWords: adminSettings.filterWords,
    messageExpiry: adminSettings.messageExpiry,
    isSuperAdmin: req.session.isSuperAdmin
  });
});

// API - Update admin settings
app.post('/api/admin/settings', (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Admin daxil olmayıb' });
  }
  
  const { rules, todayTopic, filterWords, messageExpiry } = req.body;
  
  if (rules !== undefined) adminSettings.rules = rules;
  if (todayTopic !== undefined) adminSettings.todayTopic = todayTopic;
  if (filterWords !== undefined) adminSettings.filterWords = filterWords;
  if (messageExpiry !== undefined) adminSettings.messageExpiry = messageExpiry;
  
  // Broadcast settings update to all clients
  io.emit('settings-updated', {
    rules: adminSettings.rules,
    todayTopic: adminSettings.todayTopic
  });
  
  res.json({ success: true });
});

// API - Get all users (admin only)
app.get('/api/admin/users', (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Admin daxil olmayıb' });
  }
  
  const usersWithoutPasswords = users.map(u => {
    const { password, ...userWithoutPassword } = u;
    return userWithoutPassword;
  });
  
  res.json(usersWithoutPasswords);
});

// API - Toggle user active status
app.post('/api/admin/users/:userId/toggle', (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Admin daxil olmayıb' });
  }
  
  const user = users.find(u => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
  }
  
  user.active = !user.active;
  
  // If deactivated, disconnect the user
  if (!user.active) {
    io.emit('user-deactivated', { userId: user.id });
  }
  
  res.json({ success: true, active: user.active });
});

// API - Get reported users
app.get('/api/admin/reported-users', (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Admin daxil olmayıb' });
  }
  
  const reported = [];
  Object.keys(reportedUsers).forEach(userId => {
    if (reportedUsers[userId].length >= 16) {
      const user = users.find(u => u.id === userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        reported.push({
          ...userWithoutPassword,
          reportCount: reportedUsers[userId].length
        });
      }
    }
  });
  
  res.json(reported);
});

// API - Get sub admins (super admin only)
app.get('/api/admin/sub-admins', (req, res) => {
  if (!req.session.isSuperAdmin) {
    return res.status(403).json({ error: 'Yalnız super admin' });
  }
  
  res.json(adminSettings.subAdmins);
});

// API - Create sub admin (super admin only)
app.post('/api/admin/sub-admins', (req, res) => {
  if (!req.session.isSuperAdmin) {
    return res.status(403).json({ error: 'Yalnız super admin' });
  }
  
  const { username, password } = req.body;
  
  const existing = adminSettings.subAdmins.find(a => a.username === username);
  if (existing) {
    return res.status(400).json({ error: 'Bu istifadəçi adı artıq mövcuddur' });
  }
  
  const newAdmin = {
    id: Date.now().toString(),
    username,
    password,
    createdAt: new Date().toISOString()
  };
  
  adminSettings.subAdmins.push(newAdmin);
  res.json({ success: true, admin: newAdmin });
});

// API - Delete sub admin (super admin only)
app.delete('/api/admin/sub-admins/:adminId', (req, res) => {
  if (!req.session.isSuperAdmin) {
    return res.status(403).json({ error: 'Yalnız super admin' });
  }
  
  adminSettings.subAdmins = adminSettings.subAdmins.filter(a => a.id !== req.params.adminId);
  res.json({ success: true });
});

// API - Upload profile image
app.post('/api/user/profile-image', upload.single('profileImage'), (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Daxil olmamısınız' });
  }
  
  const user = users.find(u => u.id === req.session.userId);
  if (!user) {
    return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'Fayl yüklənmədi' });
  }
  
  // Delete old profile image if exists
  if (user.profileImage) {
    const oldPath = path.join(__dirname, user.profileImage);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }
  
  user.profileImage = '/uploads/' + req.file.filename;
  
  res.json({ success: true, profileImage: user.profileImage });
});

// API - Get faculties
app.get('/api/faculties', (req, res) => {
  res.json(faculties);
});

// API - Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Socket.IO with session support
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) {
      console.log('User not found:', userId);
      return;
    }
    
    socket.userId = userId;
    socket.join(`user-${userId}`);
    
    // Join faculty room
    socket.join(`faculty-${user.faculty}`);
    
    console.log(`User ${user.fullName} joined room: faculty-${user.faculty}`);
    
    // Send current settings
    socket.emit('settings-updated', {
      rules: adminSettings.rules,
      todayTopic: adminSettings.todayTopic
    });
  });
  
  // Faculty chat message
  socket.on('faculty-message', (data) => {
    console.log('Faculty message received:', data, 'from userId:', socket.userId);
    
    const user = users.find(u => u.id === socket.userId);
    if (!user) {
      console.log('User not found for message');
      return;
    }
    if (!user.active) {
      console.log('User not active');
      return;
    }
    
    const message = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.fullName,
      userImage: user.profileImage,
      faculty: user.faculty,
      degree: user.degree,
      course: user.course,
      text: filterMessage(data.text),
      timestamp: Date.now()
    };
    
    messages.faculty[user.faculty].push(message);
    
    console.log('Message saved, broadcasting to faculty:', user.faculty);
    
    // Send to all users in faculty except blocked ones
    const facultyUsers = users.filter(u => u.faculty === user.faculty);
    facultyUsers.forEach(u => {
      if (!blockedUsers[u.id] || !blockedUsers[u.id].includes(user.id)) {
        io.to(`user-${u.id}`).emit('faculty-message', message);
      }
    });
    
    console.log('Message broadcasted to', facultyUsers.length, 'users');
  });
  
  // Private message
  socket.on('private-message', (data) => {
    const sender = users.find(u => u.id === socket.userId);
    const recipient = users.find(u => u.id === data.recipientId);
    
    if (!sender || !recipient || !sender.active || !recipient.active) return;
    
    // Check if blocked
    if (blockedUsers[data.recipientId] && blockedUsers[data.recipientId].includes(sender.id)) {
      return;
    }
    
    const message = {
      id: Date.now().toString(),
      senderId: sender.id,
      recipientId: recipient.id,
      senderName: sender.fullName,
      senderImage: sender.profileImage,
      text: filterMessage(data.text),
      timestamp: Date.now()
    };
    
    // Store message
    const conversationKey = [sender.id, recipient.id].sort().join('-');
    if (!messages.private[conversationKey]) {
      messages.private[conversationKey] = [];
    }
    messages.private[conversationKey].push(message);
    
    // Send to both users
    io.to(`user-${sender.id}`).emit('private-message', message);
    io.to(`user-${recipient.id}`).emit('private-message', message);
  });
  
  // Get faculty messages
  socket.on('get-faculty-messages', (faculty) => {
    const user = users.find(u => u.id === socket.userId);
    if (!user) return;
    
    const facultyMessages = messages.faculty[faculty] || [];
    const filteredMessages = facultyMessages.filter(msg => {
      return !blockedUsers[user.id] || !blockedUsers[user.id].includes(msg.userId);
    });
    
    socket.emit('faculty-messages-history', filteredMessages);
  });
  
  // Get private messages
  socket.on('get-private-messages', (otherUserId) => {
    const user = users.find(u => u.id === socket.userId);
    if (!user) return;
    
    const conversationKey = [socket.userId, otherUserId].sort().join('-');
    const privateMessages = messages.private[conversationKey] || [];
    
    socket.emit('private-messages-history', privateMessages);
  });
  
  // Block user
  socket.on('block-user', (blockedUserId) => {
    if (!blockedUsers[socket.userId]) {
      blockedUsers[socket.userId] = [];
    }
    
    if (!blockedUsers[socket.userId].includes(blockedUserId)) {
      blockedUsers[socket.userId].push(blockedUserId);
    }
    
    socket.emit('user-blocked', { userId: blockedUserId });
  });
  
  // Report user
  socket.on('report-user', (reportedUserId) => {
    if (!reportedUsers[reportedUserId]) {
      reportedUsers[reportedUserId] = [];
    }
    
    if (!reportedUsers[reportedUserId].includes(socket.userId)) {
      reportedUsers[reportedUserId].push(socket.userId);
    }
    
    socket.emit('user-reported', { userId: reportedUserId });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`BSU Chat server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
