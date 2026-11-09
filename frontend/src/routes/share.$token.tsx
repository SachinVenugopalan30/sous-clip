import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GithubIcon } from "../components/Layout";
import { RecipeHero, RecipeView } from "../components/RecipeView";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";

export const Route = createFileRoute("/share/$token")({
  component: SharePage,
});

// Signed out there is no top bar, so the hero drops the bar padding (.rec-bare); signed in, Layout supplies the bar
function SharePage() {
  const { token } = Route.useParams();
  const signedIn = useAuthStore((s) => s.token !== null);
  const { data: recipe, isLoading } = useQuery({
    queryKey: ["shared-recipe", token],
    queryFn: () => api.share.get(token),
    retry: false,
  });

  return (
    <div className={`rec${signedIn ? "" : " rec-bare"} min-h-screen bg-bg font-sans text-text`}>
      <RecipeHero recipe={recipe} loading={isLoading} />
      <div className="rec-wrap">
        <div className="recipe-sheet">
          {recipe ? (
            <RecipeView recipe={recipe} />
          ) : isLoading ? (
            <div className="sk h-64" aria-busy="true" />
          ) : (
            <div className="none"><p>Recipe not found or no longer shared.</p></div>
          )}
          <div className="mt-10 flex items-center justify-center gap-3 border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              Shared via <span className="font-display font-semibold">Sous Clip</span>
            </p>
            <a
              href="https://github.com/SachinVenugopalan30/sous-clip"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-11 items-center justify-center text-muted-foreground transition-colors hover:text-text"
              aria-label="Sous Clip on GitHub"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
