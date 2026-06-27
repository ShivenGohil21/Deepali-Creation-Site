import axios from 'axios';
import { store } from '../store';
import { logout, updateToken } from '../store/authSlice';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Inject JWT token into headers
API.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch auth errors and attempt refresh
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 Unauthorized and not already retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = store.getState().auth.refreshToken;
        if (!refreshToken) {
          store.dispatch(logout());
          return Promise.reject(error);
        }

        // Request a new access token
        const res = await axios.post('http://localhost:5000/api/auth/refresh', {
          token: refreshToken
        });

        if (res.data.success) {
          const newAccessToken = res.data.token;
          store.dispatch(updateToken(newAccessToken));
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, force logout
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }

    // Default error handling
    const errorMessage = error.response?.data?.message || error.message || 'API request failed';
    return Promise.reject(new Error(errorMessage));
  }
);

export default API;
