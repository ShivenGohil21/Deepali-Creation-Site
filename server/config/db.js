const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connString = process.env.MONGODB_URI || process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/deepali_shop';
    console.log(`Connecting to MongoDB...`);
    const conn = await mongoose.connect(connString, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.warn(`Attempting to connect to local fallback: ${process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/deepali_shop'}`);
    
    try {
      const conn = await mongoose.connect(process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/deepali_shop', {
        serverSelectionTimeoutMS: 5000
      });
      console.log(`MongoDB Connected (Local Fallback): ${conn.connection.host}`);
    } catch (localError) {
      console.error(`Local MongoDB connection also failed: ${localError.message}`);
      console.error(`
============================================================
WARNING: Could not connect to MongoDB Atlas or Local MongoDB.
The server will run, but database actions will fail.
Please configure MONGODB_URI in server/.env with a valid MongoDB Atlas connection string,
or start your local MongoDB service (mongod).
============================================================
      `);
      // We do not crash the process so the user can see the server start up and check the UI
    }
  }
};

module.exports = connectDB;
