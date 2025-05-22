import 'src/global.css';

import { Router } from 'src/routes/sections';

import { useScrollToTop } from 'src/hooks/use-scroll-to-top';

import { ThemeProvider } from 'src/theme/theme-provider';

// ----------------------------------------------------------------------
// Disable console logs in production for Vite
if (import.meta.env.MODE === 'production') {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}

export default function App() {
  useScrollToTop();

  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
}
