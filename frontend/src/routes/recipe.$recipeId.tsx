import { useEffect, useState } from "react";
import { createFileRoute, Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ClipboardCopy, Download, FileText, Link as LinkIcon, Link2Off, Loader2, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RecipeEditForm } from "../components/RecipeEditForm";
import { RecipeHero, RecipeView } from "../components/RecipeView";
import { useRecipe, useDeleteRecipe } from "../hooks/useRecipes";
import { useMealieConfigured } from "../hooks/useSettings";
import { api } from "../lib/api";
import { formatAsMarkdown, formatAsText, downloadFile, exportFilename } from "../lib/export";
import { opened } from "../lib/library";
import { copyShareLink, sendToMealie } from "../lib/recipeActions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/recipe/$recipeId")({
  component: RecipePage,
});

function RecipePage() {
  const { recipeId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const fromLibrary = useLocation({ select: (l) => (l.state as { fromLibrary?: boolean }).fromLibrary });
  const queryClient = useQueryClient();
  const { data: recipe, isLoading, isPlaceholderData } = useRecipe(Number(recipeId));
  const deleteRecipe = useDeleteRecipe();
  const mealieConfigured = useMealieConfigured();
  const [sharing, setSharing] = useState(false);
  const [sendingToMealie, setSendingToMealie] = useState(false);
  const [editing, setEditing] = useState(false);
  // The library names this recipe's photo on return, so the close transition lands on it
  useEffect(() => {
    opened.id = Number(recipeId);
  }, [recipeId]);

  const handleDelete = () => {
    if (!confirm("Delete this recipe?")) return;
    deleteRecipe.mutate(Number(recipeId), {
      onSuccess: () => {
        toast.success("Recipe deleted");
        navigate({ to: "/" });
      },
    });
  };

  const handleShare = async () => {
    if (!recipe) return;
    setSharing(true);
    if (await copyShareLink(recipe.id)) {
      queryClient.invalidateQueries({ queryKey: ["recipe", recipe.id] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    }
    setSharing(false);
  };

  const handleCopyLink = async () => {
    if (!recipe?.share_token) return;
    const fullUrl = `${window.location.origin}/share/${recipe.share_token}`;
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Share link copied to clipboard");
  };

  const handleUnshare = async () => {
    if (!recipe) return;
    setSharing(true);
    try {
      await api.recipes.unshare(recipe.id);
      toast.success("Share link removed");
      queryClient.invalidateQueries({ queryKey: ["recipe", recipe.id] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    } catch {
      toast.error("Failed to unshare recipe");
    } finally {
      setSharing(false);
    }
  };

  const handleSendToMealie = async () => {
    if (!recipe) return;
    setSendingToMealie(true);
    await sendToMealie(recipe.id);
    setSendingToMealie(false);
  };

  const handleExportMarkdown = () => {
    if (!recipe) return;
    const content = formatAsMarkdown(recipe);
    downloadFile(content, exportFilename(recipe.title, "md"), "text/markdown");
  };

  const handleExportText = () => {
    if (!recipe) return;
    const content = formatAsText(recipe);
    downloadFile(content, exportFilename(recipe.title, "txt"), "text/plain");
  };

  if (isLoading || !recipe) {
    return (
      <div className="rec">
        <RecipeHero loading={isLoading} />
        <div className="rec-wrap">
          <div className="recipe-sheet" aria-busy={isLoading}>
            {isLoading ? <div className="sk h-64" /> : <p className="text-muted-foreground">Could not load that recipe. It may have been deleted.</p>}
            <Link to="/" className="rec-btn back mt-4">
              <ArrowLeft className="h-4 w-4" />
              Back to library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const secondaryActions = [
    ...(recipe.share_token
      ? [{ label: "Unshare", menuLabel: "Stop sharing", icon: Link2Off, onClick: handleUnshare, disabled: sharing }]
      : []),
    { label: ".md", menuLabel: "Export as Markdown", icon: Download, onClick: handleExportMarkdown },
    { label: ".txt", menuLabel: "Export as text", icon: FileText, onClick: handleExportText },
    ...(mealieConfigured
      ? [{ label: "Mealie", menuLabel: "Send to Mealie", icon: sendingToMealie ? Loader2 : Send, spin: sendingToMealie, onClick: handleSendToMealie, disabled: sendingToMealie }]
      : []),
    { label: "Delete", menuLabel: "Delete recipe", icon: Trash2, onClick: handleDelete, danger: true },
  ];

  return (
    <div className="rec">
      <RecipeHero recipe={recipe} />
      <div className="rec-wrap">
        <div className="recipe-sheet">
          <div className="rec-acts">
            <Link to="/" className="rec-btn back" onClick={(e) => {
                if (!fromLibrary || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                router.history.back();
              }}>
              <ArrowLeft className="h-4 w-4" />
              Back to library
            </Link>
            <div>
              <button type="button" className="rec-btn press" onClick={() => setEditing(true)} disabled={editing || isPlaceholderData}>
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              {recipe.share_token ? (
                <button type="button" className="rec-btn press" onClick={handleCopyLink}>
                  <ClipboardCopy className="h-4 w-4" />
                  Copy link
                </button>
              ) : (
                <button type="button" className="rec-btn press" onClick={handleShare} disabled={sharing}>
                  <LinkIcon className="h-4 w-4" />
                  Share
                </button>
              )}
              {/* Inline on desktop; behind "⋯" on phones so Delete isn't one stray tap away */}
              {secondaryActions.map((a) => (
                <button key={a.label} type="button" onClick={a.onClick} disabled={a.disabled} className={`rec-btn rec-inline press${a.danger ? " bad" : ""}`}>
                  <a.icon className={`h-4 w-4 ${a.spin ? "animate-spin" : ""}`} />
                  {a.label}
                </button>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger className="rec-btn rec-more press" aria-label="More actions">
                  <MoreHorizontal className="h-5 w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  {secondaryActions.map((a) => (
                    <DropdownMenuItem key={a.label} onSelect={a.onClick} disabled={a.disabled} variant={a.danger ? "destructive" : "default"} className="min-h-11">
                      <a.icon className={a.spin ? "animate-spin" : ""} />
                      {a.menuLabel}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {editing ? (
            <div className="mt-6">
              <RecipeEditForm recipe={recipe} onDone={() => setEditing(false)} />
            </div>
          ) : (
            <RecipeView key={recipe.servings} recipe={recipe} />
          )}
        </div>
      </div>
    </div>
  );
}
