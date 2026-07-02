const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const PurchaseReturn = require('../models/PurchaseReturn');
const Sale = require('../models/Sale');
const SaleReturn = require('../models/SaleReturn');
const Adjustment = require('../models/Adjustment');

const reconcileStocks = async () => {
  try {
    console.log('[Stock Reconciliation] Auditing and correcting inventory stock levels...');
    const products = await Product.find({});

    let correctedCount = 0;

    for (const product of products) {
      const warehouseStockMap = {};

      // 1. Purchases (adds stock)
      const purchases = await Purchase.find({ 'items.product': product._id });
      for (const pur of purchases) {
        const whId = pur.warehouse.toString();
        const item = pur.items.find(it => it.product.toString() === product._id.toString());
        if (item) {
          warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) + Number(item.quantity || 0);
        }
      }

      // 2. Purchase Returns (subtracts stock)
      const purReturns = await PurchaseReturn.find({ 'items.product': product._id });
      for (const ret of purReturns) {
        const whId = ret.warehouse.toString();
        const item = ret.items.find(it => it.product.toString() === product._id.toString());
        if (item) {
          warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) - Number(item.quantity || 0);
        }
      }

      // 3. POS Sales (subtracts stock)
      const sales = await Sale.find({ 'items.product': product._id });
      for (const sale of sales) {
        const whId = sale.warehouse.toString();
        const item = sale.items.find(it => it.product.toString() === product._id.toString());
        if (item) {
          warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) - Number(item.quantity || 0);
        }
      }

      // 4. Sale Returns (adds stock)
      const saleReturns = await SaleReturn.find({ 'items.product': product._id });
      for (const ret of saleReturns) {
        const whId = ret.warehouse.toString();
        const item = ret.items.find(it => it.product.toString() === product._id.toString());
        if (item) {
          warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) + Number(item.quantity || 0);
        }
      }

      // 5. Stock Adjustments (adds/subtracts stock)
      const adjustments = await Adjustment.find({ 'items.product': product._id });
      for (const adj of adjustments) {
        const whId = adj.warehouse.toString();
        const item = adj.items.find(it => it.product.toString() === product._id.toString());
        if (item) {
          const adjQty = Number(item.quantity || 0);
          if (adj.type === 'Addition') {
            warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) + adjQty;
          } else if (adj.type === 'Deduction') {
            warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) - adjQty;
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

      // Compare to determine if changes exist
      let isChanged = false;
      if (product.stockQuantity !== totalStock) {
        isChanged = true;
      } else if (product.warehouseStock.length !== newWarehouseStock.length) {
        isChanged = true;
      } else {
        for (const stock of product.warehouseStock) {
          if (!stock.warehouse) continue;
          const matching = newWarehouseStock.find(s => s.warehouse === stock.warehouse.toString());
          if (!matching || matching.quantity !== stock.quantity) {
            isChanged = true;
            break;
          }
        }
      }

      if (isChanged) {
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              warehouseStock: newWarehouseStock,
              stockQuantity: totalStock,
              updatedAt: Date.now()
            }
          }
        );
        correctedCount++;
        console.log(`[Stock Reconciliation] Corrected ${product.code} (${product.name}) stock level to: ${totalStock} Pcs`);
      }
    }

    console.log(`[Stock Reconciliation] Completed. Reconciled all products, corrected ${correctedCount} database records.`);
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
      const item = pur.items.find(it => it.product.toString() === productId.toString());
      if (item) {
        warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) + Number(item.quantity || 0);
      }
    }

    // 2. Purchase Returns (subtracts stock)
    const purReturns = await PurchaseReturn.find({ 'items.product': productId });
    for (const ret of purReturns) {
      const whId = ret.warehouse.toString();
      const item = ret.items.find(it => it.product.toString() === productId.toString());
      if (item) {
        warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) - Number(item.quantity || 0);
      }
    }

    // 3. POS Sales (subtracts stock)
    const sales = await Sale.find({ 'items.product': productId });
    for (const sale of sales) {
      const whId = sale.warehouse.toString();
      const item = sale.items.find(it => it.product.toString() === productId.toString());
      if (item) {
        warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) - Number(item.quantity || 0);
      }
    }

    // 4. Sale Returns (adds stock)
    const saleReturns = await SaleReturn.find({ 'items.product': productId });
    for (const ret of saleReturns) {
      const whId = ret.warehouse.toString();
      const item = ret.items.find(it => it.product.toString() === productId.toString());
      if (item) {
        warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) + Number(item.quantity || 0);
      }
    }

    // 5. Stock Adjustments (adds/subtracts stock)
    const adjustments = await Adjustment.find({ 'items.product': productId });
    for (const adj of adjustments) {
      const whId = adj.warehouse.toString();
      const item = adj.items.find(it => it.product.toString() === productId.toString());
      if (item) {
        const adjQty = Number(item.quantity || 0);
        if (adj.type === 'Addition') {
          warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) + adjQty;
        } else if (adj.type === 'Deduction') {
          warehouseStockMap[whId] = (warehouseStockMap[whId] || 0) - adjQty;
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
