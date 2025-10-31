import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendType = 'neutral',
  color = 'primary' 
}: StatsCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'bg-green-100 text-green-600';
      case 'warning':
        return 'bg-orange-100 text-orange-600';
      case 'destructive':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  };

  const getTrendClasses = () => {
    switch (trendType) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="hover-lift transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses()}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {trend && (
          <div className="mt-4">
            <span className={`text-sm ${getTrendClasses()}`}>
              {trend}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
