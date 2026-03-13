import { ScrollTextIcon } from "lucide-react";

import type { AuditLog } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AuditPage({
  auditLogs,
  loading,
}: {
  auditLogs: AuditLog[];
  loading: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Audit log</CardTitle>
        <CardDescription>
          Recent mutations recorded by the backend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : auditLogs.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScrollTextIcon />
              </EmptyMedia>
              <EmptyTitle>No audit events</EmptyTitle>
              <EmptyDescription>
                Changes to inventory and billing data will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell className="font-medium">{entry.action}</TableCell>
                  <TableCell>{entry.actor}</TableCell>
                  <TableCell>
                    {new Date(entry.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
