import { InvestmentForm } from "@/components/forms/InvestmentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewInvestment() {
  return (
    <div className="p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">New Investment Request</CardTitle>
        </CardHeader>
        <CardContent>
          <InvestmentForm />
        </CardContent>
      </Card>
    </div>
  );
}
