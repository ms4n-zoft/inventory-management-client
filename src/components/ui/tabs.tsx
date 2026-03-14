"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: "default" | "line";
}) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "group/tabs-list inline-flex items-center justify-center text-muted-foreground data-[orientation=vertical]:flex-col",
        variant === "default" &&
          "h-9 w-fit rounded-lg bg-muted p-1 data-[orientation=vertical]:h-auto data-[orientation=vertical]:w-full data-[orientation=vertical]:items-stretch",
        variant === "line" &&
          "h-auto w-full flex-wrap items-end justify-start gap-4 border-b bg-transparent p-0",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent text-sm font-medium text-muted-foreground transition-[color,box-shadow,border-color,background-color] outline-none hover:text-foreground/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground",
        "group-data-[variant=default]/tabs-list:min-h-7 group-data-[variant=default]/tabs-list:px-2.5 group-data-[variant=default]/tabs-list:py-1.5 group-data-[variant=default]/tabs-list:data-[state=active]:bg-background group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm",
        "group-data-[variant=line]/tabs-list:-mb-px group-data-[variant=line]/tabs-list:min-h-11 group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-b-transparent group-data-[variant=line]/tabs-list:px-0 group-data-[variant=line]/tabs-list:pb-3 group-data-[variant=line]/tabs-list:pt-2 group-data-[variant=line]/tabs-list:data-[state=active]:border-b-foreground group-data-[variant=line]/tabs-list:data-[state=active]:font-semibold",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
