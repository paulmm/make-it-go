import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { App } from './ui/App';
import { captureClassroomCodeFromUrl } from './classroom';
import './index.css';

// A teacher's shared link (?class=CODE) stores the class's code on this device and is scrubbed
// from the address bar before anything renders.
captureClassroomCodeFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
