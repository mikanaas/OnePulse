import { useState, useEffect } from "react";
import {
  useCreateUser,
  useDeleteUser,
  useGetMe,
  useListUsers,
  usePermanentlyDeleteUser,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { Download, Loader2, Plus, Shield, Trash2, User as UserIcon, UserRoundX } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";

export default function AdminPage() {
  const [, ] = useLocation();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { data: users, isLoading, refetch: refetchUsers } = useListUsers();
  const { data: currentUser } = useGetMe();
  const createUser = useCreateUser();
  const deactivateUser = useDeleteUser();
  const permanentlyDeleteUser = usePermanentlyDeleteUser();

  const [seedStatus, setSeedStatus] = useState<{ seeded: boolean; projectCount: number } | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user");
  const [newUserLoading, setNewUserLoading] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: number; name: string; email: string } | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<{ id: number; name: string; email: string } | null>(null);

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
        refetchUsers();
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
        refetchUsers();
      } else {
        toast({ title: body.error ?? "Noe gikk galt", variant: "destructive" });
      }
    } finally {
      setResetLoading(false);
    }
  }

  function openNewUser() {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRole("user");
    setNewUserOpen(true);
  }

  async function handleCreateUser() {
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    setNewUserLoading(true);
    try {
      await createUser.mutateAsync({ data: { name: newUserName.trim(), email: newUserEmail.trim(), systemRole: newUserRole } });
      toast({ title: "Bruker opprettet", description: `${newUserName} er lagt til. De kan nå logge inn med ${newUserEmail}.` });
      setNewUserOpen(false);
      refetchUsers();
    } catch {
      toast({ title: "Kunne ikke opprette bruker", description: "Sjekk at e-postadressen ikke allerede er i bruk.", variant: "destructive" });
    } finally {
      setNewUserLoading(false);
    }
  }

  async function handleDeactivateUser() {
    if (!deactivateTarget) return;
    try {
      await deactivateUser.mutateAsync({ id: deactivateTarget.id });
      setDeactivateTarget(null);
      await refetchUsers();
      toast({
        title: "Bruker deaktivert",
        description: `${deactivateTarget.name} har mistet tilgangen til OnePulse.`,
      });
    } catch {
      toast({
        title: "Kunne ikke deaktivere bruker",
        description: "Brukeren ble ikke endret. Prøv igjen.",
        variant: "destructive",
      });
    }
  }

  async function handlePermanentDeleteUser() {
    if (!permanentDeleteTarget) return;
    try {
      await permanentlyDeleteUser.mutateAsync({ id: permanentDeleteTarget.id });
      setPermanentDeleteTarget(null);
      await refetchUsers();
      toast({
        title: "Bruker slettet permanent",
        description: `${permanentDeleteTarget.name} er fjernet fra OnePulse.`,
      });
    } catch (error) {
      const message = error instanceof Error && error.message.includes(": ")
        ? error.message.slice(error.message.indexOf(": ") + 2)
        : "Brukeren ble ikke slettet. Prøv igjen.";
      toast({
        title: "Kunne ikke slette bruker permanent",
        description: message,
        variant: "destructive",
      });
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
          <Button onClick={openNewUser}>
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
                        Dette vil permanent slette alle {seedStatus?.projectCount} prosjekter, inkludert oppgaver, effekter, kostnader og aktivitetslogg. Demobukerne vil også slettes. Handlingen kan ikke angres.
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
                <TableHead className="w-[120px] text-right">Handling</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {user.active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:bg-amber-50 hover:text-amber-700"
                            title={user.id === currentUser?.id ? "Du kan ikke deaktivere deg selv" : `Deaktiver ${user.name}`}
                            aria-label={user.id === currentUser?.id ? "Du kan ikke deaktivere deg selv" : `Deaktiver ${user.name}`}
                            disabled={user.id === currentUser?.id || deactivateUser.isPending || permanentlyDeleteUser.isPending}
                            onClick={() => setDeactivateTarget({ id: user.id, name: user.name, email: user.email })}
                          >
                            <UserRoundX className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          title={user.id === currentUser?.id ? "Du kan ikke slette deg selv" : `Slett ${user.name} permanent`}
                          aria-label={user.id === currentUser?.id ? "Du kan ikke slette deg selv" : `Slett ${user.name} permanent`}
                          disabled={user.id === currentUser?.id || deactivateUser.isPending || permanentlyDeleteUser.isPending}
                          onClick={() => setPermanentDeleteTarget({ id: user.id, name: user.name, email: user.email })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── Ny bruker dialog ─── */}
      <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Legg til ny bruker</DialogTitle>
            <DialogDescription>
              Opprett en brukerkonto. Brukeren kan deretter logge inn med sin Clerk-konto koblet til denne e-postadressen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-user-name">Navn</Label>
              <Input
                id="new-user-name"
                placeholder="Ola Nordmann"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-email">E-postadresse</Label>
              <Input
                id="new-user-email"
                type="email"
                placeholder="ola@bedrift.no"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-role">Rolle</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as "user" | "admin")}>
                <SelectTrigger id="new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Bruker</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewUserOpen(false)}>Avbryt</Button>
            <Button
              onClick={handleCreateUser}
              disabled={newUserLoading || !newUserName.trim() || !newUserEmail.trim()}
            >
              {newUserLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Opprett bruker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && !deactivateUser.isPending && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deaktiver bruker?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget && (
                <>
                  <strong>{deactivateTarget.name}</strong> ({deactivateTarget.email}) mister tilgangen til OnePulse.
                  Brukerens prosjekter og historikk beholdes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateUser.isPending}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              disabled={deactivateUser.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDeactivateUser();
              }}
            >
              {deactivateUser.isPending ? "Deaktiverer..." : "Deaktiver bruker"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!permanentDeleteTarget}
        onOpenChange={(open) => !open && !permanentlyDeleteUser.isPending && setPermanentDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett bruker permanent?</AlertDialogTitle>
            <AlertDialogDescription>
              {permanentDeleteTarget && (
                <>
                  <strong>{permanentDeleteTarget.name}</strong> ({permanentDeleteTarget.email}) fjernes permanent fra OnePulse.
                  Medlemskap og kommentarer fra brukeren slettes, og handlingen kan ikke angres. Dersom brukeren eier prosjekter,
                  må eierskapet flyttes før sletting.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={permanentlyDeleteUser.isPending}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={permanentlyDeleteUser.isPending}
              onClick={(event) => {
                event.preventDefault();
                handlePermanentDeleteUser();
              }}
            >
              {permanentlyDeleteUser.isPending ? "Sletter..." : "Slett permanent"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
