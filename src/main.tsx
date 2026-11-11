import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './styles/start.css';
import './styles/gradients.css';
import './styles/navigation-insets.css';
import './styles/artwork.css';
import './vfx/vfx.css';

const root = document.getElementById('root')!;
const app = <StrictMode><App /></StrictMode>;
// Production pages are prerendered at build time and hydrated; the dev server renders on the client.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
