import { Link } from "react-router-dom";
import { PackagePlusIcon, ScrollTextIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ViewToolbarCard({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>View everything created</CardTitle>
        <CardDescription>
          Search the catalog and stock you already set up without jumping
          between separate pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by product, plan, code, vendor, or region"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/">
              <PackagePlusIcon data-icon="inline-start" />
              Open create flow
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/audit">
              <ScrollTextIcon data-icon="inline-start" />
              Open audit history
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
