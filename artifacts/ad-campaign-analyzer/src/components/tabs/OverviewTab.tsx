import { useMemo } from "react";
import { AdCampaignData } from "../../lib/csvLoader";
import { computeMetrics, computeDailyMetrics } from "../../lib/metrics";
import { KPICards } from "../KPICards";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from "recharts";
import { format } from "date-fns";
import { CHART_COLORS } from "../../lib/constants";
import { CSVLink } from "react-csv";

export function OverviewTab({ data }: { data: AdCampaignData[] }) {
  const metrics = useMemo(() => computeMetrics(data), [data]);
  const dailyData = useMemo(() => computeDailyMetrics(data), [data]);

  const isDark = document.documentElement.classList.contains("dark");
  const tickColor = isDark ? "#98999C" : "#71717a";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e5e5";

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-card text-muted-foreground">
        No data for selected filters &mdash; try adjusting your filters.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-popover border border-border shadow-md rounded-md p-3 text-sm">
        <p className="font-semibold mb-2">{format(new Date(label), "MMM d, yyyy")}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-semibold text-foreground">
              {p.name === "Spend"
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(p.value)
                : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const top5ByRoi = useMemo(
    () => [...data].sort((a, b) => b.ROI - a.ROI).slice(0, 5),
    [data]
  );

  return (
    <div className="space-y-4">
      <KPICards metrics={metrics} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Spend vs Conversions Over Time</CardTitle>
          <CSVLink
            data={dailyData}
            filename="spend-vs-conversions.csv"
            className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:opacity-80 bg-secondary text-secondary-foreground"
            title="Export to CSV"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </CSVLink>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%" debounce={0}>
              <ComposedChart data={dailyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis 
                  dataKey="dateStr" 
                  tickFormatter={(val) => format(new Date(val), "MMM d")} 
                  tick={{ fontSize: 12, fill: tickColor }} 
                  stroke={tickColor} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left" 
                  tickFormatter={(val) => "$" + val} 
                  tick={{ fontSize: 12, fill: tickColor }} 
                  stroke={tickColor} 
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tickFormatter={(val) => val.toLocaleString()} 
                  tick={{ fontSize: 12, fill: tickColor }} 
                  stroke={tickColor} 
                  axisLine={false}
                  tickLine={false}
                  dx={10}
                />
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', stroke: 'none' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                <Area yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke={CHART_COLORS.blue} strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="conversions" name="Conversions" stroke={CHART_COLORS.purple} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 5 Campaigns by ROI</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground font-medium px-5 py-2.5">Campaign ID</th>
                <th className="text-left text-muted-foreground font-medium px-5 py-2.5">Company</th>
                <th className="text-left text-muted-foreground font-medium px-5 py-2.5">Channel</th>
                <th className="text-left text-muted-foreground font-medium px-5 py-2.5">Goal</th>
                <th className="text-right text-muted-foreground font-medium px-5 py-2.5">ROI</th>
                <th className="text-right text-muted-foreground font-medium px-5 py-2.5">Spend</th>
                <th className="text-right text-muted-foreground font-medium px-5 py-2.5">Conversions</th>
              </tr>
            </thead>
            <tbody>
              {top5ByRoi.map((row, i) => (
                <tr key={row.Campaign_ID} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="px-5 py-2.5 font-medium text-foreground">{row.Campaign_ID}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{row.Company}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{row.Channel_Used}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{row.Campaign_Goal}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-blue-600">{row.ROI.toFixed(2)}%</td>
                  <td className="px-5 py-2.5 text-right text-muted-foreground">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(row.Spend)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-muted-foreground">{row.Conversions.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
