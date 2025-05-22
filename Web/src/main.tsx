import ReactDOM from 'react-dom/client';
import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// import {Copyright} from './copyright'
import App from './app';

// ----------------------------------------------------------------------
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <HelmetProvider>
    <BrowserRouter>
      <Suspense>
        <App />
        {/* <Copyright/> */}
      </Suspense>
    </BrowserRouter>
  </HelmetProvider>
);
