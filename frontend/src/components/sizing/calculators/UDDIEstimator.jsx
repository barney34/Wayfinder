import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { uddiServerTokens, nxvsServers, nxaasServers, uddiManagementTokenRates } from "@/lib/tokenData";
import { safeParseUDDI } from '../parsers';
import { defaultUDDIData } from '../constants';

export function UDDIEstimator({ value, onChange, questionId }) {
  const data = safeParseUDDI(value);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeIPs = Math.ceil((data.knowledgeWorkers || 0) * (data.devicesPerUser || 2.5));
  const dhcpClients = Math.ceil(activeIPs * ((data.dhcpPercent || 80) / 100));
  const staticClients = activeIPs - dhcpClients;
  const dnsRecsPerIP = data.dnsRecsPerIP || 2.0;
  const dnsRecsPerLease = data.dnsRecsPerLease || 3.0;
  const bufferOverhead = (data.bufferOverhead || 15) / 100;
  const ddiObjects = Math.ceil((staticClients * dnsRecsPerIP + dhcpClients * dnsRecsPerLease) * (1 + bufferOverhead));
  const discoveredAssets = Math.ceil(activeIPs * 0.05);

  const isNios = data.mode === 'nios';
  const rates = uddiManagementTokenRates;
  const ddiRate = isNios ? rates[0].nios : rates[0].native;
  const ipRate = isNios ? rates[1].nios : rates[1].native;
  const assetRate = isNios ? rates[2].nios : rates[2].native;
  const totalManagementTokens = Math.ceil(ddiObjects / ddiRate) + Math.ceil(activeIPs / ipRate) + Math.ceil(discoveredAssets / assetRate);

  const serverTokens = (data.servers || []).reduce((sum, s) => sum + (s.tokens * s.quantity), 0);
  const totalTokens = totalManagementTokens + serverTokens;
  const growthBuffer = data.growthBuffer || 20;
  const bufferedTotal = Math.ceil(totalTokens * (1 + growthBuffer / 100));

  const updateData = (updates) => onChange(JSON.stringify({ ...data, ...updates, ddiObjects, calculatedActiveIPs: activeIPs, discoveredAssets, totalManagementTokens }));

  const handleToggle = (checked) => {
    if (checked) { setIsExpanded(true); updateData({ enabled: true }); }
    else onChange(JSON.stringify({ ...defaultUDDIData }));
  };

  const addServer = () => {
    const newServer = { id: `${Date.now()}`, serverType: 'NXVS', serverSize: 'S', tokens: 470, quantity: 1 };
    updateData({ servers: [...(data.servers || []), newServer] });
  };

  const removeServer = (id) => updateData({ servers: (data.servers || []).filter(s => s.id !== id) });

  const updateServer = (id, updates) => {
    const servers = (data.servers || []).map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, ...updates };
      if (updates.serverType || updates.serverSize) {
        const match = uddiServerTokens.find(t => t.serverType === (updates.serverType || s.serverType) && t.serverSize === (updates.serverSize || s.serverSize));
        if (match) updated.tokens = match.tokens;
      }
      return updated;
    });
    updateData({ servers });
  };

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-md" data-testid={`uddi-estimator-${questionId}`}>
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="p-0 h-auto hover:bg-transparent">
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">UDDI Estimator</span>
        </Button>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">No</span>
          <Switch checked={data.enabled} onCheckedChange={handleToggle} data-testid={`uddi-toggle-${questionId}`} />
          <span className="text-xs text-muted-foreground">Yes</span>
        </div>
        {data.enabled && <span className="text-sm text-muted-foreground ml-auto">{bufferedTotal.toLocaleString()} total tokens</span>}
      </div>
      {isExpanded && data.enabled && (
        <div className="space-y-4 pl-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium min-w-[180px]">Mode</span>
            <Select value={data.mode} onValueChange={(v) => updateData({ mode: v })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="native">Native</SelectItem><SelectItem value="nios">NIOS</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium min-w-[180px]">Knowledge Workers</span>
            <Input type="number" min="0" value={data.knowledgeWorkers || ''} onChange={(e) => updateData({ knowledgeWorkers: parseInt(e.target.value) || 0 })} className="w-28" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium min-w-[180px]">Devices per User</span>
            <Input type="number" step="0.5" min="1" value={data.devicesPerUser || 2.5} onChange={(e) => updateData({ devicesPerUser: parseFloat(e.target.value) || 2.5 })} className="w-20" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium min-w-[180px]">DHCP %</span>
            <Input type="number" min="0" max="100" value={data.dhcpPercent || 80} onChange={(e) => updateData({ dhcpPercent: parseInt(e.target.value) || 80, staticPercent: 100 - (parseInt(e.target.value) || 80) })} className="w-20" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium min-w-[180px]">Growth Buffer %</span>
            <Input type="number" min="0" max="100" value={data.growthBuffer || 20} onChange={(e) => updateData({ growthBuffer: parseInt(e.target.value) || 20 })} className="w-20" />
          </div>
          <div className="border-t border-border pt-3 space-y-1">
            <div className="text-xs uppercase tracking-wider font-semibold text-foreground">Calculated Values</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Active IPs:</span> <span className="font-semibold">{activeIPs.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">DDI Objects:</span> <span className="font-semibold">{ddiObjects.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Disc. Assets:</span> <span className="font-semibold">{discoveredAssets.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Mgmt Tokens:</span> <span className="font-semibold">{totalManagementTokens.toLocaleString()}</span></div>
            </div>
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <div className="text-xs uppercase tracking-wider font-semibold text-foreground">Server Selections</div>
            {(data.servers || []).map((server, i) => (
              <div key={server.id} className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                <Select value={server.serverType} onValueChange={(v) => updateServer(server.id, { serverType: v })}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NXVS">NXVS</SelectItem><SelectItem value="NXaaS">NXaaS</SelectItem></SelectContent>
                </Select>
                <Select value={server.serverSize} onValueChange={(v) => updateServer(server.id, { serverSize: v })}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>{(server.serverType === 'NXVS' ? nxvsServers : nxaasServers).map(s => <SelectItem key={s.serverSize} value={s.serverSize}>{s.serverSize}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">x</span>
                <Input type="number" min="1" value={server.quantity} onChange={(e) => updateServer(server.id, { quantity: parseInt(e.target.value) || 1 })} className="w-16 h-8" />
                <span className="text-xs text-muted-foreground flex-1">({(server.tokens * server.quantity).toLocaleString()} tokens)</span>
                <Button size="icon" variant="ghost" onClick={() => removeServer(server.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addServer}><Plus className="h-4 w-4 mr-1" />Add Server</Button>
          </div>
        </div>
      )}
    </div>
  );
}
