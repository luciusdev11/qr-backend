const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  userAgent: String,
  ip: String,
  location: {
    country: String,
    city: String
  }
});

const qrCodeSchema = new mongoose.Schema({
  shortId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  originalUrl: {
    type: String,
    required: true
  },
  trackingUrl: {
    type: String,
    required: true
  },
  qrCodeImage: {
    type: String // Base64 encoded QR code image
  },
  customization: {
    dotStyle: {
      type: String,
      enum: ['square', 'rounded', 'dots', 'classy', 'classy-rounded'],
      default: 'square'
    },
    cornerSquareStyle: {
      type: String,
      enum: ['square', 'rounded', 'extra-rounded', 'dot'],
      default: 'square'
    },
    cornerDotStyle: {
      type: String,
      enum: ['square', 'dot'],
      default: 'square'
    },
    backgroundColor: {
      type: String,
      default: '#FFFFFF'
    },
    foregroundColor: {
      type: String,
      default: '#000000'
    },
    gradientType: {
      type: String,
      enum: ['none', 'linear', 'radial'],
      default: 'none'
    },
    gradientStartColor: String,
    gradientEndColor: String,
    hasLogo: {
      type: Boolean,
      default: false
    },
    logoSize: {
      type: Number,
      default: 0.2,
      min: 0.1,
      max: 0.4
    }
  },
  scans: {
    type: Number,
    default: 0
  },
  scanHistory: [scanSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    default: 'anonymous'
  }
}, {
  timestamps: true
});

// Index for faster queries
qrCodeSchema.index({ createdAt: -1 });
qrCodeSchema.index({ scans: -1 });

// Method to increment scan count
qrCodeSchema.methods.recordScan = async function(scanData) {
  this.scans += 1;
  this.scanHistory.push(scanData);
  await this.save();
  return this;
};

module.exports = mongoose.model('QRCode', qrCodeSchema);