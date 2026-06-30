import { useEffect, useState } from "react";
import { Trash2, FolderOpen, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * Two reusable buttons for the Scenarios page:
 *   <SaveScenarioButton scenarioPayload={...} />
 *   <SavedScenariosButton onLoad={(s) => setLoadedScenario(s)} refreshKey={...} />
 */

export function SaveScenarioButton({ scenarioPayload, disabled }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!label.trim()) return toast.error("Please enter a label");
    setSaving(true);
    try {
      await api.post("/saved-scenarios", { ...scenarioPayload, label: label.trim() });
      toast.success("Scenario saved");
      setOpen(false);
      setLabel("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="save-scenario-open" disabled={disabled} variant="outline" size="sm"
                className="font-mono text-[11px] border-border/80">
          <Save className="w-3 h-3 mr-1.5" /> Save Scenario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-sm tracking-[0.16em] uppercase">Save Scenario</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            {scenarioPayload?.state_name || scenarioPayload?.state_code || "—"} · +{scenarioPayload?.warming_c ?? "?"}°C · {scenarioPayload?.horizon_years ?? "?"}y
          </div>
          <Input data-testid="save-scenario-label" placeholder="Label (e.g. Punjab heat 2045)"
                 value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} className="font-mono" />
        </div>
        <DialogFooter>
          <Button data-testid="save-scenario-confirm" onClick={onSave} disabled={saving}
                  className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)]">
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SavedScenariosButton({ onLoad, reloadKey }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadList = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/saved-scenarios");
      setItems(data);
    } catch (e) {
      toast.error("Failed to load saved scenarios");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open) loadList(); /* eslint-disable-next-line */ }, [open, reloadKey]);

  const onDelete = async (id) => {
    try {
      await api.delete(`/saved-scenarios/${id}`);
      setItems((m) => m.filter((s) => s.id !== id));
      toast.success("Deleted");
    } catch (e) { toast.error("Delete failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="saved-scenarios-open" variant="outline" size="sm"
                className="font-mono text-[11px] border-border/80">
          <FolderOpen className="w-3 h-3 mr-1.5" /> Saved Scenarios
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle className="text-sm tracking-[0.16em] uppercase">Saved Scenarios</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[55vh]">
          {loading ? (
            <div className="py-6 flex items-center justify-center text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> loading…</div>
          ) : !items.length ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No saved scenarios yet.</div>
          ) : (
            <div className="space-y-2">
              {items.map((s) => (
                <div key={s.id} data-testid="saved-scenario-row" className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-card/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{s.label}</div>
                    <div className="text-[11px] font-mono text-muted-foreground flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{s.state_name || s.state_code}</Badge>
                      <Badge variant="outline" className="text-[10px]">+{s.warming_c}°C</Badge>
                      <Badge variant="outline" className="text-[10px]">{s.horizon_years}y</Badge>
                      <span>· {s.created_at?.slice(0, 16).replace("T", " ")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button data-testid="saved-scenario-load" size="sm" variant="outline"
                            onClick={() => { onLoad?.(s); setOpen(false); }}
                            className="font-mono text-[11px]">Load</Button>
                    <Button data-testid="saved-scenario-delete" size="sm" variant="ghost"
                            onClick={() => onDelete(s.id)}
                            className="text-muted-foreground hover:text-[hsl(var(--state-critical))]">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
