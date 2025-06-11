import { lazy, Suspense } from 'react';
import { Outlet, Navigate, useRoutes } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { varAlpha } from 'src/theme/styles';
import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/dashboard'));
export const DetailsPage = lazy(() => import('src/pages/details'));
export const ProductionPage = lazy(() => import('src/pages/production'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));

export const PerformancePage = lazy(() => import('src/pages/performance'));
export const EnergyPage = lazy(() => import('src/pages/energy'));
export const MachineReportPage = lazy(() => import('src/pages/machine-report'));
export const ProductionFormPage = lazy(() => import('src/pages/form/production'));
export const SettingMachineFormPage = lazy(() => import('src/pages/form/machine-setting'));

// ----------------------------------------------------------------------

const renderFallback = (
  <Box display="flex" alignItems="center" justifyContent="center" flex="1 1 auto">
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

export function Router() {
  return useRoutes([
    {
      element: (
        <DashboardLayout>
          <Suspense fallback={renderFallback}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      ),
      children: [
        { element: <HomePage />, index: true },
        { path: 'dashboard', element: <HomePage /> },
        { path: 'production', element: <ProductionPage /> },
        { path: 'balance', element: <HomePage /> },
        { path: 'performance', element: <PerformancePage /> },
        { path: 'energy', element: <EnergyPage /> },
        { path: 'machine-report', element: <MachineReportPage /> },
        { path: 'details', element: <DetailsPage /> },
        { path: 'production/form', element: <ProductionFormPage /> },
        { path: 'machine-setting/form', element: <SettingMachineFormPage /> },
      ],
    },
    {
      path: 'login',
      element: (
        <AuthLayout>
          <SignInPage />
        </AuthLayout>
      ),
    },
    {
      path: '404',
      element: <Page404 />,
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ]);
}
