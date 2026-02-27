import { createElement, StrictMode, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import App from './component/App/App';

const rootElement: HTMLDivElement = document.getElementById('react-enclosure') as HTMLDivElement;
const reactRoot = createRoot(rootElement);
const strictModeEnabled = process.env.REACT_STRICT_MODE !== 'false';
reactRoot.render(createElement(strictModeEnabled ? StrictMode : Fragment, {children: createElement(App)}));