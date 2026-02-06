import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, Download, Copy, Trash2, Check, Info } from "lucide-react";

// Color mappings for different statuses
const statusColors = {
  "not-submitted": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "submitted": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "not-started": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "started": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "reviewed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "not-relevant": "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
  "completed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const psarArbLabels = {
  "not-submitted": "Not Submitted",
  "submitted": "Submitted",
  "not-relevant": "N/A",
  "not-started": "Not Submitted",
  "completed": "Submitted",
};

const designLabels = {
  "not-started": "Not Started",
  "started": "Started",
  "reviewed": "Reviewed w/ Customer",
  "not-relevant": "N/A",
};

function getNextPSARARBStatus(current) {
  if (current === 'not-started' || current === 'not-submitted') return 'submitted';
  if (current === 'completed' || current === 'submitted') return 'not-submitted';
  return 'not-submitted';
}

function getNextDesignStatus(current) {
  if (current === 'not-started') return 'started';
  if (current === 'started') return 'reviewed';
  if (current === 'reviewed') return 'not-started';
  return current;
}

function PSARARBStatusBadge({ status, onClick, isClickable, testId }) {
  const isNotRelevant = status === 'not-relevant';
  const label = psarArbLabels[status] || status;
  const colorClass = statusColors[status] || statusColors['not-submitted'];
  
  return (
    <div className="flex flex-col items-center gap-1">
      {isClickable && !isNotRelevant && (
        <span className="text-[10px] text-muted-foreground">Click to advance</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        disabled={isNotRelevant || !isClickable}
        className={isNotRelevant ? 'cursor-not-allowed opacity-60' : ''}
        data-testid={testId}
      >
        <Badge variant="secondary" className={colorClass}>
          {status === 'submitted' && <Check className="h-3 w-3 mr-1" />}
          {label}
        </Badge>
      </Button>
    </div>
  );
}

function DesignStatusBadge({ status, onClick, isClickable, testId }) {
  const isNotRelevant = status === 'not-relevant';
  const label = designLabels[status] || status;
  const colorClass = statusColors[status] || statusColors['not-started'];
  
  return (
    <div className="flex flex-col items-center gap-1">
      {isClickable && !isNotRelevant && (
        <span className="text-[10px] text-muted-foreground">Click to advance</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        disabled={isNotRelevant || !isClickable}
        className={isNotRelevant ? 'cursor-not-allowed opacity-60' : ''}
        data-testid={testId}
      >
        <Badge variant="secondary" className={colorClass}>
          {status === 'reviewed' && <Check className="h-3 w-3 mr-1" />}
          {label}
        </Badge>
      </Button>
    </div>
  );
}

function InfoTooltip({ title, description, testId }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center ml-1 text-muted-foreground" data-testid={testId}>
          <Info className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-semibold">{title}</p>
        <p className="text-xs">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function CustomerTable({ 
  customers, 
  onViewCustomer, 
  onExportCustomer, 
  onDeleteCustomer, 
  onCloneCustomer, 
  onUpdateStatus, 
  isUpdatingStatus 
}) {
  const handlePSARARBClick = (e, customerId, field, currentStatus) => {
    e.stopPropagation();
    if (onUpdateStatus && currentStatus !== 'not-relevant') {
      onUpdateStatus(customerId, field, getNextPSARARBStatus(currentStatus));
    }
  };

  const handleDesignClick = (e, customerId, currentStatus) => {
    e.stopPropagation();
    if (onUpdateStatus && currentStatus !== 'not-relevant') {
      onUpdateStatus(customerId, 'design', getNextDesignStatus(currentStatus));
    }
  };

  const isClickable = !!onUpdateStatus && !isUpdatingStatus;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Nickname</TableHead>
            <TableHead className="font-semibold">Opportunity</TableHead>
            <TableHead className="font-semibold text-center">
              <div className="flex items-center justify-center gap-1">
                PSAR
                <InfoTooltip title="PSAR" description="Professional Services Approval Request (SOW)" testId="icon-psar-info" />
              </div>
            </TableHead>
            <TableHead className="font-semibold text-center">
              <div className="flex items-center justify-center gap-1">
                ARB
                <InfoTooltip title="ARB" description="Architecture Review Board" testId="icon-arb-info" />
              </div>
            </TableHead>
            <TableHead className="font-semibold text-center">
              <div className="flex items-center justify-center gap-1">
                Design
                <InfoTooltip title="Design" description="LucidChart design for customer" testId="icon-design-info" />
              </div>
            </TableHead>
            <TableHead className="font-semibold">Last Updated</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer, index) => (
            <TableRow 
              key={customer.id}
              className={`hover:bg-muted/50 cursor-pointer ${index % 2 === 0 ? 'bg-muted/30' : ''}`}
              onClick={() => onViewCustomer(customer.id)}
              data-testid={`customer-row-${customer.id}`}
            >
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell className="text-muted-foreground">{customer.nickname || '-'}</TableCell>
              <TableCell className="text-muted-foreground">{customer.opportunity}</TableCell>
              <TableCell className="text-center">
                <PSARARBStatusBadge
                  status={customer.psar}
                  onClick={(e) => handlePSARARBClick(e, customer.id, 'psar', customer.psar)}
                  isClickable={isClickable}
                  testId={`psar-${customer.id}`}
                />
              </TableCell>
              <TableCell className="text-center">
                <PSARARBStatusBadge
                  status={customer.arb}
                  onClick={(e) => handlePSARARBClick(e, customer.id, 'arb', customer.arb)}
                  isClickable={isClickable}
                  testId={`arb-${customer.id}`}
                />
              </TableCell>
              <TableCell className="text-center">
                <DesignStatusBadge
                  status={customer.design}
                  onClick={(e) => handleDesignClick(e, customer.id, customer.design)}
                  isClickable={isClickable}
                  testId={`design-${customer.id}`}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">{customer.lastUpdated}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewCustomer(customer.id);
                    }}
                    data-testid={`button-view-${customer.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {onExportCustomer && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportCustomer(customer);
                      }}
                      data-testid={`button-export-${customer.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {onCloneCustomer && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloneCustomer({ id: customer.id, name: customer.name });
                      }}
                      data-testid={`button-clone-${customer.id}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  {onDeleteCustomer && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomer({ id: customer.id, name: customer.name });
                      }}
                      data-testid={`button-delete-${customer.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
