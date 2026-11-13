import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import App from "./App";
import "./index.css";

const rootRoute = createRootRoute({ component: App });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" });
const groupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/groups/$groupId",
});
const photoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/photos/$photoId",
});
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/404",
});
const splatRoute = createRoute({ getParentRoute: () => rootRoute, path: "$" });
const router = createRouter({
  basepath: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
  routeTree: rootRoute.addChildren([
    indexRoute,
    groupRoute,
    photoRoute,
    notFoundRoute,
    splatRoute,
  ]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
