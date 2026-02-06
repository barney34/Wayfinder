import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CustomerTable } from "@/components/CustomerTable";
import { CustomerDetail } from "@/components/CustomerDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

export default function Customers() {
  const [match, params] = useRoute("/customers/:id");
  const [, setLocation] = useLocation();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerOpportunity, setNewCustomerOpportunity] = useState('');
  const [newCustomerSeName, setNewCustomerSeName] = useState('');
  const [newlyCreatedCustomer, setNewlyCreatedCustomer] = useState(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [customerToClone, setCustomerToClone] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [cloneName, setCloneName] = useState('');
  const [cloneOpportunity, setCloneOpportunity] = useState('');
  
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
      setNewCustomerOpportunity('');
      setNewCustomerSeName('');
      toast({
        title: "Customer Created",
        description: `${newCustomer.name} has been added successfully.`,
      });
      const customerForDetail = {
        id: newCustomer.id,
        name: newCustomer.name,
        opportunity: newCustomer.opportunity,
        seName: newCustomer.seName,
        psar: newCustomer.psar,
        arb: newCustomer.arb,
        design: newCustomer.design,
        lastUpdated: formatLastUpdated(newCustomer.updatedAt),
      };
      setNewlyCreatedCustomer(customerForDetail);
      setSelectedCustomer(newCustomer.id);
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

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id) => {
      await apiRequest('DELETE', `/api/customers/${id}`);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      if (customerToDelete) {
        localStorage.removeItem(`discovery-${customerToDelete.id}`);
      }
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      toast({
        title: "Customer Deleted",
        description: "Customer has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
      console.error('Error deleting customer:', error);
    },
  });
  
  const cloneCustomerMutation = useMutation({
    mutationFn: async (data) => {
      const sourceCustomer = customers.find(c => c.id === data.sourceId);
      const response = await apiRequest('POST', '/api/customers', {
        name: data.name,
        opportunity: data.opportunity,
        seName: sourceCustomer?.seName || '',
      });
      return { newCustomer: await response.json(), sourceId: data.sourceId };
    },
    onSuccess: ({ newCustomer, sourceId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      const sourceData = localStorage.getItem(`discovery-${sourceId}`);
      if (sourceData) {
        localStorage.setItem(`discovery-${newCustomer.id}`, sourceData);
      }
      
      setCloneDialogOpen(false);
      setCustomerToClone(null);
      setCloneName('');
      setCloneOpportunity('');
      toast({
        title: "Customer Cloned",
        description: `${newCustomer.name} has been created from the clone.`,
      });
      setLocation(`/customers/${newCustomer.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clone customer. Please try again.",
        variant: "destructive",
      });
      console.error('Error cloning customer:', error);
    },
  });

  useEffect(() => {
    if (match && params?.id) {
      setSelectedCustomer(params.id);
    } else {
      setNewlyCreatedCustomer(null);
    }
  }, [match, params]);

  const customersForTable = customers.map(c => ({
    id: c.id,
    name: c.name,
    opportunity: c.opportunity,
    seName: c.seName || '',
    psar: c.psar,
    arb: c.arb,
    design: c.design,
    lastUpdated: formatLastUpdated(c.updatedAt),
  }));
  
  const groupedCustomers = customersForTable.reduce((acc, customer) => {
    const seName = customer.seName || 'Unassigned';
    if (!acc[seName]) {
      acc[seName] = [];
    }
    acc[seName].push(customer);
    return acc;
  }, {});
  
  const seNames = Object.keys(groupedCustomers).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  const filteredCustomers = customersForTable.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.opportunity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.seName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredGroupedCustomers = filteredCustomers.reduce((acc, customer) => {
    const seName = customer.seName || 'Unassigned';
    if (!acc[seName]) {
      acc[seName] = [];
    }
    acc[seName].push(customer);
    return acc;
  }, {});
  
  const filteredSeNames = Object.keys(filteredGroupedCustomers).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  const selectedCustomerData = selectedCustomer 
    ? (newlyCreatedCustomer?.id === selectedCustomer 
        ? newlyCreatedCustomer 
        : customersForTable.find(c => c.id === selectedCustomer))
    : null;

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
      opportunity: newCustomerOpportunity.trim(),
      seName: newCustomerSeName.trim(),
    });
  };
  
  const handleDeleteCustomer = (customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };
  
  const handleCloneCustomer = (customer) => {
    setCustomerToClone(customer);
    setCloneName(`${customer.name} (Copy)`);
    setCloneOpportunity('');
    setCloneDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
    }
  };
  
  const confirmClone = () => {
    if (!cloneName.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required.",
        variant: "destructive",
      });
      return;
    }
    if (customerToClone) {
      cloneCustomerMutation.mutate({
        name: cloneName.trim(),
        opportunity: cloneOpportunity.trim(),
        sourceId: customerToClone.id,
      });
    }
  };

  const handleExportCustomer = (customer) => {
    try {
      const storageKey = `discovery-${customer.id}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (!storedData) {
        toast({
          title: "No Data",
          description: `No discovery data found for ${customer.name}. Open the customer to enter data first.`,
          variant: "destructive",
        });
        return;
      }
      
      const data = JSON.parse(storedData);
      const exportData = {
        customer: customer.name,
        exportDate: new Date().toISOString(),
        meetingNotes: data.meetingNotes || '',
        discoveryAnswers: data.answers || {},
        discoveryNotes: data.notes || {},
        contextSummaries: data.contextFields || {},
        enabledSections: data.enabledSections || {},
        udsMembers: data.udsMembers || [],
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customer.name.replace(/\s+/g, '_')}_discovery_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: `Exported discovery data for ${customer.name}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export customer data.",
        variant: "destructive",
      });
    }
  };

  if (selectedCustomer && selectedCustomerData) {
    return (
      <CustomerDetail
        customer={selectedCustomerData}
        onBack={() => {
          setSelectedCustomer(null);
          setLocation('/customers');
        }}
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="customers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer profiles and assessments
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
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
        <div className="space-y-6">
          {filteredSeNames.map((seName, index) => {
            const isExpanded = expandedGroups.has(seName);
            const customerCount = filteredGroupedCustomers[seName].length;
            return (
              <Collapsible 
                key={seName} 
                open={isExpanded}
                onOpenChange={(open) => {
                  setExpandedGroups(prev => {
                    const next = new Set(prev);
                    if (open) {
                      next.add(seName);
                    } else {
                      next.delete(seName);
                    }
                    return next;
                  });
                }}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 border-b rounded-none"
                    data-testid={`toggle-se-group-${index}`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-lg font-semibold text-foreground">{seName}</span>
                    <span className="text-sm text-muted-foreground">({customerCount})</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-2">
                    <CustomerTable 
                      customers={filteredGroupedCustomers[seName]} 
                      onViewCustomer={(id) => setLocation(`/customers/${id}`)}
                      onExportCustomer={handleExportCustomer}
                      onDeleteCustomer={handleDeleteCustomer}
                      onCloneCustomer={handleCloneCustomer}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{customerToDelete?.name}"? This will permanently remove all customer data and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteCustomerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Customer</DialogTitle>
            <DialogDescription>
              Create a copy of "{customerToClone?.name}" with a new name and opportunity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">New Customer Name *</Label>
              <Input
                id="clone-name"
                placeholder="Enter new customer name..."
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                data-testid="input-clone-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clone-opportunity">New Opportunity</Label>
              <Input
                id="clone-opportunity"
                placeholder="e.g., PSAR Review, Full Assessment..."
                value={cloneOpportunity}
                onChange={(e) => setCloneOpportunity(e.target.value)}
                data-testid="input-clone-opportunity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCloneDialogOpen(false)}
              data-testid="button-cancel-clone"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmClone}
              disabled={cloneCustomerMutation.isPending}
              data-testid="button-confirm-clone"
            >
              {cloneCustomerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cloning...
                </>
              ) : (
                'Clone Customer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
