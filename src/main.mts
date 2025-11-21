import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './component/App/App';

const rootElement: HTMLDivElement = document.getElementById('react-enclosure') as HTMLDivElement;
const reactRoot = createRoot(rootElement);
reactRoot.render(createElement(StrictMode, {children: createElement(App)}));