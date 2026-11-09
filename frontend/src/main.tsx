import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { routeTree } from "./routeTree.gen";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/dm-sans/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./index.css";
import "./stores/theme"; // Initialize theme before first render

// TanStack Router awaits only updateCallbackDone, so `ready` rejects unhandled with an
// AbortError whenever overlapping navigations skip a transition. Mark it handled.
const startVT = document.startViewTransition?.bind(document);
if (startVT) {
  document.startViewTransition = (...args: Parameters<typeof startVT>) => {
    const t = startVT(...args);
    t.ready.catch(() => {});
    return t;
  };
}

const queryClient = new QueryClient();
const router = createRouter({
  routeTree,
  scrollRestoration: true,
  // The type picks which way the recipe-page transition plays: open (sheet rises) or close (sheet falls)
  defaultViewTransition: {
    types: ({ fromLocation, toLocation }) => {
      const from = !!fromLocation?.pathname.startsWith("/recipe/");
      const to = toLocation.pathname.startsWith("/recipe/");
      return from === to || !fromLocation ? [] : [to ? "open" : "close"];
    },
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
      <Toaster
        position="top-right"
        offset="calc(var(--bar-h) + 8px)"
        mobileOffset="calc(var(--bar-h) + 8px)"
        toastOptions={{ unstyled: true, classNames: { toast: "toast", success: "toast-ok", error: "toast-bad", content: "min-w-0 flex-1", closeButton: "toast-x", actionButton: "toast-act" } }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
