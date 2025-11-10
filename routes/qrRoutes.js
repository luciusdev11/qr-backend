const express = require('express');
const router = express.Router();
const QRCode = require('../models/QRCode');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { authenticateUser } = require('../middleware/auth');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

// Generate unique short ID
const generateShortId = () => {
  return crypto.randomBytes(6).toString('hex');
};

// Cache middleware
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = `__express__${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse && Date.now() < cachedResponse.expiry) {
      return res.json(cachedResponse.data);
    }

    res.originalJson = res.json;
    res.json = (data) => {
      cache.set(key, {
        data,
        expiry: Date.now() + duration
      });
      res.originalJson(data);
    };
    next();
  };
};

// Clear cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now > value.expiry) {
      cache.delete(key);
    }
  }
}, CACHE_TTL);

// @route   POST /api/qr/generate
// @desc    Generate a new QR code with customization
// @access  Public
router.post('/generate', async (req, res) => {
  try {
    const { 
      originalUrl, 
      createdBy,
      customization = {},
      logo = null
    } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: 'Original URL is required' });
    }

    // Validate URL format
    try {
      new URL(originalUrl);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format. Please include http:// or https://' });
    }

    const shortId = generateShortId();
    const trackingUrl = `${process.env.BASE_URL}/track/${shortId}`;

    // Prepare customization options
    const qrOptions = {
      dotStyle: customization.dotStyle || 'square',
      cornerSquareStyle: customization.cornerSquareStyle || 'square',
      cornerDotStyle: customization.cornerDotStyle || 'square',
      backgroundColor: customization.backgroundColor || '#FFFFFF',
      foregroundColor: customization.foregroundColor || '#000000',
      gradientType: customization.gradientType || 'none',
      gradientStartColor: customization.gradientStartColor || customization.foregroundColor || '#000000',
      gradientEndColor: customization.gradientEndColor || customization.foregroundColor || '#000000',
      logo: logo,
      logoSize: customization.logoSize || 0.2,
      size: 800
    };

    // Generate QR code with customization
    let qrCodeImage;
    if (logo || customization.gradientType !== 'none' || customization.dotStyle !== 'square') {
      const { generateCustomQR } = require('../utils/qrGenerator');
      qrCodeImage = await generateCustomQR(trackingUrl, qrOptions);
    } else {
      // Use simple generation for basic QR codes
      qrCodeImage = await qrcode.toDataURL(trackingUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: qrOptions.foregroundColor,
          light: qrOptions.backgroundColor
        },
        errorCorrectionLevel: 'H'
      });
    }

    const newQR = new QRCode({
      shortId,
      originalUrl,
      trackingUrl,
      qrCodeImage,
      customization: {
        dotStyle: qrOptions.dotStyle,
        cornerSquareStyle: qrOptions.cornerSquareStyle,
        cornerDotStyle: qrOptions.cornerDotStyle,
        backgroundColor: qrOptions.backgroundColor,
        foregroundColor: qrOptions.foregroundColor,
        gradientType: qrOptions.gradientType,
        gradientStartColor: qrOptions.gradientStartColor,
        gradientEndColor: qrOptions.gradientEndColor,
        hasLogo: !!logo,
        logoSize: qrOptions.logoSize
      },
      createdBy: createdBy || 'anonymous'
    });

    await newQR.save();

    // Clear list cache
    cache.clear();

    res.status(201).json({
      success: true,
      data: newQR
    });

  } catch (error) {
    console.error('Generate QR Error:', error);
    res.status(500).json({ 
      error: 'Server error generating QR code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/qr/list
// @desc    Get all QR codes
// @access  Public
router.get('/list', cacheMiddleware(30000), async (req, res) => {
  try {
    const { limit = 100, page = 1, sortBy = 'createdAt', order = 'desc' } = req.query;

    const limitNum = Math.min(parseInt(limit), 100); // Max 100 items
    const pageNum = parseInt(page);

    const qrCodes = await QRCode.find({ isActive: true })
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .select('-scanHistory') // Don't send full scan history in list
      .lean(); // Faster queries

    const total = await QRCode.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: qrCodes,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('List QR Error:', error);
    res.status(500).json({ error: 'Server error fetching QR codes' });
  }
});

// @route   GET /api/qr/:id
// @desc    Get single QR code with full details
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const qrCode = await QRCode.findOne({ 
      shortId: req.params.id,
      isActive: true 
    }).lean();

    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    res.json({
      success: true,
      data: qrCode
    });

  } catch (error) {
    console.error('Get QR Error:', error);
    res.status(500).json({ error: 'Server error fetching QR code' });
  }
});

// @route   DELETE /api/qr/:id
// @desc    Delete (deactivate) a QR code
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const qrCode = await QRCode.findOne({ shortId: req.params.id });

    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    qrCode.isActive = false;
    await qrCode.save();

    // Clear cache
    cache.clear();

    res.json({
      success: true,
      message: 'QR code deleted successfully'
    });

  } catch (error) {
    console.error('Delete QR Error:', error);
    res.status(500).json({ error: 'Server error deleting QR code' });
  }
});

// @route   GET /api/qr/stats/:id
// @desc    Get QR code statistics
// @access  Public
router.get('/stats/:id', async (req, res) => {
  try {
    const qrCode = await QRCode.findOne({ 
      shortId: req.params.id,
      isActive: true 
    }).lean();

    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Calculate statistics
    const stats = {
      totalScans: qrCode.scans,
      recentScans: qrCode.scanHistory.slice(-10).reverse(),
      scansByDay: {},
      createdAt: qrCode.createdAt,
      lastScan: qrCode.scanHistory.length > 0 
        ? qrCode.scanHistory[qrCode.scanHistory.length - 1].timestamp 
        : null
    };

    // Group scans by day
    qrCode.scanHistory.forEach(scan => {
      const day = new Date(scan.timestamp).toISOString().split('T')[0];
      stats.scansByDay[day] = (stats.scansByDay[day] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Server error fetching statistics' });
  }
});

module.exports = router;