import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CustomerTable } from "@/components/CustomerTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GitBranch, Layers, Sparkles, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function formatLastUpdated(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString();
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [, setLocation] = useLocation();
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerNickname, setNewCustomerNickname] = useState('');
  const [newCustomerOpportunity, setNewCustomerOpportunity] = useState('');
  const [newCustomerSeName, setNewCustomerSeName] = useState('');
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const { toast } = useToast();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['/api/customers'],
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest('POST', '/api/customers', data);
      return response.json();
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setIsNewCustomerOpen(false);
      setNewCustomerName('');
      setNewCustomerNickname('');
      setNewCustomerOpportunity('');
      setNewCustomerSeName('');
      toast({
        title: "Customer Created",
        description: `${newCustomer.name} has been added successfully.`,
      });
      setLocation(`/customers/${newCustomer.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      });
      console.error('Error creating customer:', error);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest('PATCH', `/api/customers/${data.customerId}`, {
        [data.field]: data.newStatus
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = (customerId, field, newStatus) => {
    updateStatusMutation.mutate({ customerId, field, newStatus });
  };

  const customersForTable = customers.map(c => ({
    id: c.id,
    name: c.name,
    nickname: c.nickname || '',
    opportunity: c.opportunity,
    psar: c.psar,
    arb: c.arb,
    design: c.design,
    lastUpdated: formatLastUpdated(c.updatedAt),
  }));

  const filteredCustomers = customersForTable.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.opportunity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewCustomer = (id) => {
    setLocation(`/customers/${id}`);
  };

  const handleCreateCustomer = () => {
    if (!newCustomerName.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required.",
        variant: "destructive",
      });
      return;
    }
    if (!newCustomerSeName.trim()) {
      toast({
        title: "Validation Error",
        description: "SE name is required.",
        variant: "destructive",
      });
      return;
    }
    createCustomerMutation.mutate({
      name: newCustomerName.trim(),
      nickname: newCustomerNickname.trim(),
      opportunity: newCustomerOpportunity.trim(),
      seName: newCustomerSeName.trim(),
    });
  };

  const totalCustomers = customersForTable.length;
  const psarCompleted = customersForTable.filter(c => c.psar === 'submitted' || c.psar === 'not-relevant').length;
  const psarRate = totalCustomers > 0 ? Math.round((psarCompleted / totalCustomers) * 100) : 0;
  const arbCompleted = customersForTable.filter(c => c.arb === 'submitted' || c.arb === 'not-relevant').length;
  const arbRate = totalCustomers > 0 ? Math.round((arbCompleted / totalCustomers) * 100) : 0;
  const designCompleted = customersForTable.filter(c => c.design === 'reviewed' || c.design === 'not-relevant').length;
  const designRate = totalCustomers > 0 ? Math.round((designCompleted / totalCustomers) * 100) : 0;

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of customer discovery and opportunities
          </p>
        </div>
        <Button 
          onClick={() => setIsNewCustomerOpen(true)}
          data-testid="button-new-customer"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Customer
        </Button>
      </div>

      <Collapsible open={isSubmissionsOpen} onOpenChange={setIsSubmissionsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle>Completion Progress</CardTitle>
                {isSubmissionsOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-chart-1/10 p-3">
                  <Sparkles className="h-6 w-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Professional Services</h3>
                  <p className="text-sm text-muted-foreground">PSAR - Scoping and assessment planning</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${psarRate}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-orange-500">{psarRate}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-chart-2/10 p-3">
                  <GitBranch className="h-6 w-6 text-teal-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Architecture Review Board</h3>
                  <p className="text-sm text-muted-foreground">ARB - Technical architecture validation</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${arbRate}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-teal-500">{arbRate}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-chart-3/10 p-3">
                  <Layers className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Design</h3>
                  <p className="text-sm text-muted-foreground">Design - Solution architecture and planning</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-muted-foreground transition-all duration-300" style={{ width: `${designRate}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{designRate}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{totalCustomers} Total Customers</span>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Customers</CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-customers"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? 'No customers match your search.' : 'No customers yet. Click "New Customer" to add one.'}
              </p>
            </div>
          ) : (
            <CustomerTable 
              customers={filteredCustomers} 
              onViewCustomer={handleViewCustomer}
              onUpdateStatus={handleUpdateStatus}
              isUpdatingStatus={updateStatusMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer profile to start the discovery process.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="se-name">SE Name *</Label>
              <Input
                id="se-name"
                placeholder="Enter SE name..."
                value={newCustomerSeName}
                onChange={(e) => setNewCustomerSeName(e.target.value)}
                data-testid="input-se-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input
                id="customer-name"
                placeholder="Enter customer name..."
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                data-testid="input-customer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-nickname">Nickname</Label>
              <Input
                id="customer-nickname"
                placeholder="Enter nickname (optional)..."
                value={newCustomerNickname}
                onChange={(e) => setNewCustomerNickname(e.target.value)}
                data-testid="input-customer-nickname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-opportunity">Opportunity</Label>
              <Input
                id="customer-opportunity"
                placeholder="e.g., PSAR Review, Full Assessment..."
                value={newCustomerOpportunity}
                onChange={(e) => setNewCustomerOpportunity(e.target.value)}
                data-testid="input-customer-opportunity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsNewCustomerOpen(false)}
              data-testid="button-cancel-new-customer"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCustomer}
              disabled={createCustomerMutation.isPending}
              data-testid="button-save-new-customer"
            >
              {createCustomerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Customer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
