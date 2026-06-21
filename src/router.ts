import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { lazy, Suspense, createElement } from 'react';
import { Nav } from './components/Layout/Nav';
import { Landing } from './pages/Landing';

// Each page is a separate chunk — only downloaded when the user navigates there.
// gpt-tokenizer (~22 MB source) ships only with the Tokenizer chunk, not the landing page.
const NNPage          = lazy(() => import('./pages/NNPage').then(m => ({ default: m.NNPage })));
const TokenizerPage   = lazy(() => import('./pages/TokenizerPage').then(m => ({ default: m.TokenizerPage })));
const ActivationsPage = lazy(() => import('./pages/ActivationsPage').then(m => ({ default: m.ActivationsPage })));
const RegressionPage  = lazy(() => import('./pages/RegressionPage').then(m => ({ default: m.RegressionPage })));
const EmbeddingsPage  = lazy(() => import('./pages/EmbeddingsPage').then(m => ({ default: m.EmbeddingsPage })));
const AttentionPage   = lazy(() => import('./pages/AttentionPage').then(m => ({ default: m.AttentionPage })));

const PageShell = () =>
  createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100vh' } },
    createElement(Nav, null),
    createElement(Suspense, { fallback: createElement('div', { style: { flex: 1 } }) },
      createElement(Outlet, null),
    ),
  );

const rootRoute = createRootRoute({ component: PageShell });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Landing });
const nnRoute = createRoute({ getParentRoute: () => rootRoute, path: '/nn', component: NNPage });
const tokenizerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/tokenizer', component: TokenizerPage });
const activationsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/activations', component: ActivationsPage });
const regressionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/regression', component: RegressionPage });
const embeddingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/embeddings', component: EmbeddingsPage });
const attentionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/attention', component: AttentionPage });

const routeTree = rootRoute.addChildren([
  indexRoute, nnRoute, tokenizerRoute, activationsRoute,
  regressionRoute, embeddingsRoute, attentionRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router; }
}
