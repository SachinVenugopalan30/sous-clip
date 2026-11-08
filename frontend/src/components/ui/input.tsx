import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn("ctl", className)} {...props} />
}

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn("ctl", className)} {...props} />
}

// Label, hint and error wired to one control: id, aria-describedby and aria-invalid are injected into the child
function Field({
  label,
  hint,
  error,
  invalid,
  children,
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  error?: string
  invalid?: boolean // flag the control without its own message
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>
}) {
  const id = React.useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {React.cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": error || invalid ? true : undefined })}
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="field-err">{error}</p>}
    </div>
  )
}

export { Input, Select, Field }
