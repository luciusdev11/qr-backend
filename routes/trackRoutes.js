const express = require('express');
const router = express.Router();
const QRCode = require('../models/QRCode');

// @route   GET /track/:shortId
// @desc    Track QR code scan and redirect to original URL
// @access  Public
router.get('/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;

    const qrCode = await QRCode.findOne({ 
      shortId,
      isActive: true 
    });

    if (!qrCode) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>QR Code Not Found</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            .icon { font-size: 80px; margin-bottom: 20px; }
            h1 { color: #e74c3c; margin-bottom: 15px; font-size: 28px; }
            p { color: #666; line-height: 1.6; font-size: 16px; }
            .code { 
              background: #f7f7f7; 
              padding: 10px; 
              border-radius: 8px; 
              margin-top: 15px;
              font-family: monospace;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>QR Code Not Found</h1>
            <p>This QR code does not exist or has been deleted.</p>
            <div class="code">ID: ${shortId}</div>
          </div>
        </body>
        </html>
      `);
    }

    // Get real IP address (handle proxies)
    const getClientIp = (req) => {
      return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
             req.headers['x-real-ip'] ||
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             'Unknown';
    };

    // Record the scan asynchronously (don't wait for it)
    const scanData = {
      timestamp: new Date(),
      userAgent: req.get('user-agent') || 'Unknown',
      ip: getClientIp(req),
      location: {
        country: req.headers['cf-ipcountry'] || 'Unknown', // Cloudflare header
        city: 'Unknown'
      }
    };

    // Record scan without blocking redirect
    qrCode.recordScan(scanData).catch(err => {
      console.error('Error recording scan:', err);
    });

    // Log for debugging
    console.log(`✅ Scan: ${shortId} → ${qrCode.originalUrl}`);

    // Redirect immediately
    res.redirect(301, qrCode.originalUrl);

  } catch (error) {
    console.error('Track Error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
          }
          .icon { font-size: 80px; margin-bottom: 20px; }
          h1 { color: #e74c3c; margin-bottom: 15px; font-size: 28px; }
          p { color: #666; line-height: 1.6; font-size: 16px; }
          .button {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⚠️</div>
          <h1>Oops! Something went wrong</h1>
          <p>We encountered an error while processing your QR code. Please try again later.</p>
          <a href="/" class="button">Go Home</a>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;