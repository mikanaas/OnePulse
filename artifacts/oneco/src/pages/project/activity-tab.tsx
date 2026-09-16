import {
  getListActivityQueryKey,
  useCreateActivity,
  useDeleteActivity,
  useGenerateProjectSummary,
  useListActivity,
  useUpdateActivity,
} from "@workspace/api-client-react";
import type { ActivityEntry } from "@workspace/api-client-react";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Wand2, Loader2, FileText, CheckCircle2, Pencil, Target, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { invalidateProjectOverviews } from "@/lib/invalidate-project-overviews";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const iconMap: Record<string, any> = {
  kommentar: MessageSquare,
  beslutning: CheckCircle2,
  milepael: Target,
  avtale: FileText,
  system: Loader2,
  ai_oppsummering: Wand2,
};

export function ActivityTab({ projectId }: { projectId: number }) {
  const { data: activities, isLoading } = useListActivity(projectId, undefined, { query: { enabled: !!projectId, queryKey: getListActivityQueryKey(projectId) } });
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const generateSummary = useGenerateProjectSummary();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [content, setContent] = useState("");
  const [type, setType] = useState<"kommentar" | "beslutning" | "milepael" | "avtale">("kommentar");
  const [editTarget, setEditTarget] = useState<ActivityEntry | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<ActivityEntry["type"]>("kommentar");
  const [deleteTarget, setDeleteTarget] = useState<ActivityEntry | null>(null);

  const refreshActivity = () => {
    void queryClient.invalidateQueries({ queryKey: getListActivityQueryKey(projectId) });
    invalidateProjectOverviews(queryClient);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createActivity.mutate(
      { projectId, data: { content, type } },
      {
        onSuccess: () => {
          setContent("");
          refreshActivity();
        },
        onError: () => toast({ title: "Kunne ikke legge til aktivitet", variant: "destructive" }),
      }
    );
  };

  const handleGenerateSummary = () => {
    generateSummary.mutate(
      { projectId },
      {
        onSuccess: () => {
          toast({ title: "Oppsummering generert" });
          refreshActivity();
        },
        onError: () => {
          toast({ title: "Feil", description: "Kunne ikke generere oppsummering", variant: "destructive" });
        }
      }
    );
  };

  const openEdit = (activity: ActivityEntry) => {
    setEditTarget(activity);
    setEditContent(activity.content);
    setEditType(activity.type);
  };

  const handleUpdate = () => {
    if (!editTarget || !editContent.trim()) return;
    updateActivity.mutate(
      {
        projectId,
        id: editTarget.id,
        data: { type: editType, content: editContent.trim() },
      },
      {
        onSuccess: () => {
          toast({ title: "Aktivitet oppdatert" });
          setEditTarget(null);
          refreshActivity();
        },
        onError: () => toast({ title: "Kunne ikke oppdatere aktiviteten", variant: "destructive" }),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteActivity.mutate(
      { projectId, id: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "Aktivitet slettet" });
          setDeleteTarget(null);
          refreshActivity();
        },
        onError: () => toast({ title: "Kunne ikke slette aktiviteten", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Aktivitetslogg</h2>
        <Button onClick={handleGenerateSummary} disabled={generateSummary.isPending} variant="outline" className="gap-2">
          {generateSummary.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Generer statusoppdatering
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kommentar">Kommentar</SelectItem>
                  <SelectItem value="beslutning">Beslutning</SelectItem>
                  <SelectItem value="milepael">Milepæl</SelectItem>
                  <SelectItem value="avtale">Avtale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Skriv en ny oppdatering..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!content.trim() || createActivity.isPending}>
                {createActivity.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Legg til"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : activities?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-card">
            Ingen aktivitet ennå.
          </div>
        ) : (
          activities?.map((activity) => {
            const Icon = iconMap[activity.type] || MessageSquare;
            return (
              <Card key={activity.id}>
                <CardContent className="p-4 flex gap-4">
                  <Avatar className="h-10 w-10 mt-1">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{activity.userName || "System"}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground mr-1">{formatDateTime(activity.createdAt)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Rediger aktivitet"
                          aria-label="Rediger aktivitet"
                          disabled={updateActivity.isPending || deleteActivity.isPending}
                          onClick={() => openEdit(activity)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          title="Slett aktivitet"
                          aria-label="Slett aktivitet"
                          disabled={updateActivity.isPending || deleteActivity.isPending}
                          onClick={() => setDeleteTarget(activity)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className={`text-sm ${activity.type === "ai_oppsummering" ? "bg-primary/5 p-3 rounded-md mt-2" : "text-foreground"}`}>
                      {activity.content.split('\n').map((line, i) => (
                        <p key={i} className="mb-1">{line}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && !updateActivity.isPending && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rediger aktivitet</DialogTitle>
            <DialogDescription>Endre type eller innhold i aktivitetsloggen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={editType}
                onValueChange={(value) => setEditType(value as ActivityEntry["type"])}
                disabled={updateActivity.isPending}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kommentar">Kommentar</SelectItem>
                  <SelectItem value="beslutning">Beslutning</SelectItem>
                  <SelectItem value="milepael">Milepæl</SelectItem>
                  <SelectItem value="avtale">Avtale</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="ai_oppsummering">AI-oppsummering</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Innhold</label>
              <Textarea
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                rows={6}
                disabled={updateActivity.isPending}
              />
              {!editContent.trim() && <p className="text-sm text-destructive">Innhold kan ikke være tomt.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={updateActivity.isPending} onClick={() => setEditTarget(null)}>
              Avbryt
            </Button>
            <Button type="button" disabled={!editContent.trim() || updateActivity.isPending} onClick={handleUpdate}>
              {updateActivity.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lagre endringer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleteActivity.isPending && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett aktivitet?</AlertDialogTitle>
            <AlertDialogDescription>
              Oppføringen slettes permanent fra aktivitetsloggen. Handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteActivity.isPending}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteActivity.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              {deleteActivity.isPending ? "Sletter..." : "Slett aktivitet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}