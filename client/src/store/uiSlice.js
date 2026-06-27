import { createSlice } from '@reduxjs/toolkit';

const storedDarkMode = localStorage.getItem('darkMode') === 'true';

const initialState = {
  darkMode: storedDarkMode,
  sidebarCollapsed: false
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      localStorage.setItem('darkMode', state.darkMode);
      
      // Update HTML class list
      if (state.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    initializeTheme(state) {
      if (state.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    }
  }
});

export const { toggleDarkMode, initializeTheme, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
