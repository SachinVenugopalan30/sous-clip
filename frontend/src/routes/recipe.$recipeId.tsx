import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ClipboardCopy, Download, FileText, Link as LinkIcon, Link2Off, Loader2, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RecipeEditForm } from "../components/RecipeEditForm";
import { RecipeView } from "../components/RecipeView";
import { useRecipe, useDeleteRecipe } from "../hooks/useRecipes";
import { useSettings } from "../hooks/useSettings";
import { api } from "../lib/api";
import { formatAsMarkdown, formatAsText, downloadFile } from "../lib/export";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Skeleton } from "../components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/recipe/$recipeId")({
  component: RecipePage,
});

function RecipePage() {
  const { recipeId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: recipe, isLoading } = useRecipe(Number(recipeId));
  const deleteRecipe = useDeleteRecipe();
  const { data: settings } = useSettings();
  const mealieConfigured = !!(settings?.mealie_url && settings?.mealie_api_key);
  const [sharing, setSharing] = useState(false);
  const [sendingToMealie, setSendingToMealie] = useState(false);
  const [editing, setEditing] = useState(false);

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
    try {
      const { share_url } = await api.recipes.share(recipe.id);
      const fullUrl = `${window.location.origin}${share_url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Share link copied to clipboard");
      queryClient.invalidateQueries({ queryKey: ["recipe", recipe.id] });
    } catch {
      toast.error("Failed to share recipe");
    } finally {
      setSharing(false);
    }
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
    } catch {
      toast.error("Failed to unshare recipe");
    } finally {
      setSharing(false);
    }
  };

  const handleSendToMealie = async () => {
    if (!recipe) return;
    setSendingToMealie(true);
    try {
      const result = await api.recipes.sendToMealie(recipe.id);
      if (result.ok) {
        toast.success("Recipe sent to Mealie");
      } else {
        toast.error(result.error || "Failed to send to Mealie");
      }
    } catch {
      toast.error("Failed to send to Mealie");
    } finally {
      setSendingToMealie(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!recipe) return;
    const content = formatAsMarkdown(recipe);
    const filename = `${recipe.title.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.md`;
    downloadFile(content, filename, "text/markdown");
  };

  const handleExportText = () => {
    if (!recipe) return;
    const content = formatAsText(recipe);
    const filename = `${recipe.title.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.txt`;
    downloadFile(content, filename, "text/plain");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-8 h-64 w-full" />
      </div>
    );
  }

  if (!recipe) {
    return <p className="text-muted-foreground">Recipe not found.</p>;
  }

  const secondaryActions = [
    ...(recipe.share_token
      ? [{ label: "Unshare", menuLabel: "Stop sharing", icon: Link2Off, onClick: handleUnshare, disabled: sharing, className: "text-muted-foreground" }]
      : []),
    { label: ".md", menuLabel: "Export as Markdown", icon: Download, onClick: handleExportMarkdown },
    { label: ".txt", menuLabel: "Export as text", icon: FileText, onClick: handleExportText },
    ...(mealieConfigured
      ? [{ label: "Mealie", menuLabel: "Send to Mealie", icon: sendingToMealie ? Loader2 : Send, spin: sendingToMealie, onClick: handleSendToMealie, disabled: sendingToMealie }]
      : []),
    { label: "Delete", menuLabel: "Delete recipe", icon: Trash2, onClick: handleDelete, danger: true, className: "text-red-600 hover:bg-red-50 hover:text-red-700" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Link to="/" className="-ml-1 flex min-h-11 items-center gap-1 pl-1 text-sm text-muted-foreground hover:text-text sm:min-h-0">
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={editing} className="h-10 sm:h-8">
            <Pencil className="mr-1 h-4 w-4" />
            Edit
          </Button>
          {recipe.share_token ? (
            <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-10 sm:h-8">
              <ClipboardCopy className="mr-1 h-4 w-4" />
              Copy link
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleShare} disabled={sharing} className="h-10 sm:h-8">
              <LinkIcon className="mr-1 h-4 w-4" />
              Share
            </Button>
          )}
          {/* Inline on desktop; behind "⋯" on phones so Delete isn't one stray tap away */}
          {secondaryActions.map((a) => (
            <Button key={a.label} variant="ghost" size="sm" onClick={a.onClick} disabled={a.disabled} className={`hidden sm:inline-flex ${a.className ?? ""}`}>
              <a.icon className={`mr-1 h-4 w-4 ${a.spin ? "animate-spin" : ""}`} />
              {a.label}
            </Button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="size-10 sm:hidden" aria-label="More actions">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
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
        <RecipeEditForm recipe={recipe} onDone={() => setEditing(false)} />
      ) : (
        <RecipeView recipe={recipe} />
      )}
    </div>
  );
}
