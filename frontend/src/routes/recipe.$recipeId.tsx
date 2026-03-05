import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, Link as LinkIcon, Link2Off, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RecipeView } from "../components/RecipeView";
import { useRecipe, useDeleteRecipe } from "../hooks/useRecipes";
import { api } from "../lib/api";
import { formatAsMarkdown, formatAsText, downloadFile } from "../lib/export";
import { Button } from "../components/ui/button";
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
  const [sharing, setSharing] = useState(false);

  const handleDelete = () => {
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
      if (recipe.share_token) {
        await api.recipes.unshare(recipe.id);
        toast.success("Share link removed");
      } else {
        const { share_url } = await api.recipes.share(recipe.id);
        const fullUrl = `${window.location.origin}${share_url}`;
        await navigator.clipboard.writeText(fullUrl);
        toast.success("Share link copied to clipboard");
      }
      queryClient.invalidateQueries({ queryKey: ["recipe", recipe.id] });
    } catch {
      toast.error("Failed to update sharing");
    } finally {
      setSharing(false);
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-text">
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            disabled={sharing}
            className={recipe.share_token ? "text-accent" : ""}
          >
            {recipe.share_token ? <Link2Off className="mr-1 h-4 w-4" /> : <LinkIcon className="mr-1 h-4 w-4" />}
            {recipe.share_token ? "Unshare" : "Share"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportMarkdown}>
            <Download className="mr-1 h-4 w-4" />
            .md
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportText}>
            <FileText className="mr-1 h-4 w-4" />
            .txt
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      <RecipeView recipe={recipe} />
    </div>
  );
}
