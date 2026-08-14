import { useState, useMemo } from "react";
import { AdCampaignData } from "../../lib/csvLoader";
import { computeDailyMetrics } from "../../lib/metrics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { CHART_COLORS } from "../../lib/constants";
import { CSVLink } from "react-csv";

type MetricOption = "Spend" | "Clicks" | "Conversions" | "ROI";

export function TrendsTab({ data }: { data: AdCampaignData[] }) {
  const [selectedMetric, setSelectedMetric] = useState<MetricOption>("Spend");

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

  const metricKeyMap: Record<MetricOption, keyof typeof dailyData[0]> = {
    Spend: "spend",
    Clicks: "clicks",
    Conversions: "conversions",
    ROI: "roi",
  };

  const dataKey = metricKeyMap[selectedMetric];

  const formatValue = (val: number, metric: MetricOption) => {
    if (metric === "Spend") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(val);
    } else if (metric === "ROI") {
      return val.toFixed(2);
    } else {
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-popover border border-border shadow-md rounded-md p-3 text-sm">
        <p className="font-semibold mb-2">{format(new Date(label), "MMM d, yyyy")}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: payload[0].color }} />
          <span className="text-muted-foreground">{selectedMetric}:</span>
          <span className="font-semibold text-foreground">
            {formatValue(payload[0].value, selectedMetric)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Trend Over Time</CardTitle>
          <div className="flex items-center gap-3">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as MetricOption)}
              className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="Spend">Spend</option>
              <option value="Clicks">Clicks</option>
              <option value="Conversions">Conversions</option>
              <option value="ROI">Avg ROI</option>
            </select>
            <CSVLink
              data={dailyData}
              filename={`trend-${selectedMetric.toLowerCase()}.csv`}
              className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:opacity-80 bg-secondary text-secondary-foreground"
              title="Export to CSV"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </CSVLink>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%" debounce={0}>
              <LineChart data={dailyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
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
                  tickFormatter={(val) => {
                    if (selectedMetric === "Spend") return "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(val);
                    if (selectedMetric === "ROI") return val.toFixed(1);
                    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(val);
                  }} 
                  tick={{ fontSize: 12, fill: tickColor }} 
                  stroke={tickColor} 
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: tickColor, strokeDasharray: '3 3' }} />
                <Line 
                  type="monotone" 
                  dataKey={dataKey} 
                  name={selectedMetric} 
                  stroke={CHART_COLORS.blue} 
                  strokeWidth={3} 
                  dot={false} 
                  activeDot={{ r: 6, fill: CHART_COLORS.blue, stroke: 'var(--background)', strokeWidth: 3 }} 
                  isAnimationActive={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
