import * as React from "react"

import { cn } from "@/lib/utils"

// Styled once in index.css (.btn); "outline" is the quiet variant, "sm" the compact one
function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { variant?: "default" | "outline"; size?: "default" | "sm" }) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn("btn press", variant === "outline" && "ghost", size === "sm" && "sm", className)}
      {...props}
    />
  )
}

export { Button }
