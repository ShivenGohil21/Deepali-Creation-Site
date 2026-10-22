const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const PurchaseReturn = require('../models/PurchaseReturn');
const Sale = require('../models/Sale');
const SaleReturn = require('../models/SaleReturn');
const Adjustment = require('../models/Adjustment');

const getProductQuantity = (items, productId) => items.reduce((total, item) => (
  item.product.toString() === productId.toString()
    ? total + Number(item.quantity || 0)
    : total
), 0);

const aggregateStockMovements = (Model, direction) => Model.aggregate([
  { $unwind: '$items' },
  {
    $match: {
      'items.product': { $ne: null },
      warehouse: { $ne: null }
    }
  },
  {
    $group: {
      _id: {
        product: '$items.product',
        warehouse: '$warehouse'
      },
      quantity: {
        $sum: {
          $multiply: [
            { $ifNull: ['$items.quantity', 0] },
            direction
          ]
        }
      }
    }
  }
]);

const aggregateAdjustmentMovements = () => Adjustment.aggregate([
  { $unwind: '$items' },
  {
    $match: {
      'items.product': { $ne: null },
      warehouse: { $ne: null }
    }
  },
  {
    $group: {
      _id: {
        product: '$items.product',
        warehouse: '$warehouse'
      },
      quantity: {
        $sum: {
          $switch: {
            branches: [
              {
                case: { $eq: ['$items.type', 'Addition'] },
                then: { $ifNull: ['$items.quantity', 0] }
              },
              {
                case: { $eq: ['$items.type', 'Subtraction'] },
                then: { $multiply: [{ $ifNull: ['$items.quantity', 0] }, -1] }
              }
            ],
            default: 0
          }
        }
      }
    }
  }
]);

const reconcileStocks = async () => {
  try {
    console.log('[Stock Reconciliation] Auditing and correcting inventory stock levels...');
    const [
      products,
      purchases,
      purchaseReturns,
      sales,
      saleReturns,
      adjustments
    ] = await Promise.all([
      Product.find({}).select('_id code name stockQuantity warehouseStock').lean(),
      aggregateStockMovements(Purchase, 1),
      aggregateStockMovements(PurchaseReturn, -1),
      aggregateStockMovements(Sale, -1),
      aggregateStockMovements(SaleReturn, 1),
      aggregateAdjustmentMovements()
    ]);

    const stockByProduct = new Map();
    const addMovements = (movements) => {
      for (const movement of movements) {
        const productId = movement._id.product.toString();
        const warehouseId = movement._id.warehouse.toString();
        let warehouseStock = stockByProduct.get(productId);
        if (!warehouseStock) {
          warehouseStock = new Map();
          stockByProduct.set(productId, warehouseStock);
        }
        warehouseStock.set(
          warehouseId,
          (warehouseStock.get(warehouseId) || 0) + Number(movement.quantity || 0)
        );
      }
    };

    [purchases, purchaseReturns, sales, saleReturns, adjustments].forEach(addMovements);

    const operations = [];
    for (const product of products) {
      const currentWarehouseStock = stockByProduct.get(product._id.toString()) || new Map();
      const newWarehouseStock = Array.from(currentWarehouseStock, ([warehouse, quantity]) => ({
        warehouse,
        quantity: Math.max(0, quantity)
      }));
      const totalStock = newWarehouseStock.reduce((total, stock) => total + stock.quantity, 0);
      const existingWarehouseStock = product.warehouseStock || [];
      const warehouseStockChanged = existingWarehouseStock.length !== newWarehouseStock.length ||
        existingWarehouseStock.some((stock) => {
          if (!stock.warehouse) return true;
          const updated = newWarehouseStock.find(
            (entry) => entry.warehouse === stock.warehouse.toString()
          );
          return !updated || updated.quantity !== Number(stock.quantity || 0);
        });

      if (Number(product.stockQuantity || 0) !== totalStock || warehouseStockChanged) {
        operations.push({
          updateOne: {
            filter: { _id: product._id },
            update: {
              $set: {
                warehouseStock: newWarehouseStock,
                stockQuantity: totalStock,
                updatedAt: Date.now()
              }
            }
          }
        });
        console.log(`[Stock Reconciliation] Corrected ${product.code} (${product.name}) stock level to: ${totalStock} Pcs`);
      }
    }

    if (operations.length > 0) {
      await Product.bulkWrite(operations, { ordered: false });
    }

    console.log(`[Stock Reconciliation] Completed. Reconciled all products, corrected ${operations.length} database records.`);
  } catch (error) {
    console.error('[Stock Reconciliation] Error during audit run:', error);
  }
};

const reconcileProductStock = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) return;

    const warehouseStockMap = {};

    // 1. Purchases (adds stock)
    const purchases = await Purchase.find({ 'items.product': productId });
    for (const pur of purchases) {
      const whId = pur.warehouse.toString();
      const quantity = getProductQuantity(pur.items, productId);
      warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) + quantity;
    }

    // 2. Purchase Returns (subtracts stock)
    const purReturns = await PurchaseReturn.find({ 'items.product': productId });
    for (const ret of purReturns) {
      const whId = ret.warehouse.toString();
      const quantity = getProductQuantity(ret.items, productId);
      warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) - quantity;
    }

    // 3. POS Sales (subtracts stock)
    const sales = await Sale.find({ 'items.product': productId });
    for (const sale of sales) {
      const whId = sale.warehouse.toString();
      const quantity = getProductQuantity(sale.items, productId);
      warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) - quantity;
    }

    // 4. Sale Returns (adds stock)
    const saleReturns = await SaleReturn.find({ 'items.product': productId });
    for (const ret of saleReturns) {
      const whId = ret.warehouse.toString();
      const quantity = getProductQuantity(ret.items, productId);
      warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) + quantity;
    }

    // 5. Stock Adjustments (adds/subtracts stock)
    const adjustments = await Adjustment.find({ 'items.product': productId });
    for (const adj of adjustments) {
      const whId = adj.warehouse.toString();
      for (const item of adj.items) {
        if (item.product.toString() === productId.toString()) {
          const adjQty = Number(item.quantity || 0);
          if (item.type === 'Addition') {
            warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) + adjQty;
          } else if (item.type === 'Subtraction') {
            warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) - adjQty;
          }
        }
      }
    }

    // Rebuild warehouseStock arrays
    const newWarehouseStock = [];
    let totalStock = 0;

    for (const [whId, qty] of Object.entries(warehouseStockMap)) {
      const finalQty = Math.max(0, qty);
      newWarehouseStock.push({
        warehouse: whId,
        quantity: finalQty
      });
      totalStock += finalQty;
    }

    await Product.updateOne(
      { _id: productId },
      {
        $set: {
          warehouseStock: newWarehouseStock,
          stockQuantity: totalStock,
          updatedAt: Date.now()
        }
      }
    );
    console.log(`[Stock Reconciliation] Reconciled stock for product ${product.code} (${product.name}) to ${totalStock}`);
  } catch (error) {
    console.error(`[Stock Reconciliation] Error reconciling product ${productId}:`, error);
  }
};

reconcileStocks.reconcileProductStock = reconcileProductStock;

module.exports = reconcileStocks;
