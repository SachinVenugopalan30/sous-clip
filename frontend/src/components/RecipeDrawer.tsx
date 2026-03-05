import { Drawer } from "vaul";
import { RecipeView } from "./RecipeView";
import type { Recipe } from "../lib/api";

interface RecipeDrawerProps {
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
}

export function RecipeDrawer({ recipe, open, onClose }: RecipeDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-bg">
          <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-border" />
          <div className="overflow-y-auto p-6">
            {recipe && <RecipeView recipe={recipe} />}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
