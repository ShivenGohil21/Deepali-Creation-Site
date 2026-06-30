import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [], // { _id, name, code, barcodeValue, unit, sellingPrice, tax, quantity, discount, total }
  discount: 0, // Flat cart discount
  tax: 10,     // Global GST percentage (defaults to 10%)
  customer: null,  // Selected customer object
  warehouseId: '', // Selected warehouse ID
};

const calculateTotals = (state) => {
  let subTotal = 0;
  state.items.forEach(item => {
    const discountedPrice = item.sellingPrice - (item.discount || 0);
    const lineTotal = discountedPrice * item.quantity;
    subTotal += lineTotal;
  });
  
  const taxableAmount = Math.max(0, subTotal - state.discount);
  const taxAmount = taxableAmount * (state.tax / 100);
  const grandTotal = taxableAmount + taxAmount;

  return {
    subTotal,
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
    setCartTax(state, action) {
      state.tax = Math.max(0, Number(action.payload));
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
      state.tax = 10;
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
  setCartTax,
  setCustomer,
  setWarehouse,
  clearCart,
  resetCartFull
} = cartSlice.actions;

// Selectors for convenience
export const selectCartTotals = (state) => calculateTotals(state.cart);

export default cartSlice.reducer;
