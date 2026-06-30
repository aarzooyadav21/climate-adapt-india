import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from "@/context/AppStateContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function StateSelector({ className }) {
  const { selectedState, setSelectedState } = useAppState();
  const [states, setStates] = useState([]);
  useEffect(() => {
    api.get("/climate/states").then((r) => setStates(r.data.states)).catch(() => {});
  }, []);
  return (
    <Select
      value={selectedState?.code}
      onValueChange={(code) => {
        const s = states.find((x) => x.code === code);
        if (s) setSelectedState({ code: s.code, name: s.name, lat: s.lat, lon: s.lon });
      }}
    >
      <SelectTrigger data-testid="state-selector" className={className || "w-[220px] font-mono text-xs"}>
        <SelectValue placeholder="Select state" />
      </SelectTrigger>
      <SelectContent className="max-h-[320px]">
        {states.map((s) => (
          <SelectItem key={s.code} value={s.code} className="font-mono text-xs">
            {s.name} <span className="text-muted-foreground ml-2">{s.code}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
