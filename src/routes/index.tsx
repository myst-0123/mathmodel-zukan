import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import ModelPlaceholderPage from '../pages/ModelPlaceholderPage';
import PolyhedraPage from '../models/polyhedra';
import { allModels } from '../data/modelRegistry';

const modelRoutes = allModels.map((model) => ({
  path: model.path,
  element: model.id === 'polyhedra' ? <PolyhedraPage /> : <ModelPlaceholderPage />,
}));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      ...modelRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
