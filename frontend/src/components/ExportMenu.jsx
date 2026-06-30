import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * options: [{ label, endpoint, params, filenameBase }]
 * Each option triggers download by hitting the backend export endpoint with fmt=csv|json.
 */
export function ExportMenu({ options, dataTestId = "export-menu", label = "Export" }) {
  const download = async (opt, fmt) => {
    try {
      const url = opt.endpoint;
      const params = { ...(opt.params || {}), fmt };
      const res = await api.get(url, { params, responseType: "blob" });
      const blob = new Blob([res.data], { type: fmt === "csv" ? "text/csv" : "application/json" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      const fn = `${opt.filenameBase || "export"}.${fmt}`;
      link.setAttribute("download", fn);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Downloaded ${fn}`);
    } catch (e) {
      toast.error("Export failed");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-testid={dataTestId} variant="outline" size="sm" className="font-mono text-[11px] border-border/80">
          <Download className="w-3 h-3 mr-1.5" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        {options.map((opt, i) => (
          <div key={i}>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">{opt.label}</DropdownMenuLabel>
            <DropdownMenuItem data-testid={`${dataTestId}-${i}-csv`} onClick={() => download(opt, "csv")} className="font-mono text-xs">
              <Download className="w-3 h-3 mr-2" /> Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem data-testid={`${dataTestId}-${i}-json`} onClick={() => download(opt, "json")} className="font-mono text-xs">
              <Download className="w-3 h-3 mr-2" /> Download JSON
            </DropdownMenuItem>
            {i < options.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
