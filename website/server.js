require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const { Sequelize } = require('sequelize');
const path = require('path');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 8000;

// Database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'db.sqlite'),
  logging: false
});

// Initialize models
User(sequelize);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 15 * 60 * 1000, // 15 minutes
    httpOnly: true
  }
}));
app.use(flash());

// Template engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Sync database
sequelize.sync({ force: true }).then(() => {
  console.log('Database & tables created!');
  
  // Create test user
  User(sequelize).create({
    username: 'admin',
    email: 'admin@example.com',
    password: 'password123'
  });
});

// Authentication middleware
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    req.flash('error', 'Please login to view this page');
    return res.redirect('/login.html');
  }
  next();
};

// Routes
app.get('/', (req, res) => res.redirect('/login.html'));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User(sequelize).findOne({ where: { username } });
    
    if (user && user.validPassword(password)) {
      req.session.userId = user.id;
      return res.redirect('/index.html');
    }
    
    req.flash('error', 'Invalid username or password');
    res.redirect('/login.html');
  } catch (err) {
    req.flash('error', 'Login failed');
    res.redirect('/login.html');
  }
});

app.post('/register', async (req, res) => {
  try {
    await User(sequelize).create(req.body);
    req.flash('success', 'Registration successful! Please login');
    res.redirect('/login.html');
  } catch (err) {
    req.flash('error', 'Registration failed: ' + err.errors[0].message);
    res.redirect('/register.html');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

// Protected route
app.get('/index.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve login and register pages
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});