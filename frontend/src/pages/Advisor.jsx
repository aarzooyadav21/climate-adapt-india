import { useEffect, useState, useRef } from "react";
import { Bot, Send, Sparkles, Loader2 } from "lucide-react";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import StateSelector from "@/components/StateSelector";
import { useAppState } from "@/context/AppStateContext";
import api from "@/lib/api";

const SUGGESTIONS = [
  "What is the current monsoon state in India?",
  "How will +2\u00B0C warming affect rice production in Punjab?",
  "Which states are facing drought stress right now?",
  "Explain the heatwave risk for Delhi this week.",
  "What does today's data tell me about Kerala's climate?",
];

export default function Advisor() {
  const { selectedState } = useAppState();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content:
`Namaste 👋 I'm the **AI Climate Advisor**, grounded in real-time observations from NASA POWER, Open-Meteo ERA5, ECMWF forecasts and IMD-style climatology.

Currently focused on **${selectedState?.name || "India"}**.

Ask me anything about:
- Monsoon variability & rainfall departure
- Drought / SPI status across states
- Extreme weather alerts and risk
- Warming scenarios for any state
- Sector impacts (agriculture, water, urban heat, energy)

I cite the data I use — trust by transparency.`
      }]);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const ask = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
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
      setMessages((m) => [...m, { role: "assistant", content: data.reply, context: data.used_context }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Advisor temporarily unavailable. Please retry." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// AI Climate Advisor</div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Conversational climate intelligence, grounded.</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-[hsl(var(--primary)/0.4)] text-[hsl(var(--primary))]">
            <Sparkles className="w-3 h-3 mr-1" /> claude-sonnet-4-6 · grounded
          </Badge>
          <StateSelector />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <HUDPanel className="lg:col-span-9">
          <HUDHeader
            title="Conversation"
            subtitle={`Focus: ${selectedState?.name || "India"} · Context fed to advisor: current snapshot + 30d climatology + provenance`}
            right={<Bot className="w-4 h-4 text-[hsl(var(--primary))]" />}
          />
          <HUDBody className="flex flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 space-y-3" style={{ minHeight: 380, maxHeight: "60vh" }}>
              {messages.map((m, i) => (
                <div key={i} data-testid="advisor-chat-message"
                  className={`rounded-md px-4 py-3 text-sm leading-relaxed border ${
                    m.role === "user"
                      ? "bg-[hsl(var(--primary)/0.10)] border-[hsl(var(--primary)/0.30)] ml-10"
                      : "bg-card border-border/70 mr-10"
                  }`}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {m.role === "user" ? "You" : "Advisor · Claude"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.role === "assistant" && m.context?.location && (
                    <div className="mt-2 pt-2 border-t border-border/60 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                      Context: <Badge variant="outline" className="text-[10px]">{m.context.location.state || `${m.context.location.lat},${m.context.location.lon}`}</Badge>
                      {m.context.current_snapshot?.temperature_c !== undefined && (
                        <Badge variant="outline" className="text-[10px]">now {m.context.current_snapshot.temperature_c}°C</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">NASA POWER</Badge>
                      <Badge variant="outline" className="text-[10px]">Open-Meteo ERA5</Badge>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Advisor is thinking…
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Input
                data-testid="advisor-chat-input"
                placeholder={`Ask about ${selectedState?.name || "India"}'s climate…`}
                value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
                disabled={loading} className="font-mono"
              />
              <Button data-testid="advisor-chat-send" onClick={() => ask()} disabled={loading || !input.trim()}
                className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)]">
                <Send className="w-4 h-4 mr-1.5" /> Send
              </Button>
            </div>
          </HUDBody>
        </HUDPanel>

        <HUDPanel className="lg:col-span-3">
          <HUDHeader title="Suggestions" subtitle="Quick prompts" />
          <HUDBody className="space-y-2">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} data-testid={`advisor-suggestion-${i}`}
                onClick={() => ask(s)}
                disabled={loading}
                className="text-left text-xs font-mono w-full px-3 py-2 rounded-md border border-border/70 hover:bg-white/5 transition-colors disabled:opacity-60">
                {s}
              </button>
            ))}
          </HUDBody>
        </HUDPanel>
      </div>
    </div>
  );
}
