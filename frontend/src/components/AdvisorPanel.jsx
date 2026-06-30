import { useEffect, useState } from "react";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/context/AppStateContext";
import api from "@/lib/api";

export default function AdvisorPanel({ defaultOpen = false }) {
  const { selectedState } = useAppState();
  const [open, setOpen] = useState(defaultOpen);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Namaste 👋 I'm your AI Climate Advisor. I'm grounded in real fetched observations (NASA POWER, Open-Meteo ERA5, ECMWF) for **${selectedState?.name || "India"}**. Ask me about monsoon, drought, scenarios, sector impact — anything.`,
      }]);
    }
  }, [open]); // eslint-disable-line

  const ask = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/advisor/chat", {
        session_id: sessionId,
        message: msg,
        state_code: selectedState?.code,
      });
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Advisor temporarily unavailable. Please retry." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button data-testid="advisor-chat-open" size="lg"
          className="fixed bottom-5 right-5 z-50 rounded-full shadow-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)] hud-glow-cyan">
          <Bot className="w-4 h-4 mr-2" /> AI Advisor
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg bg-card/95 backdrop-blur-md border-l border-border">
        <SheetHeader className="border-b border-border/60 pb-3">
          <SheetTitle className="flex items-center gap-2 text-sm tracking-[0.16em] uppercase">
            <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
            AI Climate Advisor
          </SheetTitle>
          <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
            Grounded in: <Badge variant="outline" className="text-[10px]">{selectedState?.name || "India"}</Badge>
            <span>· NASA POWER · Open-Meteo ERA5</span>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] mt-3 pr-3">
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} data-testid="advisor-chat-message"
                className={`rounded-md px-3.5 py-3 text-sm leading-relaxed border ${
                  m.role === "user"
                    ? "bg-[hsl(var(--primary)/0.10)] border-[hsl(var(--primary)/0.30)] ml-6"
                    : "bg-card border-border/70 mr-6"
                }`}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {m.role === "user" ? "You" : "Advisor · Claude"}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Advisor is thinking…
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-3 flex items-center gap-2">
          <Input
            data-testid="advisor-chat-input"
            placeholder={`Ask about ${selectedState?.name || "India"}'s climate…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
            disabled={loading}
            className="font-mono"
          />
          <Button data-testid="advisor-chat-send" onClick={ask} disabled={loading || !input.trim()}
            className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)]">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
