const express = require('express');
const router = express.Router();
const { loginUser, logoutUser, checkAuth } = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginUser);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', logoutUser);

// @route   GET /api/auth/check
// @desc    Check if user is authenticated
// @access  Public
router.get('/check', checkAuth);

module.exports = router;