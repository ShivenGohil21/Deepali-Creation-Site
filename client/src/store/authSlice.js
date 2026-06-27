import { createSlice } from '@reduxjs/toolkit';

// Retrieve initial state from local storage if available
const token = localStorage.getItem('token');
const refreshToken = localStorage.getItem('refreshToken');
let user = null;
try {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    user = JSON.parse(storedUser);
  }
} catch (e) {
  console.error('Failed to parse user from localStorage');
}

const initialState = {
  token: token || null,
  refreshToken: refreshToken || null,
  user: user || null,
  isAuthenticated: !!token,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    loginFailure(state, action) {
      state.loading = false;
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.error = action.payload;

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    logout(state) {
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.loading = false;
      state.error = null;

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    updateToken(state, action) {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
    },
    clearError(state) {
      state.error = null;
    }
  }
});

export const { loginStart, loginSuccess, loginFailure, logout, updateToken, clearError } = authSlice.actions;
export default authSlice.reducer;
