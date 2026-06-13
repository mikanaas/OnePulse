import { useListUsers } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { Loader2, Plus, Shield, User as UserIcon } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { data: users, isLoading } = useListUsers();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
            <p className="text-muted-foreground">Brukere og systemadministrasjon.</p>
          </div>
          <Button onClick={() => setLocation("/admin/users/new")}>
            <Plus className="mr-2 h-4 w-4" /> Ny bruker
          </Button>
        </div>

        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sist innlogget</TableHead>
                <TableHead className="text-right">Prosjekter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Ingen brukere funnet.
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex w-fit items-center gap-1">
                        {user.systemRole === "admin" ? <Shield className="h-3 w-3 text-red-500" /> : <UserIcon className="h-3 w-3" />}
                        {user.systemRole === "admin" ? "Admin" : "Bruker"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.active ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">Aktiv</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none">Deaktivert</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(user.lastLogin)}</TableCell>
                    <TableCell className="text-right">{user.projectCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}