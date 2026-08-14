import { AggregateMetrics } from "../lib/metrics";
import { Card, CardContent } from "@/components/ui/card";

interface KPICardsProps {
  metrics: AggregateMetrics;
  isLoading?: boolean;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(val);
}

function formatPercent(val: number) {
  return new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val / 100);
}

function formatNumber(val: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);
}

export function KPICards({ metrics, isLoading }: KPICardsProps) {
  const cards = [
    { title: "Total Spend", value: formatCurrency(metrics.totalSpend) },
    { title: "Total Conversions", value: formatNumber(metrics.totalConversions) },
    { title: "Avg CTR", value: formatPercent(metrics.avgCtr) },
    { title: "Avg CPC", value: formatCurrency(metrics.avgCpc) },
    { title: "Avg ROI", value: metrics.avgRoi.toFixed(2) + "%" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-5">
            <p className="text-[13px] font-medium text-muted-foreground">{card.title}</p>
            {isLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded mt-1.5 w-1/2" />
            ) : (
              <p className="text-2xl font-bold mt-1 tracking-tight" style={{ color: "hsl(var(--primary))" }}>
                {card.value}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
