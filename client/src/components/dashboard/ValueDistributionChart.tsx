import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp } from "lucide-react";

interface ValueDistributionData {
  small: { count: number; value: number }; // 0-1M
  medium: { count: number; value: number }; // 1-5M
  large: { count: number; value: number }; // 5-10M
  extraLarge: { count: number; value: number }; // 10M+
}

interface ValueDistributionChartProps {
  data: ValueDistributionData;
}

export default function ValueDistributionChart({ data }: ValueDistributionChartProps) {
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '$0';
    
    if (numAmount >= 1000000) {
      return `$${(numAmount / 1000000).toFixed(1)}M`;
    } else if (numAmount >= 1000) {
      return `$${(numAmount / 1000).toFixed(1)}K`;
    } else {
      return `$${numAmount.toFixed(0)}`;
    }
  };

  const chartData = [
    {
      name: '0-1M',
      range: 'Small',
      count: data.small.count,
      value: typeof data.small.value === 'string' ? parseFloat(data.small.value) : data.small.value,
      color: '#3b82f6'
    },
    {
      name: '1-5M',
      range: 'Medium',
      count: data.medium.count,
      value: typeof data.medium.value === 'string' ? parseFloat(data.medium.value) : data.medium.value,
      color: '#10b981'
    },
    {
      name: '5-10M',
      range: 'Large',
      count: data.large.count,
      value: typeof data.large.value === 'string' ? parseFloat(data.large.value) : data.large.value,
      color: '#f59e0b'
    },
    {
      name: '10M+',
      range: 'Extra Large',
      count: data.extraLarge.count,
      value: typeof data.extraLarge.value === 'string' ? parseFloat(data.extraLarge.value) : data.extraLarge.value,
      color: '#ef4444'
    }
  ];

  const totalCount = data.small.count + data.medium.count + data.large.count + data.extraLarge.count;
  const totalValue = (typeof data.small.value === 'string' ? parseFloat(data.small.value) : data.small.value) +
                    (typeof data.medium.value === 'string' ? parseFloat(data.medium.value) : data.medium.value) +
                    (typeof data.large.value === 'string' ? parseFloat(data.large.value) : data.large.value) +
                    (typeof data.extraLarge.value === 'string' ? parseFloat(data.extraLarge.value) : data.extraLarge.value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label} ({data.range})</p>
          <p className="text-sm text-muted-foreground">
            Count: {data.count} proposals
          </p>
          <p className="text-sm text-muted-foreground">
            Total Value: {formatCurrency(data.value)}
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
          <DollarSign className="h-5 w-5" />
          Value Distribution
        </CardTitle>
        <CardDescription>
          Investment proposals by value brackets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Value Distribution Details */}
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const percentage = totalCount > 0 ? (item.count / totalCount * 100).toFixed(1) : '0';
            
            return (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.range} - {percentage}% of proposals</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.count}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.value)}</p>
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