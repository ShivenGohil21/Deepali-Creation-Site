import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import API from '../utils/api';
import { addToCart, setWarehouse, selectCartTotals } from '../store/cartSlice';
import { store } from '../store';

const SCANNER_KEY_GAP = 100;
const SCANNER_IDLE_DELAY = 220;
const SCANNER_IDLE_MIN_LENGTH = 6;

const GlobalBarcodeScanner = () => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const [notice, setNotice] = useState(null);
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const idleTimerRef = useRef(null);
  const suppressEnterUntilRef = useRef(0);
  const scanQueueRef = useRef(Promise.resolve());
  const noticeTimerRef = useRef(null);

  useEffect(() => {
    if (pathname === '/pos') return undefined;

    const showNotice = (message, isError = false) => {
      setNotice({ message, isError });
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = window.setTimeout(() => setNotice(null), 4000);
    };

    const removeScannedTextFromFocusedInput = (barcode) => {
      const input = document.activeElement;
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
      if (!input.value.endsWith(barcode)) return;

      const prototype = input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (!valueSetter) return;

      valueSetter.call(input, input.value.slice(0, -barcode.length));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const addScannedProduct = async (barcode) => {
      try {
        const response = await API.get(`/products/scan/${encodeURIComponent(barcode)}`);
        if (!response.data.success) {
          showNotice('Product not found or inactive.', true);
          return;
        }

        const product = response.data.data;
        const state = store.getState();
        let warehouseId = state.cart.warehouseId;

        if (!warehouseId) {
          const warehousesResponse = await API.get('/warehouses');
          const defaultWarehouse = warehousesResponse.data.data?.[0];
          if (!defaultWarehouse) {
            showNotice('No warehouse is available for this sale.', true);
            return;
          }
          warehouseId = defaultWarehouse._id;
          dispatch(setWarehouse(warehouseId));
        }

        const currentWarehouseStock = (product.warehouseStock || []).find((stock) => {
          const stockWarehouseId = typeof stock.warehouse === 'object'
            ? stock.warehouse?._id
            : stock.warehouse;
          return String(stockWarehouseId) === String(warehouseId);
        });
        const available = Number(currentWarehouseStock?.quantity) || 0;
        const existingItem = store.getState().cart.items.find((item) => item._id === product._id);
        const currentQuantity = existingItem?.quantity || 0;

        if (available <= currentQuantity) {
          showNotice(
            available <= 0
              ? `Product is out of stock in the selected warehouse: ${product.name}.`
              : `Insufficient stock for ${product.name}. Available: ${available}.`,
            true
          );
          return;
        }

        dispatch(addToCart(product));
        const updatedState = store.getState();
        const quantity = updatedState.cart.items.find((item) => item._id === product._id)?.quantity || 1;
        const total = selectCartTotals(updatedState).grandTotal;
        showNotice(`Added ${product.name} · Qty ${quantity} · Cart total ₹${total.toFixed(2)}`);
      } catch (error) {
        showNotice(error.response?.data?.message || error.message, true);
      }
    };

    const enqueueScan = (barcode) => {
      scanQueueRef.current = scanQueueRef.current.then(() => addScannedProduct(barcode));
    };

    const completeScan = (barcode) => {
      if (barcode.length < 4) return false;
      removeScannedTextFromFocusedInput(barcode);
      suppressEnterUntilRef.current = Date.now() + 1000;
      enqueueScan(barcode);
      return true;
    };

    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      if (event.key === 'Enter') {
        if (Date.now() < suppressEnterUntilRef.current) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        const barcode = bufferRef.current;
        bufferRef.current = '';
        window.clearTimeout(idleTimerRef.current);
        if (completeScan(barcode)) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }

      if (event.key.length !== 1) return;

      const now = event.timeStamp;
      if (lastKeyTimeRef.current && now - lastKeyTimeRef.current > SCANNER_KEY_GAP) {
        bufferRef.current = '';
      }
      bufferRef.current += event.key;
      lastKeyTimeRef.current = now;

      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        const barcode = bufferRef.current;
        bufferRef.current = '';
        if (barcode.length >= SCANNER_IDLE_MIN_LENGTH) completeScan(barcode);
      }, SCANNER_IDLE_DELAY);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      window.clearTimeout(idleTimerRef.current);
      window.clearTimeout(noticeTimerRef.current);
    };
  }, [dispatch, pathname]);

  if (!notice || pathname === '/pos') return null;

  return (
    <div
      role={notice.isError ? 'alert' : 'status'}
      className={`fixed bottom-5 right-5 z-[100] max-w-md rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${
        notice.isError
          ? 'bg-red-600 text-white'
          : 'bg-emerald-600 text-white'
      }`}
    >
      {notice.message}
    </div>
  );
};

export default GlobalBarcodeScanner;
