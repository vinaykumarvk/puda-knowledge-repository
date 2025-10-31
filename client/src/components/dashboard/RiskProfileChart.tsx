import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Shield, TrendingUp, AlertTriangle } from "lucide-react";

interface RiskProfileData {
  low: { count: number; value: number };
  medium: { count: number; value: number };
  high: { count: number; value: number };
}

interface RiskProfileChartProps {
  data: RiskProfileData;
}

export default function RiskProfileChart({ data }: RiskProfileChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const chartData = [
    {
      name: 'Low Risk',
      value: data.low.count,
      amount: data.low.value,
      color: '#10b981', // green
      icon: Shield
    },
    {
      name: 'Medium Risk',
      value: data.medium.count,
      amount: data.medium.value,
      color: '#f59e0b', // amber
      icon: TrendingUp
    },
    {
      name: 'High Risk',
      value: data.high.count,
      amount: data.high.value,
      color: '#ef4444', // red
      icon: AlertTriangle
    }
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  const totalCount = data.low.count + data.medium.count + data.high.count;
  const totalValue = data.low.value + data.medium.value + data.high.value;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Count: {data.value} proposals
          </p>
          <p className="text-sm text-muted-foreground">
            Value: {formatCurrency(data.amount)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Profile
        </CardTitle>
        <CardDescription>
          Distribution of proposals by risk level
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Level Details */}
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const Icon = item.icon;
            const percentage = totalCount > 0 ? (item.value / totalCount * 100).toFixed(1) : '0';
            
            return (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <Icon className="h-4 w-4" style={{ color: item.color }} />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{percentage}% of proposals</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.amount)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Proposals</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-lg font-semibold">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}