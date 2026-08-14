import { useState, useMemo } from "react";
import { AdCampaignData } from "../../lib/csvLoader";
import { computeMetrics } from "../../lib/metrics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from "recharts";
import { CHART_COLORS } from "../../lib/constants";

export function CampaignTab({ data }: { data: AdCampaignData[] }) {
  const metrics = useMemo(() => computeMetrics(data), [data]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const isDark = document.documentElement.classList.contains("dark");
  const tickColor = isDark ? "#98999C" : "#71717a";

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-card text-muted-foreground">
        No data for selected filters &mdash; try adjusting your filters.
      </div>
    );
  }

  // Funnel data preparation
  const funnelData = useMemo(() => {
    const imp = metrics.totalImpressions;
    const clk = metrics.totalClicks;
    const conv = metrics.totalConversions;

    return [
      {
        step: "Impressions",
        value: imp,
        dropoff: "100%",
        color: CHART_COLORS.blue,
      },
      {
        step: "Clicks",
        value: clk,
        dropoff: imp > 0 ? ((clk / imp) * 100).toFixed(1) + "%" : "0%",
        color: CHART_COLORS.purple,
      },
      {
        step: "Conversions",
        value: conv,
        dropoff: clk > 0 ? ((conv / clk) * 100).toFixed(1) + "%" : "0%",
        color: CHART_COLORS.green,
      },
    ];
  }, [metrics]);

  const columns = useMemo<ColumnDef<AdCampaignData>[]>(() => [
    {
      accessorKey: "Campaign_ID",
      header: "Campaign ID",
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.Campaign_ID}</span>,
    },
    {
      accessorKey: "Company",
      header: "Company",
      cell: ({ row }) => <span className="font-medium">{row.original.Company}</span>,
    },
    {
      accessorKey: "Channel_Used",
      header: "Channel",
    },
    {
      accessorKey: "Campaign_Goal",
      header: "Goal",
    },
    {
      accessorKey: "Spend",
      header: "Spend",
      cell: ({ row }) => "$" + row.original.Spend.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    },
    {
      accessorKey: "Impressions",
      header: "Impressions",
      cell: ({ row }) => row.original.Impressions.toLocaleString(),
    },
    {
      accessorKey: "Clicks",
      header: "Clicks",
      cell: ({ row }) => row.original.Clicks.toLocaleString(),
    },
    {
      accessorKey: "Conversions",
      header: "Conversions",
      cell: ({ row }) => row.original.Conversions.toLocaleString(),
    },
    {
      accessorKey: "Conversion_Rate",
      header: "CTR / CVR",
      cell: ({ row }) => {
        const ctr = row.original.Impressions ? ((row.original.Clicks / row.original.Impressions) * 100).toFixed(1) + "%" : "0%";
        const cvr = (row.original.Conversion_Rate * 100).toFixed(1) + "%";
        return <div className="text-xs"><span className="text-muted-foreground block">CTR: {ctr}</span><span className="font-medium text-foreground">CVR: {cvr}</span></div>;
      },
    },
    {
      accessorKey: "ROI",
      header: "ROI",
      cell: ({ row }) => <span className={`font-semibold ${row.original.ROI >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{row.original.ROI.toFixed(1)}</span>,
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const cmp = String(row.getValue("Company")).toLowerCase();
      const cid = String(row.getValue("Campaign_ID")).toLowerCase();
      const fv = String(filterValue).toLowerCase();
      return cmp.includes(fv) || cid.includes(fv);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const FunnelTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border shadow-md rounded-md p-3 text-sm">
        <p className="font-semibold mb-2">{data.step}</p>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Count:</span>
          <span className="font-semibold text-foreground">{data.value.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4 mt-1">
          <span className="text-muted-foreground">Retained from prev step:</span>
          <span className="font-semibold text-foreground">{data.dropoff}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acquisition Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%" debounce={0}>
                <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 30, left: 90, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="step" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: tickColor, fontWeight: 500 }} />
                  <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} content={<FunnelTooltip />} isAnimationActive={false} />
                  <Bar dataKey="value" fill={CHART_COLORS.blue} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                    ))}
                    <LabelList 
                      dataKey="dropoff" 
                      position="right" 
                      formatter={(val: string) => val} 
                      style={{ fill: tickColor, fontSize: 12, fontWeight: 500 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Campaign Details</CardTitle>
              <input
                type="search"
                placeholder="Search ID or Company..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-8 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <div className="w-full overflow-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b border-border bg-muted/30">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            onClick={header.column.getToggleSortingHandler()}
                            className="py-2.5 px-3 font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <span className="text-[10px]">
                                {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? ""}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map((row, i) => (
                        <tr key={row.id} className={`border-b border-border hover:bg-muted/50 transition-colors ${i === table.getRowModel().rows.length - 1 ? "border-0" : ""}`}>
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="py-2 px-3 whitespace-nowrap">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                          No results found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-muted-foreground">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}{" "}
                of {table.getFilteredRowModel().rows.length} results
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => table.previousPage()} 
                  disabled={!table.getCanPreviousPage()}
                  className="h-8 px-3 text-xs border border-border rounded bg-transparent hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button 
                  onClick={() => table.nextPage()} 
                  disabled={!table.getCanNextPage()}
                  className="h-8 px-3 text-xs border border-border rounded bg-transparent hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
