import '@douyinfe/semi-ui/react19-adapter';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@douyinfe/semi-ui/lib/es/_base/base.css';
import './assets/styles/global.css';
import App from './App';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root not found');
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
