import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🚀 [main.jsx] Initializing React application...');

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <App />
  );
  console.log('✅ [main.jsx] React application successfully mounted to the DOM.');
} else {
  console.error('❌ [main.jsx] Failed to find root element!');
}