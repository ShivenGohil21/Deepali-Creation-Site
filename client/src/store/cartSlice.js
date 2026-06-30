import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [], // { _id, name, code, barcodeValue, unit, sellingPrice, tax, quantity, discount, total }
  discount: 0, // Flat cart discount
  customer: null,  // Selected customer object
  warehouseId: '', // Selected warehouse ID
};

const calculateTotals = (state) => {
  let subTotal = 0;
  let rawSubTotal = 0;

  state.items.forEach(item => {
    rawSubTotal += (item.sellingPrice - (item.discount || 0)) * item.quantity;
  });

  let totalCgst = 0;
  let totalSgst = 0;
  const globalDiscount = state.discount || 0;

  state.items.forEach(item => {
    const discountedPrice = item.sellingPrice - (item.discount || 0);
    const lineTotal = discountedPrice * item.quantity;
    subTotal += lineTotal;

    // Distribute global discount proportionally to this line item
    const proportion = rawSubTotal > 0 ? (lineTotal / rawSubTotal) : 0;
    const itemGlobalDiscount = globalDiscount * proportion;
    
    const taxableAmount = Math.max(0, lineTotal - itemGlobalDiscount);
    
    // Calculate item tax based on product's tax percentage
    const itemTaxPercent = item.tax || 0;
    const itemTaxAmount = taxableAmount * (itemTaxPercent / 100);
    
    totalCgst += itemTaxAmount / 2;
    totalSgst += itemTaxAmount / 2;
  });
  
  const taxAmount = totalCgst + totalSgst;
  const grandTotal = Math.max(0, subTotal + taxAmount - globalDiscount);

  return {
    subTotal,
    cgstAmount: totalCgst,
    sgstAmount: totalSgst,
    taxAmount,
    grandTotal
  };
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, action) {
      const product = action.payload;
      const existing = state.items.find(item => item._id === product._id);
      
      if (existing) {
        existing.quantity += 1;
        existing.total = (existing.sellingPrice - (existing.discount || 0)) * existing.quantity;
      } else {
        state.items.push({
          ...product,
          quantity: 1,
          discount: 0,
          total: product.sellingPrice
        });
      }
    },
    removeFromCart(state, action) {
      state.items = state.items.filter(item => item._id !== action.payload);
    },
    updateQuantity(state, action) {
      const { productId, quantity } = action.payload;
      const item = state.items.find(it => it._id === productId);
      if (item) {
        item.quantity = Math.max(1, Number(quantity));
        item.total = (item.sellingPrice - (item.discount || 0)) * item.quantity;
      }
    },
    updateItemDiscount(state, action) {
      const { productId, discount } = action.payload;
      const item = state.items.find(it => it._id === productId);
      if (item) {
        item.discount = Math.max(0, Number(discount));
        item.total = (item.sellingPrice - item.discount) * item.quantity;
      }
    },
    setCartDiscount(state, action) {
      state.discount = Math.max(0, Number(action.payload));
    },

    setCustomer(state, action) {
      state.customer = action.payload;
    },
    setWarehouse(state, action) {
      state.warehouseId = action.payload;
    },
    clearCart(state) {
      state.items = [];
      state.discount = 0;
      // Note: Keep customer and warehouse to avoid re-selecting every sale
    },
    resetCartFull(state) {
      return initialState;
    }
  }
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  updateItemDiscount,
  setCartDiscount,
  setCustomer,
  setWarehouse,
  clearCart,
  resetCartFull
} = cartSlice.actions;

// Selectors for convenience
export const selectCartTotals = (state) => calculateTotals(state.cart);

export default cartSlice.reducer;
