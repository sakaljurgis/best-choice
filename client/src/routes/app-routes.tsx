import { Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/app-layout';
import HealthPage from '../pages/health-page';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HealthPage />} />
        <Route path="*" element={<HealthPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
