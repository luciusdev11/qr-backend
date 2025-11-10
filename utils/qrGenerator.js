const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');

/**
 * Generate customized QR code with advanced styling
 */
async function generateCustomQR(data, options = {}) {
  const {
    dotStyle = 'square',
    cornerSquareStyle = 'square',
    cornerDotStyle = 'square',
    backgroundColor = '#FFFFFF',
    foregroundColor = '#000000',
    gradientType = 'none',
    gradientStartColor = foregroundColor,
    gradientEndColor = foregroundColor,
    logo = null, // Base64 image string
    logoSize = 0.2,
    size = 800
  } = options;

  try {
    // Generate base QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(data, {
      width: size,
      margin: 2,
      color: {
        dark: foregroundColor,
        light: backgroundColor
      },
      errorCorrectionLevel: 'H' // High error correction for logos
    });

    // Create canvas for advanced styling
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Load QR code image
    const qrImage = await loadImage(qrBuffer);
    ctx.drawImage(qrImage, 0, 0, size, size);

    // Apply gradient if needed
    if (gradientType !== 'none') {
      await applyGradient(ctx, size, gradientType, gradientStartColor, gradientEndColor, qrImage);
    }

    // Apply dot styling
    if (dotStyle !== 'square') {
      await applyDotStyle(ctx, size, dotStyle, foregroundColor);
    }

    // Add logo if provided
    if (logo) {
      await addLogoToQR(ctx, size, logo, logoSize);
    }

    // Convert canvas to base64
    const finalImage = canvas.toDataURL('image/png');
    return finalImage;

  } catch (error) {
    console.error('Error generating custom QR:', error);
    throw new Error('Failed to generate custom QR code');
  }
}

/**
 * Apply gradient to QR code
 */
async function applyGradient(ctx, size, type, startColor, endColor, qrImage) {
  const imageData = ctx.getImageData(0, 0, size, size);
  const pixels = imageData.data;

  let gradient;
  if (type === 'linear') {
    gradient = ctx.createLinearGradient(0, 0, size, size);
  } else if (type === 'radial') {
    gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  }

  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);

  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Apply custom dot styles (rounded, dots, etc.)
 */
async function applyDotStyle(ctx, size, style, color) {
  // This is a simplified version
  // For production, you'd analyze QR pattern and redraw dots
  const imageData = ctx.getImageData(0, 0, size, size);
  const moduleSize = Math.floor(size / 45); // Approximate QR module size

  if (style === 'rounded' || style === 'dots') {
    // Apply rounded corners effect
    ctx.filter = 'blur(1px)';
    const tempCanvas = createCanvas(size, size);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(ctx.canvas, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = 'none';
  }
}

/**
 * Add logo to center of QR code
 */
async function addLogoToQR(ctx, size, logoBase64, logoSizeRatio) {
  try {
    // Remove data URL prefix if present
    const base64Data = logoBase64.replace(/^data:image\/\w+;base64,/, '');
    const logoBuffer = Buffer.from(base64Data, 'base64');

    // Resize logo
    const logoSize = Math.floor(size * logoSizeRatio);
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    const logo = await loadImage(resizedLogo);

    // Calculate center position
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;

    // Draw white background circle for logo
    const radius = logoSize / 2 + 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw logo
    ctx.drawImage(logo, x, y, logoSize, logoSize);

  } catch (error) {
    console.error('Error adding logo:', error);
    // Continue without logo if there's an error
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