const bcrypt = require('bcryptjs');

// Simple authentication for personal use
// Username and password stored in environment variables

const authenticateUser = async (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  
  return res.status(401).json({ 
    error: 'Authentication required',
    message: 'Please login to access this resource'
  });
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check credentials against environment variables
    const validUsername = process.env.ADMIN_USERNAME || 'admin';
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (username !== validUsername) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, validPasswordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.isAuthenticated = true;
    req.session.username = username;

    res.json({
      success: true,
      message: 'Login successful',
      user: { username }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
};

const checkAuth = (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.json({
      isAuthenticated: true,
      user: { username: req.session.username }
    });
  }
  
  res.json({ isAuthenticated: false });
};

module.exports = {
  authenticateUser,
  loginUser,
  logoutUser,
  checkAuth
};