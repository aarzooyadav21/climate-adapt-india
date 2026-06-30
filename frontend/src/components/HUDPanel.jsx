import { cn } from "@/lib/utils";

export function HUDPanel({ className, children, glow, scanlines, dataTestId, ...rest }) {
  return (
    <div
      data-testid={dataTestId}
      className={cn(
        "hud-panel relative overflow-hidden",
        glow === "cyan" && "hud-glow-cyan",
        glow === "amber" && "hud-glow-amber",
        scanlines && "scanlines",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function HUDHeader({ title, subtitle, right, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3", className)}>
      <div>
        <div className="text-xs font-semibold tracking-[0.18em] uppercase text-foreground/90">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function HUDBody({ className, children }) {
  return <div className={cn("px-4 py-4", className)}>{children}</div>;
}

export function HUDFooter({ className, children }) {
  return <div className={cn("px-4 py-3 border-t border-border/60 text-[11px] text-muted-foreground", className)}>{children}</div>;
}
