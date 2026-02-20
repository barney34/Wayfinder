import React, { useState, useMemo, useCallback } from "react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Trash2, Server, Copy, ChevronDown, ChevronRight, 
  Info, Building2, MapPin, Shield, Wifi, Database 
} from "lucide-react";
import { niosServerGuardrails, uddiServerTokens, niosFeatureImpacts } from "@/lib/tokenData";
import { hardwareSkuMapping } from "../constants";

// Platform options
const PLATFORM_OPTIONS = [
  { value: 'NIOS', label: 'NIOS Physical' },
  { value: 'NIOS-V', label: 'NIOS Virtual' },
  { value: 'NIOS-PHA', label: 'NIOS Physical HA' },
  { value: 'NIOS-VHA', label: 'NIOS Virtual HA' },
  { value: 'NXVS', label: 'NIOS-X VS' },
  { value: 'NXaaS', label: 'NXaaS' },
];

// Role options
const ROLE_OPTIONS = [
  { value: 'GM', label: 'Grid Master' },
  { value: 'GMC', label: 'Grid Master Candidate' },
  { value: 'DNS', label: 'DNS Only' },
  { value: 'DHCP', label: 'DHCP Only' },
  { value: 'DNS/DHCP', label: 'DNS + DHCP' },
  { value: 'REPORTING', label: 'Reporting' },
];

// Server size options for UDDI platforms
const UDDI_SIZE_OPTIONS = ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL'];

// NIOS model options
const NIOS_MODEL_OPTIONS = niosServerGuardrails.map(s => s.model);

// DNS Features
const DNS_FEATURES = niosFeatureImpacts.filter(f => f.role === 'DNS').map(f => ({
  code: f.featureCode,
  name: f.featureName,
  impact: f.impactPercent,
  default: f.defaultEnabled,
}));

// DHCP Features
const DHCP_FEATURES = niosFeatureImpacts.filter(f => f.role === 'DHCP').map(f => ({
  code: f.featureCode,
  name: f.featureName,
  impact: f.impactPercent,
  default: f.defaultEnabled,
}));

/**
 * UDSMembersTable Component
 * Manages grid members within sites - detailed server-level configuration
 */
export function UDSMembersTable() {
  const { 
    udsMembers, addUDSMember, updateUDSMember, deleteUDSMember,
    dataCenters, sites, answers 
  } = useDiscovery();
  
  const [expandedRows, setExpandedRows] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Get all locations (DCs + Sites)
  const locations = useMemo(() => {
    const locs = [];
    dataCenters.forEach(dc => {
      locs.push({ id: dc.id, name: dc.name, type: 'dc', icon: Building2 });
    });
    sites.forEach(site => {
      locs.push({ id: site.id, name: site.name, type: 'site', icon: MapPin });
    });
    return locs;
  }, [dataCenters, sites]);
  
  // Calculate tokens for a member
  const calculateMemberTokens = useCallback((member) => {
    if (member.platform === 'NXVS' || member.platform === 'NXaaS') {
      const server = uddiServerTokens.find(s => 
        s.serverType === member.platform && s.serverSize === member.serverSize
      );
      return server?.tokens || 0;
    } else {
      const server = niosServerGuardrails.find(s => s.model === member.model);
      return server?.tokens || 0;
    }
  }, []);
  
  // Members with calculated values
  const membersWithCalcs = useMemo(() => {
    return udsMembers.map(member => ({
      ...member,
      tokens: calculateMemberTokens(member),
      locationName: locations.find(l => l.id === member.locationId)?.name || 'Unassigned',
      locationType: locations.find(l => l.id === member.locationId)?.type || 'unknown',
    }));
  }, [udsMembers, calculateMemberTokens, locations]);
  
  // Totals
  const totals = useMemo(() => {
    return {
      count: membersWithCalcs.length,
      tokens: membersWithCalcs.reduce((sum, m) => sum + m.tokens, 0),
      gmCount: membersWithCalcs.filter(m => m.role === 'GM').length,
      gmcCount: membersWithCalcs.filter(m => m.role === 'GMC').length,
      dnsCount: membersWithCalcs.filter(m => m.role === 'DNS' || m.role === 'DNS/DHCP').length,
      dhcpCount: membersWithCalcs.filter(m => m.role === 'DHCP' || m.role === 'DNS/DHCP').length,
    };
  }, [membersWithCalcs]);
  
  // Add new member
  const handleAddMember = useCallback(() => {
    const newMember = {
      name: `Member-${udsMembers.length + 1}`,
      platform: 'NIOS',
      model: 'TE-926',
      serverSize: 'S',
      role: 'DNS/DHCP',
      locationId: locations[0]?.id || '',
      haEnabled: false,
      haPairId: null,
      dnsFeatures: DNS_FEATURES.filter(f => f.default).map(f => f.code),
      dhcpFeatures: DHCP_FEATURES.filter(f => f.default).map(f => f.code),
      ipAddress: '',
      vip: '',
      notes: '',
    };
    addUDSMember(newMember);
    setShowAddForm(false);
  }, [addUDSMember, udsMembers.length, locations]);
  
  // Duplicate member
  const handleDuplicateMember = useCallback((member) => {
    const newMember = {
      ...member,
      name: `${member.name}-copy`,
      id: undefined, // Will be assigned by addUDSMember
    };
    delete newMember.id;
    addUDSMember(newMember);
  }, [addUDSMember]);
  
  // Toggle row expansion
  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  // Toggle feature
  const toggleFeature = (memberId, featureCode, featureType) => {
    const member = udsMembers.find(m => m.id === memberId);
    if (!member) return;
    
    const featureKey = featureType === 'dns' ? 'dnsFeatures' : 'dhcpFeatures';
    const features = member[featureKey] || [];
    const newFeatures = features.includes(featureCode)
      ? features.filter(f => f !== featureCode)
      : [...features, featureCode];
    
    updateUDSMember(memberId, { [featureKey]: newFeatures });
  };
  
  // Get role badge color
  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'GM': return 'default';
      case 'GMC': return 'secondary';
      case 'DNS': return 'outline';
      case 'DHCP': return 'outline';
      case 'DNS/DHCP': return 'outline';
      case 'REPORTING': return 'secondary';
      default: return 'outline';
    }
  };
  
  return (
    <div className="space-y-4" data-testid="uds-members-table">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-blue-500/20">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Grid Members</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span><strong>{totals.count}</strong> Members</span>
                <span className="text-muted-foreground">|</span>
                <span><strong>{totals.tokens.toLocaleString()}</strong> Tokens</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totals.gmCount > 0 && <Badge variant="default" className="text-xs">{totals.gmCount} GM</Badge>}
              {totals.gmcCount > 0 && <Badge variant="secondary" className="text-xs">{totals.gmcCount} GMC</Badge>}
              {totals.dnsCount > 0 && <Badge variant="outline" className="text-xs">{totals.dnsCount} DNS</Badge>}
              {totals.dhcpCount > 0 && <Badge variant="outline" className="text-xs">{totals.dhcpCount} DHCP</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Members Table */}
      {membersWithCalcs.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Member Name</TableHead>
                <TableHead className="w-[120px]">Location</TableHead>
                <TableHead className="w-[100px]">Platform</TableHead>
                <TableHead className="w-[100px]">Model/Size</TableHead>
                <TableHead className="w-[100px]">Role</TableHead>
                <TableHead className="w-[60px]">HA</TableHead>
                <TableHead className="w-[80px] text-right">Tokens</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersWithCalcs.map(member => (
                <React.Fragment key={member.id}>
                  <TableRow 
                    className="hover:bg-muted/30"
                    data-testid={`member-row-${member.id}`}
                  >
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => toggleRow(member.id)}
                      >
                        {expandedRows[member.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={member.name}
                        onChange={e => updateUDSMember(member.id, { name: e.target.value })}
                        className="h-8 text-sm"
                        data-testid={`member-name-${member.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={member.locationId} 
                        onValueChange={v => updateUDSMember(member.id, { locationId: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>
                              <div className="flex items-center gap-1">
                                <loc.icon className="h-3 w-3" />
                                {loc.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={member.platform} 
                        onValueChange={v => updateUDSMember(member.id, { 
                          platform: v,
                          model: v === 'NXVS' || v === 'NXaaS' ? undefined : 'TE-926',
                          serverSize: v === 'NXVS' || v === 'NXaaS' ? 'S' : undefined,
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORM_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {member.platform === 'NXVS' || member.platform === 'NXaaS' ? (
                        <Select 
                          value={member.serverSize || 'S'} 
                          onValueChange={v => updateUDSMember(member.id, { serverSize: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UDDI_SIZE_OPTIONS.map(size => (
                              <SelectItem key={size} value={size}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select 
                          value={member.model || 'TE-926'} 
                          onValueChange={v => updateUDSMember(member.id, { model: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {NIOS_MODEL_OPTIONS.map(model => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={member.role} 
                        onValueChange={v => updateUDSMember(member.id, { role: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={member.haEnabled}
                        onCheckedChange={v => updateUDSMember(member.id, { haEnabled: v })}
                        data-testid={`member-ha-${member.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {member.tokens.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => handleDuplicateMember(member)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteUDSMember(member.id)}
                          data-testid={`member-delete-${member.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Row - Features */}
                  {expandedRows[member.id] && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={9} className="py-4">
                        <div className="grid grid-cols-2 gap-6 px-4">
                          {/* DNS Features */}
                          {(member.role === 'DNS' || member.role === 'DNS/DHCP' || member.role === 'GM' || member.role === 'GMC') && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wifi className="h-4 w-4 text-blue-500" />
                                DNS Features
                              </h4>
                              <div className="space-y-2">
                                {DNS_FEATURES.map(feature => (
                                  <div key={feature.code} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={(member.dnsFeatures || []).includes(feature.code)}
                                        onCheckedChange={() => toggleFeature(member.id, feature.code, 'dns')}
                                        id={`dns-${member.id}-${feature.code}`}
                                      />
                                      <label htmlFor={`dns-${member.id}-${feature.code}`} className="cursor-pointer">
                                        {feature.name}
                                      </label>
                                    </div>
                                    <Badge variant="outline" className="text-xs">-{feature.impact}%</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* DHCP Features */}
                          {(member.role === 'DHCP' || member.role === 'DNS/DHCP' || member.role === 'GM' || member.role === 'GMC') && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Database className="h-4 w-4 text-green-500" />
                                DHCP Features
                              </h4>
                              <div className="space-y-2">
                                {DHCP_FEATURES.map(feature => (
                                  <div key={feature.code} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={(member.dhcpFeatures || []).includes(feature.code)}
                                        onCheckedChange={() => toggleFeature(member.id, feature.code, 'dhcp')}
                                        id={`dhcp-${member.id}-${feature.code}`}
                                      />
                                      <label htmlFor={`dhcp-${member.id}-${feature.code}`} className="cursor-pointer">
                                        {feature.name}
                                      </label>
                                    </div>
                                    <Badge variant="outline" className="text-xs">-{feature.impact}%</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Additional Info */}
                          <div className="col-span-2 grid grid-cols-3 gap-4 pt-4 border-t">
                            <div>
                              <label className="text-xs text-muted-foreground">IP Address</label>
                              <Input
                                value={member.ipAddress || ''}
                                onChange={e => updateUDSMember(member.id, { ipAddress: e.target.value })}
                                placeholder="10.0.0.1"
                                className="h-8 text-sm mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">VIP (if HA)</label>
                              <Input
                                value={member.vip || ''}
                                onChange={e => updateUDSMember(member.id, { vip: e.target.value })}
                                placeholder="10.0.0.100"
                                className="h-8 text-sm mt-1"
                                disabled={!member.haEnabled}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Notes</label>
                              <Input
                                value={member.notes || ''}
                                onChange={e => updateUDSMember(member.id, { notes: e.target.value })}
                                placeholder="Additional notes..."
                                className="h-8 text-sm mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card className="bg-muted/20">
          <CardContent className="py-8 text-center">
            <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Grid Members</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add grid members to configure individual servers within your sites.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Add Member Button */}
      <div className="flex items-center justify-between">
        <Button 
          onClick={handleAddMember}
          data-testid="add-member-button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Grid Member
        </Button>
        
        {membersWithCalcs.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Total: <strong>{totals.tokens.toLocaleString()}</strong> tokens from {totals.count} members
          </div>
        )}
      </div>
      
      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Grid Member Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-xs text-muted-foreground space-y-1">
          <p>• <strong>GM (Grid Master)</strong>: Central management server. Only one per grid.</p>
          <p>• <strong>GMC (Grid Master Candidate)</strong>: Failover for GM. Recommended for HA.</p>
          <p>• <strong>DNS/DHCP Members</strong>: Protocol servers deployed at sites.</p>
          <p>• Feature toggles affect performance calculations (shown as % impact).</p>
          <p>• HA pairs require VIP configuration for failover.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default UDSMembersTable;
