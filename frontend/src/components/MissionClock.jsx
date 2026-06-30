import { useEffect, useState } from "react";

export function MissionClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  const fmt = (d) => d.toISOString().slice(11, 19);
  return (
    <div className="font-mono text-[11px] tracking-wider flex items-center gap-3 text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] pulse-dot" />
        <span className="text-foreground/80">LIVE</span>
      </div>
      <div><span className="opacity-60">UTC</span> <span className="text-foreground">{fmt(now)}</span></div>
      <div><span className="opacity-60">IST</span> <span className="text-foreground">{fmt(ist)}</span></div>
    </div>
  );
}
