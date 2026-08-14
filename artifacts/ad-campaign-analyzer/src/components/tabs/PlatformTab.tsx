import { useMemo } from "react";
import { AdCampaignData } from "../../lib/csvLoader";
import { computePlatformMetrics } from "../../lib/metrics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { CHART_COLORS } from "../../lib/constants";
import { CSVLink } from "react-csv";

export function PlatformTab({ data }: { data: AdCampaignData[] }) {
  const platformMetrics = useMemo(() => computePlatformMetrics(data), [data]);

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
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((p: any, i: number) => {
          let valStr = p.value.toString();
          if (p.name === "Spend") {
            valStr = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(p.value);
          } else if (p.name === "Conversions") {
            valStr = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(p.value);
          } else if (p.name === "Avg ROI") {
            valStr = p.value.toFixed(2);
          }

          return (
            <div key={i} className="flex items-center justify-between gap-4 mt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="text-muted-foreground">{p.name}:</span>
              </div>
              <span className="font-semibold text-foreground">{valStr}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Platform Performance Comparison</CardTitle>
          <CSVLink
            data={platformMetrics}
            filename="platform-performance.csv"
            className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:opacity-80 bg-secondary text-secondary-foreground"
            title="Export to CSV"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </CSVLink>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%" debounce={0}>
              <BarChart data={platformMetrics} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis 
                  dataKey="platform" 
                  tick={{ fontSize: 12, fill: tickColor }} 
                  stroke={tickColor} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left" 
                  tickFormatter={(val) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(val)} 
                  tick={{ fontSize: 12, fill: tickColor }} 
                  stroke={tickColor} 
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tickFormatter={(val) => val.toFixed(1)} 
                  tick={{ fontSize: 12, fill: tickColor }} 
                  stroke={tickColor} 
                  axisLine={false}
                  tickLine={false}
                  dx={10}
                />
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="totalSpend" name="Spend" fill={CHART_COLORS.blue} fillOpacity={0.9} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar yAxisId="left" dataKey="totalConversions" name="Conversions" fill={CHART_COLORS.purple} fillOpacity={0.9} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar yAxisId="right" dataKey="avgRoi" name="Avg ROI" fill={CHART_COLORS.green} fillOpacity={0.9} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Platform Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-4 font-semibold text-muted-foreground">Channel</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Total Spend</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Total Clicks</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Total Conversions</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-right">CTR</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-right">CPC</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Avg ROI</th>
                </tr>
              </thead>
              <tbody>
                {platformMetrics.map((pm, i) => (
                  <tr key={pm.platform} className={`border-b border-border hover:bg-muted/50 ${i === platformMetrics.length - 1 ? 'border-0' : ''}`}>
                    <td className="py-3 px-4 font-medium">{pm.platform}</td>
                    <td className="py-3 px-4 text-right">${pm.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    <td className="py-3 px-4 text-right">{pm.totalClicks.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{pm.totalConversions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{pm.avgCtr.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right">${pm.avgCpc.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-medium" style={{ color: CHART_COLORS.green }}>{pm.avgRoi.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
