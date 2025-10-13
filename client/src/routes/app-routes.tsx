import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/app-layout';
import ProjectsPage from '../pages/projects-page';
import { ProjectDetailPage } from '../pages/project-detail/project-detail-page';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
