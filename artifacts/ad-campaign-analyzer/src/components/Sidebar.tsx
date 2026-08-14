import { FilterState } from "../hooks/useAdData";
import { Button } from "@/components/ui/button";
import { format, parse } from "date-fns";

interface SidebarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableChannels: string[];
  availableGoals: string[];
  availableSegments: string[];
  dateBounds: { min: Date; max: Date } | null;
  resetFilters: () => void;
  onFileUpload: (file: File) => void;
}

export function Sidebar({
  filters,
  setFilters,
  availableChannels,
  availableGoals,
  availableSegments,
  dateBounds,
  resetFilters,
  onFileUpload,
}: SidebarProps) {
  const handleDateChange = (type: "from" | "to", value: string) => {
    const d = value ? new Date(value) : undefined;
    if (d && !isNaN(d.getTime())) {
      // normalize timezone offset simply
      const [y, m, day] = value.split("-").map(Number);
      const localD = new Date(y, m - 1, day);
      setFilters((prev) => ({
        ...prev,
        dateRange: { ...prev.dateRange, [type]: localD },
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        dateRange: { ...prev.dateRange, [type]: undefined },
      }));
    }
  };

  const toggleArrayFilter = (key: keyof FilterState, val: string) => {
    setFilters((prev) => {
      const current = prev[key] as string[];
      if (current.includes(val)) {
        return { ...prev, [key]: current.filter((v) => v !== val) };
      } else {
        return { ...prev, [key]: [...current, val] };
      }
    });
  };

  const formatDateForInput = (d?: Date) => {
    if (!d) return "";
    return format(d, "yyyy-MM-dd");
  };

  return (
    <div className="w-[280px] shrink-0 border-r border-border bg-sidebar h-full flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="font-bold text-lg mb-1">Ad Analyzer</h2>
        <p className="text-xs text-muted-foreground mb-4">Performance Dashboard</p>
        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files?.[0]) onFileUpload(e.target.files[0]);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Button variant="outline" className="w-full justify-start text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Upload Custom CSV
          </Button>
        </div>
      </div>

      <div className="p-4 flex-1 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-sidebar-foreground">Date Range</h3>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <input
                type="date"
                value={formatDateForInput(filters.dateRange.from)}
                min={formatDateForInput(dateBounds?.min)}
                max={formatDateForInput(filters.dateRange.to || dateBounds?.max)}
                onChange={(e) => handleDateChange("from", e.target.value)}
                className="w-full flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <input
                type="date"
                value={formatDateForInput(filters.dateRange.to)}
                min={formatDateForInput(filters.dateRange.from || dateBounds?.min)}
                max={formatDateForInput(dateBounds?.max)}
                onChange={(e) => handleDateChange("to", e.target.value)}
                className="w-full flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Platform (Channel)</h3>
          <div className="space-y-1">
            {availableChannels.map((ch) => (
              <label key={ch} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.channels.includes(ch)}
                  onChange={() => toggleArrayFilter("channels", ch)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span className="truncate">{ch}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Campaign Goal</h3>
          <div className="space-y-1">
            {availableGoals.map((go) => (
              <label key={go} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.goals.includes(go)}
                  onChange={() => toggleArrayFilter("goals", go)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span className="truncate">{go}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Customer Segment</h3>
          <div className="space-y-1">
            {availableSegments.map((seg) => (
              <label key={seg} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.segments.includes(seg)}
                  onChange={() => toggleArrayFilter("segments", seg)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span className="truncate">{seg}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border mt-auto">
        <Button variant="secondary" className="w-full text-xs h-8" onClick={resetFilters}>
          Reset All Filters
        </Button>
      </div>
    </div>
  );
}
