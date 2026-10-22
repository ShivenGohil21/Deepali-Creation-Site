const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const AuditLog = require('../models/AuditLog');

// Helper to get date boundaries
const getDateBoundaries = () => {
  const now = new Date();
  
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return { startOfToday, endOfToday, startOfMonth, endOfMonth };
};

// @desc    Get dashboard metrics & chart aggregates
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const { startOfToday, endOfToday, startOfMonth, endOfMonth } = getDateBoundaries();
    const now = new Date();
    const firstChartMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const dailySalesPipeline = [
      { $match: { date: { $gte: firstChartMonth, $lte: endOfMonth } } },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: Product.collection.name,
          localField: 'items.product',
          foreignField: '_id',
          as: 'productData'
        }
      },
      {
        $group: {
          _id: '$_id',
          date: { $first: '$date' },
          grandTotal: { $first: '$grandTotal' },
          profit: {
            $sum: {
              $cond: [
                { $ifNull: ['$items.product', false] },
                {
                  $multiply: [
                    {
                      $subtract: [
                        { $subtract: ['$items.price', { $ifNull: ['$items.discount', 0] }] },
                        { $ifNull: [{ $arrayElemAt: ['$productData.costPrice', 0] }, 0] }
                      ]
                    },
                    '$items.quantity'
                  ]
                },
                0
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
              timezone: timeZone
            }
          },
          sales: { $sum: '$grandTotal' },
          profit: { $sum: '$profit' }
        }
      }
    ];
    const monthlyPurchasesPipeline = [
      { $match: { date: { $gte: firstChartMonth, $lte: endOfMonth } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$date',
              timezone: timeZone
            }
          },
          total: { $sum: '$grandTotal' }
        }
      }
    ];

    const [
      totalProducts,
      totalCategories,
      totalBrands,
      totalCustomers,
      totalSuppliers,
      dailySales,
      lowStockProducts,
      recentSales,
      recentPurchases,
      recentLogs,
      salesAggregation,
      monthlyPurchases
    ] = await Promise.all([
      Product.countDocuments(),
      Category.countDocuments(),
      Brand.countDocuments(),
      Customer.countDocuments(),
      Supplier.countDocuments(),
      Sale.aggregate(dailySalesPipeline),
      Product.find({
        $expr: { $lte: ['$stockQuantity', '$alertQuantity'] }
      }).populate('category', 'name').limit(5),
      Sale.find()
        .populate('customer', 'name')
        .sort({ date: -1 })
        .limit(5),
      Purchase.find()
        .populate('supplier', 'name')
        .sort({ date: -1 })
        .limit(5),
      AuditLog.find().sort({ date: -1 }).limit(6),
      Sale.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalQuantity: { $sum: '$items.quantity' },
            totalSales: { $sum: '$items.total' }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
      ]),
      Purchase.aggregate(monthlyPurchasesPipeline)
    ]);

    const dailySalesMap = new Map(dailySales.map((day) => [day._id, day]));
    const formatDateKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayTotals = dailySalesMap.get(formatDateKey(startOfToday)) || {};
    const todaySalesTotal = Number(todayTotals.sales) || 0;
    const todayProfit = Number(todayTotals.profit) || 0;

    let monthlySalesTotal = 0;
    let monthlyProfit = 0;
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthSales = { sales: 0, profit: 0 };

      for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayData = dailySalesMap.get(formatDateKey(
          new Date(firstDay.getFullYear(), firstDay.getMonth(), day)
        ));
        if (dayData) {
          monthSales.sales += Number(dayData.sales) || 0;
          monthSales.profit += Number(dayData.profit) || 0;
        }
      }

      const monthName = firstDay.toLocaleString('default', { month: 'short' });
      chartData.push({
        month: monthName,
        sales: parseFloat(monthSales.sales.toFixed(2)),
        purchases: 0,
        profit: parseFloat(monthSales.profit.toFixed(2))
      });

      if (firstDay >= startOfMonth && firstDay <= endOfMonth) {
        monthlySalesTotal = monthSales.sales;
        monthlyProfit = monthSales.profit;
      }
    }

    const monthlyPurchaseMap = new Map(monthlyPurchases.map((month) => [month._id, month.total]));
    chartData.forEach((month, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      month.purchases = parseFloat((Number(monthlyPurchaseMap.get(monthKey)) || 0).toFixed(2));
    });

    const topProducts = await Product.find({
      _id: { $in: salesAggregation.map((item) => item._id).filter(Boolean) }
    }).select('name code sellingPrice barcodeValue');
    const topProductsById = new Map(topProducts.map((product) => [product._id.toString(), product]));
    const topSellingProducts = salesAggregation.flatMap((item) => {
      const product = topProductsById.get(item._id?.toString());
      return product ? [{
        product,
        quantity: item.totalQuantity,
        revenue: item.totalSales
      }] : [];
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts,
          totalCategories,
          totalBrands,
          totalCustomers,
          totalSuppliers,
          todaySales: todaySalesTotal,
          monthlySales: monthlySalesTotal,
          todayProfit,
          monthlyProfit
        },
        lowStockProducts,
        topSellingProducts,
        recentSales,
        recentPurchases,
        recentLogs,
        chartData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get inventory status reports
// @route   GET /api/reports/inventory
// @access  Private
exports.getInventoryReport = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('warehouseStock.warehouse', 'name');

    // Summarize warehouse stock
    const warehouses = await Warehouse.find();
    const warehouseSummaries = [];

    for (const wh of warehouses) {
      let itemsCount = 0;
      let totalQty = 0;
      let valuationCost = 0;
      let valuationRetail = 0;

      products.forEach((prod) => {
        const whStock = prod.warehouseStock.find((s) => s.warehouse.toString() === wh._id.toString());
        if (whStock && whStock.quantity > 0) {
          itemsCount++;
          totalQty += whStock.quantity;
          valuationCost += whStock.quantity * prod.costPrice;
          valuationRetail += whStock.quantity * prod.sellingPrice;
        }
      });

      warehouseSummaries.push({
        warehouse: wh,
        itemsCount,
        totalQuantity: totalQty,
        valuationCost,
        valuationRetail
      });
    }

    res.status(200).json({
      success: true,
      warehouseSummaries,
      totalProducts: products.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed Sales / Profit report by date range
// @route   GET /api/reports/sales
// @access  Private
exports.getSalesReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateQuery = {};
  if (startDate && endDate) {
    dateQuery = { date: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') } };
  }

  try {
    const sales = await Sale.find(dateQuery)
      .populate('customer', 'name')
      .populate('warehouse', 'name')
      .populate('items.product', 'name code barcodeValue costPrice');

    let totalSubtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    sales.forEach((sale) => {
      totalSubtotal += sale.subTotal;
      totalTax += sale.tax;
      totalDiscount += sale.discount;
      totalRevenue += sale.grandTotal;

      sale.items.forEach((item) => {
        if (item.product) {
          totalCost += (item.product.costPrice || 0) * item.quantity;
        }
      });
    });

    const netProfit = totalRevenue - totalCost;

    // Calculate Daily Profit Breakdown
    const dailyMap = {};
    sales.forEach((sale) => {
      const dateKey = new Date(sale.date).toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { revenue: 0, cost: 0, profit: 0, count: 0 };
      }
      dailyMap[dateKey].revenue += sale.grandTotal;
      dailyMap[dateKey].count += 1;

      let saleCost = 0;
      sale.items.forEach((item) => {
        if (item.product) {
          saleCost += (item.product.costPrice || 0) * item.quantity;
        }
      });
      dailyMap[dateKey].cost += saleCost;
      dailyMap[dateKey].profit += (sale.grandTotal - saleCost);
    });

    const dailyStats = Object.entries(dailyMap).map(([date, val]) => ({
      date,
      revenue: parseFloat(val.revenue.toFixed(2)),
      cost: parseFloat(val.cost.toFixed(2)),
      profit: parseFloat(val.profit.toFixed(2)),
      count: val.count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate Monthly Product Sales & Best Sellers
    const monthlyProductMap = {};
    sales.forEach((sale) => {
      const dateObj = new Date(sale.date);
      const monthKey = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyProductMap[monthKey]) {
        monthlyProductMap[monthKey] = {};
      }

      sale.items.forEach((item) => {
        const prodId = item.product?._id ? item.product._id.toString() : 'deleted';
        const name = item.productName || item.product?.name || 'Deleted Product';
        const code = item.productCode || item.product?.code || 'N/A';

        if (!monthlyProductMap[monthKey][prodId]) {
          monthlyProductMap[monthKey][prodId] = { name, code, quantity: 0, revenue: 0 };
        }
        monthlyProductMap[monthKey][prodId].quantity += item.quantity;
        monthlyProductMap[monthKey][prodId].revenue += item.total;
      });
    });

    const monthlyBestSellers = [];
    Object.entries(monthlyProductMap).forEach(([month, prods]) => {
      const sortedProds = Object.values(prods).sort((a, b) => b.quantity - a.quantity);
      if (sortedProds.length > 0) {
        monthlyBestSellers.push({
          month,
          topProduct: sortedProds[0],
          allProducts: sortedProds
        });
      }
    });

    res.status(200).json({
      success: true,
      summary: {
        totalSalesCount: sales.length,
        totalSubtotal,
        totalTax,
        totalDiscount,
        totalRevenue,
        totalCost,
        netProfit
      },
      sales,
      dailyStats,
      monthlyBestSellers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
