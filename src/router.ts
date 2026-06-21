import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { Nav } from './components/Layout/Nav';
import { Landing } from './pages/Landing';
import { NNPage } from './pages/NNPage';
import { TokenizerPage } from './pages/TokenizerPage';
import { ActivationsPage } from './pages/ActivationsPage';
import { RegressionPage } from './pages/RegressionPage';
import { EmbeddingsPage } from './pages/EmbeddingsPage';
import { AttentionPage } from './pages/AttentionPage';
import { createElement } from 'react';

const rootRoute = createRootRoute({
  component: () =>
    createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100vh' } },
      createElement(Nav, null),
      createElement(Outlet, null),
    ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Landing,
});

const nnRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nn',
  component: NNPage,
});

const tokenizerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tokenizer',
  component: TokenizerPage,
});

const activationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activations',
  component: ActivationsPage,
});

const regressionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/regression',
  component: RegressionPage,
});

const embeddingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/embeddings',
  component: EmbeddingsPage,
});

const attentionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/attention',
  component: AttentionPage,
});

const routeTree = rootRoute.addChildren([indexRoute, nnRoute, tokenizerRoute, activationsRoute, regressionRoute, embeddingsRoute, attentionRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
