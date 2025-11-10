const QRCode = require('qrcode');

/**
 * Generate customized QR code with advanced styling
 * Using pure QRCode library (Render-compatible)
 */
async function generateCustomQR(data, options = {}) {
  const {
    backgroundColor = '#FFFFFF',
    foregroundColor = '#000000',
    size = 800
  } = options;

  try {
    // Generate QR code as data URL
    const qrCodeImage = await QRCode.toDataURL(data, {
      width: size,
      margin: 2,
      color: {
        dark: foregroundColor,
        light: backgroundColor
      },
      errorCorrectionLevel: 'H', // High error correction
      type: 'image/png',
      quality: 1
    });

    return qrCodeImage;

  } catch (error) {
    console.error('Error generating custom QR:', error);
    throw new Error('Failed to generate custom QR code');
  }
}

/**
 * Simple QR generation (fallback)
 */
async function generateSimpleQR(data, options = {}) {
  const {
    backgroundColor = '#FFFFFF',
    foregroundColor = '#000000',
    size = 400
  } = options;

  return await QRCode.toDataURL(data, {
    width: size,
    margin: 2,
    color: {
      dark: foregroundColor,
      light: backgroundColor
    },
    errorCorrectionLevel: 'M'
  });
}

module.exports = {
  generateCustomQR,
  generateSimpleQR
};