const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB().then(async () => {
  try {
    const mongoose = require('mongoose');
    // Drop the unique code index if it exists, to allow duplicate codes
    await mongoose.connection.collections['products'].dropIndex('code_1');
    console.log('Successfully dropped unique code index from products collection.');
  } catch (err) {
    // Index might not exist, which is fine
  }
  const reconcileStocks = require('./utils/stockReconciler');
  reconcileStocks();
});

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Map Routers
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/brands', require('./routes/brandRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/warehouses', require('./routes/warehouseRoutes'));
app.use('/api/pos', require('./routes/posRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/auditlogs', require('./routes/auditLogRoutes'));
app.use('/api/adjustments', require('./routes/adjustmentRoutes'));

// Serve Static Frontend Assets (Production configuration)
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// Fallback to React Router Index
app.get('*', (req, res) => {
  const indexFile = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      // In development or if build is missing, return a simple JSON response
      res.status(200).json({
        message: 'Deepali Shop API is running. Client build was not found (run client in dev mode).',
        status: 'online'
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'production'} mode on port ${PORT}`);
});
