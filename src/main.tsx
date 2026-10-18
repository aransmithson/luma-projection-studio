import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Output } from './components/Output';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{new URLSearchParams(location.search).has('output') ? <Output /> : <App />}</React.StrictMode>,
);
