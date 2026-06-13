import { useState, useEffect } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { Loader2, Plus, Shield, User as UserIcon, Download, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { data: users, isLoading } = useListUsers();

  const [seedStatus, setSeedStatus] = useState<{ seeded: boolean; projectCount: number } | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function authHeader(): Promise<Record<string, string>> {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function fetchSeedStatus() {
    const headers = await authHeader();
    const r = await fetch("/api/admin/seed-demo/status", { headers });
    if (r.ok) setSeedStatus(await r.json());
  }

  useEffect(() => { fetchSeedStatus(); }, []);

  async function handleSeedDemo() {
    setSeedLoading(true);
    try {
      const headers = await authHeader();
      const r = await fetch("/api/admin/seed-demo", { method: "POST", headers });
      const body = await r.json();
      if (r.ok) {
        toast({ title: "Demodata lastet inn", description: `${body.projects} prosjekter og ${body.users} brukere opprettet.` });
        fetchSeedStatus();
      } else {
        toast({ title: body.error ?? "Noe gikk galt", variant: "destructive" });
      }
    } finally {
      setSeedLoading(false);
    }
  }

  async function handleResetProjects() {
    setResetLoading(true);
    try {
      const headers = await authHeader();
      const r = await fetch("/api/admin/reset-projects", { method: "DELETE", headers });
      const body = await r.json();
      if (r.ok) {
        toast({ title: "Prosjekter slettet", description: `${body.deleted} prosjekter og tilhørende data er fjernet.` });
        fetchSeedStatus();
      } else {
        toast({ title: body.error ?? "Noe gikk galt", variant: "destructive" });
      }
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
            <p className="text-muted-foreground">Brukere og systemadministrasjon.</p>
          </div>
          <Button onClick={() => setLocation("/admin/users/new")}>
            <Plus className="mr-2 h-4 w-4" /> Ny bruker
          </Button>
        </div>

        {/* ─── Demo data management ─── */}
        <Card>
          <CardHeader>
            <CardTitle>Demodata</CardTitle>
            <CardDescription>
              Last inn 10 eksempelprosjekter med oppgaver, effekter og kostnader for å demonstrere systemet. Slett alle prosjekter når du er klar til å legge inn faktiske data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                variant="outline"
                onClick={handleSeedDemo}
                disabled={seedLoading || seedStatus?.seeded}
              >
                {seedLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Last inn demodata
              </Button>
              {seedStatus?.seeded && (
                <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                  Demodata er lastet inn
                </Badge>
              )}

              {(seedStatus?.projectCount ?? 0) > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={resetLoading}>
                      {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Slett alle prosjekter ({seedStatus?.projectCount})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Slett alle prosjekter?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dette vil permanent slette alle {seedStatus?.projectCount} prosjekter, inkludert oppgaver, effekter, kostnader og aktivitetslogg. Demobukerne (kari@oneco.no osv.) vil også slettes. Handlingen kan ikke angres.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleResetProjects}
                      >
                        Slett alle
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── User table ─── */}
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
