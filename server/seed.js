const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Warehouse = require('./models/Warehouse');
const Category = require('./models/Category');
const Brand = require('./models/Brand');
const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');

// Load env vars
dotenv.config();

const seedDB = async () => {
  let connString = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/deepali_shop';
  console.log(`Seeding database using connection: ${connString}`);
  
  try {
    try {
      await mongoose.connect(connString, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to database for seeding...');
    } catch (err) {
      console.warn(`Primary connection failed: ${err.message}. Attempting local fallback...`);
      const localUri = process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/deepali_shop';
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to local database fallback for seeding...');
    }

    // 1. Seed default Super Admin
    const adminExists = await User.findOne({ username: 'deepali' });
    if (!adminExists) {
      console.log('Creating default admin user...');
      const adminUser = new User({
        name: 'Deepali Owner',
        username: 'deepali',
        email: 'deepali@shop.com',
        password: 'deepali@123', // Will be hashed in User Schema pre-save
        role: 'Super Admin',
        permissions: ['all'],
        status: 'Active'
      });
      await adminUser.save();
      console.log('Super Admin user (deepali / deepali@123) created successfully!');
    } else {
      console.log('Admin user (deepali) already exists. Skipping...');
    }

    // 2. Seed default Warehouse
    let defaultWarehouse = await Warehouse.findOne({ name: 'Deepali Main Showroom' });
    if (!defaultWarehouse) {
      console.log('Creating default warehouse...');
      defaultWarehouse = new Warehouse({
        name: 'Deepali Main Showroom',
        location: 'Ground Floor, Main Bazar',
        address: 'Deepali Garments, Near Clock Tower, Mumbai',
        description: 'Main outlet showroom and primary warehouse'
      });
      await defaultWarehouse.save();
      console.log('Default warehouse created.');
    }

    // 3. Seed default Customer (Walk-in Customer for quick sales)
    let walkinCustomer = await Customer.findOne({ name: 'Walk-in Customer' });
    if (!walkinCustomer) {
      console.log('Creating default walk-in customer...');
      walkinCustomer = new Customer({
        name: 'Walk-in Customer',
        mobile: '0000000000',
        email: 'walkin@deepali.com',
        address: 'N/A',
        balance: 0
      });
      await walkinCustomer.save();
      console.log('Default walk-in customer created.');
    }

    // 4. Seed some sample Categories if empty
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log('Creating initial categories...');
      const defaultCategories = [
        { name: 'Sarees', description: 'Traditional and designer sarees' },
        { name: 'Kurtis', description: 'Ladies kurtis and ethnic wear' },
        { name: 'Shirts', description: 'Men formal and casual shirts' },
        { name: 'Trousers', description: 'Cotton and formal trousers' },
        { name: 'Lehengas', description: 'Designer bridal and festive lehengas' }
      ];
      await Category.insertMany(defaultCategories);
      console.log('Initial categories created.');
    }

    // 5. Seed some sample Brands if empty
    const brandCount = await Brand.countDocuments();
    if (brandCount === 0) {
      console.log('Creating initial brands...');
      const defaultBrands = [
        { name: 'Deepali Bridal', description: 'In-house premium bridal collection' },
        { name: 'Cotton Club', description: 'Casual cotton apparels' },
        { name: 'Silk Route', description: 'Traditional silk designs' }
      ];
      await Brand.insertMany(defaultBrands);
      console.log('Initial brands created.');
    }

    // 6. Seed a default Supplier if empty
    const supplierCount = await Supplier.countDocuments();
    if (supplierCount === 0) {
      console.log('Creating a default supplier...');
      const defaultSupplier = new Supplier({
        name: 'Deepali Textiles Wholesale',
        mobile: '9876543210',
        email: 'wholesale@deepalitextiles.com',
        gstNumber: '27AAAAA1111A1Z1',
        address: 'Textile Market, Surat, Gujarat',
        balance: 0
      });
      await defaultSupplier.save();
      console.log('Default supplier created.');
    }

    console.log('Database seeding completed successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedDB();
