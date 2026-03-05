import { useEffect } from "react";
import { createRootRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { CommandPalette } from "../components/CommandPalette";
import { useAuthStore } from "../stores/auth";

function RootComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)();
  const isLoginPage = location.pathname === "/login";
  const isSharePage = location.pathname.startsWith("/share/");
  const isPublicPage = isLoginPage || isSharePage;

  useEffect(() => {
    if (!isAuthenticated && !isPublicPage) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isPublicPage, navigate]);

  if (!isAuthenticated && !isPublicPage) {
    return null;
  }

  if (isPublicPage && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg font-sans text-text">
        <Outlet />
      </div>
    );
  }

  return (
    <>
      <Layout />
      <CommandPalette />
    </>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
