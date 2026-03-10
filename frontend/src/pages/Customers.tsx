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
import { Plus, Search, Loader2, ChevronDown, ChevronRight, X, Pencil, Check, X as XIcon, Megaphone } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WhatsNew } from "@/components/WhatsNew";
import type { Customer } from "@/types";

function formatLastUpdated(date: string | Date): string {
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
  const [location, setLocation] = useLocation();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerNickname, setNewCustomerNickname] = useState('');
  const [newCustomerOpportunity, setNewCustomerOpportunity] = useState('');
  const [newCustomerSeName, setNewCustomerSeName] = useState('');
  const [newlyCreatedCustomer, setNewlyCreatedCustomer] = useState<Customer | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [customerToClone, setCustomerToClone] = useState<Customer | null>(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set(['__all__'])); // Start with all expanded
  const [cloneName, setCloneName] = useState('');
  const [cloneOpportunity, setCloneOpportunity] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editOpportunity, setEditOpportunity] = useState('');

  const [renamingSeGroup, setRenamingSeGroup] = useState<string | null>(null);
  const [renameSeValue, setRenameSeValue] = useState('');
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  // Auto-open new customer dialog when navigated here with ?new=1
  // location in deps ensures this re-runs when already-mounted component gets new route
  useEffect(() => {
    if (window.location.search.includes('new=1')) {
      setSelectedCustomer(null); // exit CustomerDetail so dialog is visible
      setIsNewCustomerOpen(true);
      window.history.replaceState({}, '', '/customers');
    }
  }, [location]);
  
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; nickname: string; opportunity: string }) => {
      const response = await apiRequest('PATCH', `/api/customers/${data.id}`, {
        name: data.name,
        nickname: data.nickname,
        opportunity: data.opportunity,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setEditDialogOpen(false);
      setCustomerToEdit(null);
      toast({ title: 'Customer updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update customer.', variant: 'destructive' });
    },
  });

  const handleEditCustomer = (customer: any) => {
    setCustomerToEdit(customer);
    setEditName(customer.name || '');
    setEditNickname(customer.nickname || '');
    setEditOpportunity(customer.opportunity || '');
    setEditDialogOpen(true);
  };

  const renameSeMutation = useMutation({
    mutationFn: async (data: { oldName: string; newName: string }) => {
      const toUpdate = customers.filter(c => (c.seName || 'Unassigned') === data.oldName);
      await Promise.all(
        toUpdate.map(c => apiRequest('PATCH', `/api/customers/${c.id}`, { seName: data.newName }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setRenamingSeGroup(null);
      setRenameSeValue('');
      toast({ title: 'SE renamed', description: 'All customers updated.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to rename SE.', variant: 'destructive' });
    },
  });

  const startSeRename = (seName: string) => {
    setRenamingSeGroup(seName);
    setRenameSeValue(seName);
  };

  const saveSeRename = () => {
    if (!renamingSeGroup || !renameSeValue.trim()) return;
    if (renameSeValue.trim() === renamingSeGroup) { setRenamingSeGroup(null); return; }
    renameSeMutation.mutate({ oldName: renamingSeGroup, newName: renameSeValue.trim() });
  };

  const cancelSeRename = () => {
    setRenamingSeGroup(null);
    setRenameSeValue('');
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      toast({ title: 'Validation Error', description: 'Customer name is required.', variant: 'destructive' });
      return;
    }
    updateCustomerMutation.mutate({
      id: customerToEdit.id,
      name: editName.trim(),
      nickname: editNickname.trim(),
      opportunity: editOpportunity.trim(),
    });
  };

  const { toast } = useToast();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; nickname: string; opportunity: string; seName: string }) => {
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
      setNewlyCreatedCustomer(newCustomer as Customer);
      setSelectedCustomer(newCustomer as Customer);
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
    mutationFn: async (data: { customerId: string; field: string; newStatus: string }) => {
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

  const handleUpdateStatus = (customerId: string, field: string, newStatus: string) => {
    updateStatusMutation.mutate({ customerId, field, newStatus });
  };

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
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
    mutationFn: async (data: { sourceId: string; name: string; opportunity: string }) => {
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
    nickname: c.nickname || '',
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

  // Auto-expand all groups on first load
  useEffect(() => {
    if (filteredSeNames.length > 0 && expandedGroups.has('__all__')) {
      setExpandedGroups(new Set(filteredSeNames));
    }
  }, [filteredSeNames.length]);

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
      nickname: newCustomerNickname.trim(),
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
          setLocation('/');
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="customers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage customer profiles and assessments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showWhatsNew ? "default" : "outline"}
            size="sm"
            onClick={() => setShowWhatsNew(!showWhatsNew)}
          >
            <Megaphone className="mr-1.5 h-4 w-4" />
            What's New
          </Button>
          <ThemeToggle />
          <Button 
            onClick={() => setIsNewCustomerOpen(true)}
            data-testid="button-new-customer"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </Button>
        </div>
      </div>

      {showWhatsNew && (
        <WhatsNew />
      )}

      {/* Completion pills */}
      {customers.length > 0 && (() => {
        const isDone = (c: Customer, field: 'psar' | 'arb' | 'design') => {
          if (field === 'psar') return c.psar === 'submitted' || c.psar === 'approved' || c.psar === 'not-relevant';
          if (field === 'arb')  return c.arb  === 'submitted' || c.arb  === 'approved' || c.arb  === 'not-relevant';
          return c.design === 'reviewed' || c.design === 'complete' || c.design === 'not-relevant';
        };
        const pill = (label: string, done: number, total: number, color: string) => (
          <div key={label} className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-medium ${color}`}>
            <span>{label}</span>
            <span className="opacity-50">·</span>
            <span>{done}/{total}</span>
            <span className="opacity-50">·</span>
            <span>{Math.round((done/total)*100)}%</span>
          </div>
        );

        const total = customers.length;
        const seGroups = customers.reduce((acc, c) => {
          const se = c.seName || 'Unassigned';
          if (!acc[se]) acc[se] = [];
          acc[se].push(c);
          return acc;
        }, {} as Record<string, Customer[]>);
        const seNames = Object.keys(seGroups).sort((a, b) => {
          if (a === 'Unassigned') return 1;
          if (b === 'Unassigned') return -1;
          return a.localeCompare(b);
        });

        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground shrink-0">Portfolio</span>
            {pill('PSAR',   customers.filter(c => isDone(c,'psar')).length,   total, 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-400')}
            {pill('ARB',    customers.filter(c => isDone(c,'arb')).length,    total, 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-400')}
            {pill('Design', customers.filter(c => isDone(c,'design')).length, total, 'border-border bg-muted text-muted-foreground')}
          </div>
        );
      })()}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
            data-testid="input-search-customers"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
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
            const isRenamingThis = renamingSeGroup === seName;
            const seGroup = customers.filter(c => (c.seName || 'Unassigned') === seName);
            const isDone = (c: Customer, field: 'psar' | 'arb' | 'design') => {
              if (field === 'psar') return c.psar === 'submitted' || c.psar === 'approved' || c.psar === 'not-relevant';
              if (field === 'arb')  return c.arb  === 'submitted' || c.arb  === 'approved' || c.arb  === 'not-relevant';
              return c.design === 'reviewed' || c.design === 'complete' || c.design === 'not-relevant';
            };
            const sePill = (label: string, done: number, color: string) => (
              <div key={label} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${color}`}>
                <span>{label}</span>
                <span className="opacity-50">·</span>
                <span>{done}/{seGroup.length}</span>
              </div>
            );
            return (
              <Collapsible 
                key={seName} 
                open={isExpanded}
                onOpenChange={(open) => {
                  setExpandedGroups(prev => {
                    const next = new Set(prev);
                    if (open) next.add(seName); else next.delete(seName);
                    return next;
                  });
                }}
              >
                <div className="flex items-center w-full border-b">
                  <CollapsibleTrigger asChild>
                    <button
                      className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 shrink-0"
                      data-testid={`toggle-se-group-${index}`}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      {!isRenamingThis && <span className="text-lg font-semibold text-foreground">{seName}</span>}
                      {!isRenamingThis && <span className="text-sm text-muted-foreground">({customerCount})</span>}
                    </button>
                  </CollapsibleTrigger>

                  {isRenamingThis ? (
                    <div className="flex items-center gap-2 flex-1 px-2">
                      <Input
                        value={renameSeValue}
                        onChange={e => setRenameSeValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveSeRename(); if (e.key === 'Escape') cancelSeRename(); }}
                        className="h-7 text-sm w-48"
                        autoFocus
                      />
                      <button onClick={saveSeRename} disabled={renameSeMutation.isPending} className="p-1 rounded hover:bg-muted text-green-600">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={cancelSeRename} className="p-1 rounded hover:bg-muted text-muted-foreground">
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 px-2 flex-wrap">
                      {sePill('PSAR',   seGroup.filter(c => isDone(c,'psar')).length,   'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-400')}
                      {sePill('ARB',    seGroup.filter(c => isDone(c,'arb')).length,    'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-400')}
                      {sePill('Design', seGroup.filter(c => isDone(c,'design')).length, 'border-border bg-muted text-muted-foreground')}
                    </div>
                  )}

                  {!isRenamingThis && seName !== 'Unassigned' && (
                    <button
                      onClick={e => { e.stopPropagation(); startSeRename(seName); }}
                      className="p-2 mr-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Rename SE"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <CollapsibleContent>
                  <div className="pt-2">
                    <CustomerTable 
                      customers={filteredGroupedCustomers[seName]} 
                      onViewCustomer={(id) => setLocation(`/customers/${id}`)}
                      onExportCustomer={handleExportCustomer}
                      onDeleteCustomer={handleDeleteCustomer}
                      onCloneCustomer={handleCloneCustomer}
                      onEditCustomer={handleEditCustomer}
                      onUpdateStatus={handleUpdateStatus}
                      isUpdatingStatus={updateStatusMutation.isPending}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer details for {customerToEdit?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Customer Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter customer name..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nickname">Nickname</Label>
              <Input
                id="edit-nickname"
                placeholder="Short alias (optional)..."
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-opportunity">Opportunity</Label>
              <Input
                id="edit-opportunity"
                placeholder="e.g., PSAR Review, Full Assessment..."
                value={editOpportunity}
                onChange={(e) => setEditOpportunity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateCustomerMutation.isPending}>
              {updateCustomerMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                placeholder="Short alias (optional)..."
                value={newCustomerNickname}
                onChange={(e) => setNewCustomerNickname(e.target.value)}
                data-testid="input-customer-nickname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-opportunity">Opportunity</Label>
              <Input
                id="customer-opportunity"
                placeholder="e.g., DDI Replacement, DDI Overlay, Hybrid DDI..."
                value={newCustomerOpportunity}
                onChange={(e) => setNewCustomerOpportunity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomer()}
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
                placeholder="e.g., DDI Replacement, DDI Overlay, Hybrid DDI..."
                value={cloneOpportunity}
                onChange={(e) => setCloneOpportunity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmClone()}
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
