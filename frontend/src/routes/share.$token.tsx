import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Github } from "lucide-react";
import { RecipeView } from "../components/RecipeView";
import { api } from "../lib/api";
import { Skeleton } from "../components/ui/skeleton";

export const Route = createFileRoute("/share/$token")({
  component: SharePage,
});

function SharePage() {
  const { token } = Route.useParams();
  const { data: recipe, isLoading, error } = useQuery({
    queryKey: ["shared-recipe", token],
    queryFn: () => api.share.get(token),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg font-sans text-text">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-4 h-4 w-48" />
          <Skeleton className="mt-8 h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-bg font-sans text-text">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <p className="text-lg text-muted-foreground">Recipe not found or no longer shared.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg font-sans text-text">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <RecipeView recipe={recipe} />
        <div className="mt-12 border-t border-border pt-6 flex items-center justify-center gap-3">
          <p className="text-xs text-muted-foreground">
            Shared via <span className="font-display font-semibold">Sous Clip</span>
          </p>
          <a
            href="https://github.com/SachinVenugopalan30/sous-clip"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-text"
            title="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
