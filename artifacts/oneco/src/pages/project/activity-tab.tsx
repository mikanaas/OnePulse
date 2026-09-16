import { useListActivity, useCreateActivity, useGenerateProjectSummary, getListActivityQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Wand2, Loader2, FileText, CheckCircle2, Target } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { invalidateProjectOverviews } from "@/lib/invalidate-project-overviews";

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
  const generateSummary = useGenerateProjectSummary();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [content, setContent] = useState("");
  const [type, setType] = useState<any>("kommentar");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createActivity.mutate(
      { projectId, data: { content, type } },
      {
        onSuccess: () => {
          setContent("");
          queryClient.invalidateQueries({ queryKey: getListActivityQueryKey(projectId) });
          invalidateProjectOverviews(queryClient);
        },
      }
    );
  };

  const handleGenerateSummary = () => {
    generateSummary.mutate(
      { projectId },
      {
        onSuccess: () => {
          toast({ title: "Oppsummering generert" });
          queryClient.invalidateQueries({ queryKey: getListActivityQueryKey(projectId) });
          invalidateProjectOverviews(queryClient);
        },
        onError: () => {
          toast({ title: "Feil", description: "Kunne ikke generere oppsummering", variant: "destructive" });
        }
      }
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
              <Select value={type} onValueChange={setType}>
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
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{activity.userName || "System"}</p>
                      <span className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</span>
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
    </div>
  );
}