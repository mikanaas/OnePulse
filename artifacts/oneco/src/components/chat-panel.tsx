import { useState } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryPortfolio } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  
  const queryMutation = useQueryPortfolio();

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", content: input }]);
    queryMutation.mutate({ data: { question: input } }, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { role: "ai", content: data.answer }]);
      },
      onError: () => {
        setMessages(prev => [...prev, { role: "ai", content: "Beklager, det oppstod en feil under prosesseringen av forespørselen din." }]);
      }
    });
    setInput("");
  };

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => setIsOpen(true)}
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-card border rounded-lg shadow-xl flex flex-col z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> AI Assistent
            </h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:text-primary-foreground hover:bg-primary/80" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Spør meg om porteføljen, prosjekter eller besparelser.
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {queryMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted max-w-[80%] rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Tenker...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-3 border-t bg-card flex gap-2">
            <Input 
              placeholder="Spør AI..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={queryMutation.isPending}
            />
            <Button size="icon" onClick={handleSend} disabled={queryMutation.isPending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}