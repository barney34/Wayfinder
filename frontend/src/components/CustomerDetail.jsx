import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  "not-submitted": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "submitted": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "not-started": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "started": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "reviewed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "not-relevant": "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
};

const psarArbLabels = {
  "not-submitted": "Not Submitted",
  "submitted": "Submitted",
  "not-relevant": "N/A",
  "not-started": "Not Submitted",
};

const designLabels = {
  "not-started": "Not Started",
  "started": "Started",
  "reviewed": "Reviewed w/ Customer",
  "not-relevant": "N/A",
};

export function CustomerDetail({ customer, onBack }) {
  return (
    <div className="space-y-6" data-testid="customer-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.opportunity || 'No opportunity set'}
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          Last updated: {customer.lastUpdated}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PSAR Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[customer.psar]}>
              {psarArbLabels[customer.psar] || customer.psar}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ARB Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[customer.arb]}>
              {psarArbLabels[customer.arb] || customer.arb}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Design Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[customer.design]}>
              {designLabels[customer.design] || customer.design}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Discovery</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Discovery questionnaire and assessment tools coming soon. This will include:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• IPAM, DNS, and DHCP discovery questions</li>
            <li>• AI-powered meeting notes analysis</li>
            <li>• Token calculator for security configurations</li>
            <li>• Site configuration and grid sizing tools</li>
            <li>• Export and import functionality</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
