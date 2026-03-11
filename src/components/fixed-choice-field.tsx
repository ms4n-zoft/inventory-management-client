import { LockKeyholeIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function FixedChoiceField({
  value,
  hint,
  className
}: {
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 w-full items-center justify-between rounded-lg border bg-muted/30 px-3 text-sm",
        className
      )}
    >
      <span className="truncate font-medium">{value}</span>
      <span className="ml-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <LockKeyholeIcon className="size-3.5" />
        {hint ?? "Only available option"}
      </span>
    </div>
  );
}
