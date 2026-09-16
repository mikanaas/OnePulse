import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mail, RefreshCw, XCircle } from "lucide-react";
import { useGetMe, useImportOutlookProposal } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Office?: any;
  }
}

type ImportState = "loading-office" | "importing" | "created" | "duplicate" | "error";

function loadOffice(): Promise<void> {
  if (window.Office) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-onepulse-office="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Office.js kunne ikke lastes")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://appsforoffice.microsoft.com/lib/1/hosted/office.js";
    script.dataset.onepulseOffice = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Office.js kunne ikke lastes"));
    document.head.appendChild(script);
  });
}

function getBodyText(item: any): Promise<string> {
  return new Promise((resolve, reject) => {
    item.body.getAsync(window.Office.CoercionType.Text, (result: any) => {
      if (result.status === window.Office.AsyncResultStatus.Succeeded) {
        resolve(String(result.value ?? "").trim());
      } else {
        reject(new Error(result.error?.message ?? "Kunne ikke lese e-postinnholdet"));
      }
    });
  });
}

export default function OutlookAddinPage() {
  const { data: me } = useGetMe({ query: { queryKey: ["/api/users/me"] } });
  const importProposal = useImportOutlookProposal();
  const started = useRef(false);
  const [state, setState] = useState<ImportState>("loading-office");
  const [message, setMessage] = useState("Kobler til Outlook …");

  const runImport = async () => {
    if (!me || importProposal.isPending) return;
    setState("loading-office");
    setMessage("Leser e-posten …");

    try {
      await loadOffice();
      await window.Office.onReady();
      const item = window.Office.context?.mailbox?.item;
      if (!item?.itemId || !item?.body) {
        throw new Error("Åpne en mottatt e-post før du bruker OnePulse-knappen.");
      }

      const subject = String(item.subject ?? "").trim() || "Forbedringsforslag fra Outlook";
      const body = await getBodyText(item);
      if (!body) throw new Error("E-posten har ikke noe innhold som kan importeres.");

      setState("importing");
      setMessage("Oppretter forbedringsforslag …");
      const result = await importProposal.mutateAsync({
        data: {
          messageId: String(item.itemId),
          subject,
          body,
          senderName: item.from?.displayName,
          senderEmail: item.from?.emailAddress,
        },
      });

      if (result.created) {
        setState("created");
        setMessage(`«${result.proposal.title}» er lagt til som et nytt forbedringsforslag.`);
      } else {
        setState("duplicate");
        setMessage("Denne e-posten finnes allerede i listen over forbedringsforslag.");
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "E-posten kunne ikke importeres.");
    }
  };

  useEffect(() => {
    if (!me || started.current) return;
    started.current = true;
    void runImport();
  }, [me]);

  const success = state === "created" || state === "duplicate";

  return (
    <main className="min-h-[100dvh] bg-background p-5">
      <div className="mx-auto max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <div className="mb-5 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-800">
            <Mail className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">OnePulse</span>
        </div>

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {success ? (
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          ) : state === "error" ? (
            <XCircle className="h-7 w-7 text-red-600" />
          ) : (
            <Loader2 className="h-7 w-7 animate-spin text-purple-800" />
          )}
        </div>

        <h1 className="text-lg font-semibold">
          {state === "created"
            ? "Forslaget er opprettet"
            : state === "duplicate"
              ? "Allerede importert"
              : state === "error"
                ? "Kunne ikke sende e-posten"
                : "Sender til OnePulse"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>

        {state === "error" && (
          <Button className="mt-5 w-full" onClick={() => void runImport()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Prøv igjen
          </Button>
        )}
      </div>
    </main>
  );
}