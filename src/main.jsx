import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

import "./styles.css";
import reportWebVitals from "./reportWebVitals";

// Import our components
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";

import { Link } from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 h-16 items-center">
            <Link to="/" className="text-gray-900">Dashboard</Link>
            <Link to="/settings" className="text-gray-900">Settings</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  ),
});

// Define routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: Settings,
});

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute,
]);

// Create router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

// Mount the app
const rootElement = document.getElementById("app");
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
