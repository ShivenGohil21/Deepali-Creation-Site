const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getProducts,
  getProductById,
  getProductByCodeOrBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductBarcodeImage,
  importProductsExcel,
  bulkStockAdjustment,
  getBulkBarcodeImages
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

// Multer memory storage configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Please upload only Excel files (.xlsx, .xls)'), false);
    }
  }
});

router.route('/')
  .get(protect, getProducts)
  .post(protect, authorize('Super Admin', 'Admin', 'Manager'), createProduct);

router.route('/scan/:code')
  .get(protect, getProductByCodeOrBarcode);

router.route('/barcode-bulk')
  .post(protect, getBulkBarcodeImages);

router.route('/barcode/:id')
  .get(protect, getProductBarcodeImage);

router.route('/import')
  .post(protect, authorize('Super Admin', 'Admin'), upload.single('file'), importProductsExcel);

router.route('/bulk-adjust')
  .post(protect, authorize('Super Admin', 'Admin', 'Warehouse Staff'), bulkStockAdjustment);

router.route('/:id')
  .get(protect, getProductById)
  .put(protect, authorize('Super Admin', 'Admin', 'Manager'), updateProduct)
  .delete(protect, authorize('Super Admin', 'Admin'), deleteProduct);

module.exports = router;
