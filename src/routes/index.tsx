import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import ModelPlaceholderPage from '../pages/ModelPlaceholderPage';
import { allModels } from '../data/modelRegistry';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      ...allModels.map((model) => ({
        path: model.path,
        element: <ModelPlaceholderPage />,
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
