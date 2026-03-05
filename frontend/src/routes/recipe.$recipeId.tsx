import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RecipeView } from "../components/RecipeView";
import { useRecipe, useDeleteRecipe } from "../hooks/useRecipes";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

export const Route = createFileRoute("/recipe/$recipeId")({
  component: RecipePage,
});

function RecipePage() {
  const { recipeId } = Route.useParams();
  const navigate = useNavigate();
  const { data: recipe, isLoading } = useRecipe(Number(recipeId));
  const deleteRecipe = useDeleteRecipe();

  const handleDelete = () => {
    deleteRecipe.mutate(Number(recipeId), {
      onSuccess: () => {
        toast.success("Recipe deleted");
        navigate({ to: "/" });
      },
    });
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
      <RecipeView recipe={recipe} />
    </div>
  );
}
