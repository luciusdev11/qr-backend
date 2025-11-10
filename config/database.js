const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return;
  }

  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    isConnected = true;
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });

  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    isConnected = false;
    
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;