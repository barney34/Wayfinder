import { useState, useEffect, useRef } from "react";
import { 
  Building2, MapPin, Calculator, Target, Plus, Check, X, ChevronDown, ChevronUp, Info
} from "lucide-react";
import { useDiscovery } from "@/contexts/DiscoveryContext";

const formatKW = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return n.toString();
};

const TARGET_SOLUTIONS = [
  { key: 'feature-nios', label: 'NIOS', color: '#00BD4D' },
  { key: 'feature-uddi', label: 'UDDI', color: '#12C2D3' },
  { key: 'feature-security', label: 'Security', color: '#FF585D' },
  { key: 'feature-asset insights', label: 'Asset', color: '#7D97F8' },
];

export function TopBar({ customerName, opportunity, onNameChange, onOpportunityChange, onNameBlur, onOpportunityBlur }) {
  const {
    answers, setAnswer, dataCenters, sites, addDataCenter, addSite, deleteDataCenter, deleteSite,
    updateDataCenter, updateSite,
    drawings, activeDrawingId, getDrawingConfig, updateDrawingConfig,
  } = useDiscovery();
  const [collapsed, setCollapsed] = useState(false);
  const [dcName, setDcName] = useState('');
  const [dcKW, setDcKW] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteKW, setSiteKW] = useState('');
  const [pillWidth, setPillWidth] = useState(0);
  const pillRef = useRef(null);

  // Global KW from top bar field (single source of truth)
  const kw = parseInt(answers['ud-1']) || 0;
  const mult = parseFloat(answers['ipam-multiplier']) || 2.5;
  const activeIPs = Math.ceil(kw * mult);
  const totalKW = dataCenters.reduce((sum, dc) => sum + (dc.knowledgeWorkers || 0), 0) + sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0);

  // Per-drawing feature state (each drawing independent)
  const activeConfig = getDrawingConfig(activeDrawingId);
  const niosEnabled = activeConfig.featureNIOS ?? true;
  const uddiEnabled = activeConfig.featureUDDI ?? false;
  const securityEnabled = activeConfig.featureSecurity ?? false;
  const assetEnabled = answers['feature-asset insights'] === 'Yes'; // asset is still global

  const toggleFeature = (feature) => {
    const updates = {};
    if (feature === 'nios') {
      const newNIOS = !niosEnabled;
      updates.featureNIOS = newNIOS;
      updates.platformMode = newNIOS && uddiEnabled ? 'Hybrid' : newNIOS ? 'NIOS' : uddiEnabled ? 'UDDI' : 'NIOS';
    } else if (feature === 'uddi') {
      const newUDDI = !uddiEnabled;
      updates.featureUDDI = newUDDI;
      updates.platformMode = niosEnabled && newUDDI ? 'Hybrid' : newUDDI ? 'UDDI' : niosEnabled ? 'NIOS' : 'NIOS';
    } else if (feature === 'security') {
      updates.featureSecurity = !securityEnabled;
    }
    updateDrawingConfig(activeDrawingId, updates);
  };

  const isHybrid = niosEnabled && uddiEnabled;

  const cloudMgmtActive = answers['uddi-1'] === 'Yes' || answers['uddi-4'] === 'Yes';
  const prevCloudMgmt = useRef(cloudMgmtActive);
  useEffect(() => {
    if (cloudMgmtActive && !prevCloudMgmt.current && !uddiEnabled) {
      updateDrawingConfig(activeDrawingId, { featureUDDI: true, platformMode: niosEnabled ? 'Hybrid' : 'UDDI' });
    }
    prevCloudMgmt.current = cloudMgmtActive;
  }, [cloudMgmtActive, uddiEnabled, updateDrawingConfig, activeDrawingId, niosEnabled]);

  // Measure pill width for spacer alignment
  useEffect(() => {
    if (pillRef.current) {
      const width = pillRef.current.offsetWidth;
      setPillWidth(width);
    }
  }, [customerName, opportunity]);

  const handleAddDC = () => { if (!dcName.trim()) return; addDataCenter(dcName.trim(), parseInt(dcKW) || 0); setDcName(''); setDcKW(''); setTimeout(() => dcNameRef.current?.focus(), 0); };
  const handleAddSite = () => { if (!siteName.trim()) return; addSite(siteName.trim(), '', parseInt(siteKW) || 0); setSiteName(''); setSiteKW(''); setTimeout(() => siteNameRef.current?.focus(), 0); };

  const dcNameRef = useRef(null);
  const dcKWRef = useRef(null);
  const siteNameRef = useRef(null);
  const siteKWRef = useRef(null);

  const isNIOS = niosEnabled;
  const isUDDI = uddiEnabled;
  const isSecurity = securityEnabled;
  const isAsset = assetEnabled;

  const nameLen = Math.max((customerName || '').length, 6);
  const oppLen = Math.max((opportunity || '').length, 8);

  return (
    <div className="flex-shrink-0 bg-card border-b border-border" data-testid="topbar">
      {/* Header row with customer pill on left, summary items aligned with cards */}
      <div 
        className="px-4 py-1.5 flex items-center border-b border-border cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        {/* Customer Pill - Fixed width, not part of the grid alignment */}
        <div ref={pillRef} onClick={e => e.stopPropagation()} className="shrink-0 mr-4">
          <div className="flex flex-col gap-0 px-2.5 py-1 rounded-lg bg-secondary border border-border">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-muted-foreground uppercase tracking-wide shrink-0 font-medium">Customer:</span>
              <input
                value={customerName}
                onChange={e => onNameChange?.(e.target.value)}
                onBlur={() => onNameBlur?.()}
                onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                style={{ width: `${Math.min(Math.max(nameLen * 7.5 + 20, 60), 300)}px` }}
                className="text-xs font-semibold text-foreground bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground"
                placeholder="Name..."
                data-testid="topbar-customer-name"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-[#00594C] dark:text-[#FEDD00] uppercase tracking-wide shrink-0 font-medium">Opportunity:</span>
              <input
                value={opportunity || ''}
                onChange={e => onOpportunityChange?.(e.target.value)}
                onBlur={() => onOpportunityBlur?.()}
                onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                style={{ width: `${Math.min(Math.max(oppLen * 7 + 20, 60), 300)}px` }}
                className="text-[11px] text-[#00594C] dark:text-[#FEDD00] font-medium bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground"
                placeholder="Opportunity..."
                data-testid="topbar-opportunity"
              />
            </div>
          </div>
        </div>

        {/* Summary items - stacked and equally spaced */}
        <div className="flex-1 flex items-center justify-around">
          {/* DC / Sites stacked */}
          <div className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-[#00BD4D]" />
              <span className="text-[10px] font-semibold text-[#00BD4D]">DC</span>
              <span className="text-[11px] font-bold text-foreground">{dataCenters.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-foreground" />
              <span className="text-[10px] font-semibold text-[#00594C] dark:text-[#12C2D3]">Sites</span>
              <span className="text-[11px] font-bold text-foreground">{sites.length}</span>
            </div>
          </div>

          {/* TS stacked — shows active drawing's target solutions */}
          <div className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-foreground" />
              <span className="text-[10px] font-semibold text-[#00594C] dark:text-[#FEDD00]">Drawing #{drawings.find(d => d.id === activeDrawingId)?.name || '—'}</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {isNIOS && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#00BD4D]/20 text-[#00BD4D]">NIOS</span>}
              {isUDDI && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#12C2D3]/20 text-[#12C2D3]">UDDI</span>}
              {isSecurity && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#FF585D]/20 text-[#FF585D]">Sec</span>}
              {!isNIOS && !isUDDI && !isSecurity && <span className="text-[9px] text-muted-foreground">--</span>}
            </div>
          </div>

          {/* Drawing bubbles — each shows drawing name + member count + HA count */}
          <div className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-secondary/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Drawings</span>
            <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
              {drawings.map(d => {
                const cfg = getDrawingConfig(d.id);
                const isActive = d.id === activeDrawingId;
                // Member count: sum of all sites + dataCenters (shared across drawings)
                // HA is tracked in siteOverrides per drawing
                const drawingOverrides = cfg.siteOverrides || {};
                const haCount = Object.values(drawingOverrides).filter(o => o.haEnabled).length;
                const memberCount = dataCenters.length + sites.length;
                const label = haCount > 0 ? `${d.name} (${memberCount} +${haCount} HA)` : `${d.name} (${memberCount})`;
                return (
                  <span
                    key={d.id}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:bg-muted'
                    }`}
                    title={`Drawing #${d.name}: ${cfg.platformMode || 'NIOS'} mode`}
                  >
                    #{label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* KW / IPs stacked */}
          <div className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-1">
              <Calculator className="h-3 w-3 text-[#00BD4D]" />
              <span className="text-[10px] text-muted-foreground font-medium">KW</span>
              <span className="text-[11px] font-bold text-foreground">{formatKW(totalKW)}</span>
            </div>
            <span className="text-[11px] font-bold text-[#00BD4D]">{formatKW(activeIPs)} IPs</span>
          </div>
        </div>

        {/* Chevron - always visible on the right */}
        <div className="shrink-0 ml-2 p-1 rounded-lg bg-secondary border border-border">
          {collapsed ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronUp className="h-3 w-3 text-muted-foreground" />}
        </div>
      </div>

      {/* Input cards row */}
      {!collapsed && (
        <div className="px-4 py-3 grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(150px, 0.7fr) minmax(150px, 0.7fr)' }}>
          {/* Data Centers */}
          <div className="bg-card rounded-xl p-3 flex flex-col border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-3.5 w-3.5 text-[#00BD4D]" />
              <span className="text-xs font-semibold text-foreground">Data Centers</span>
            </div>
            {dataCenters.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {dataCenters.map((dc) => (
                  <div key={dc.id} className="flex items-center bg-secondary border border-border rounded-lg overflow-hidden">
                    <input value={dc.name} onChange={e => updateDataCenter(dc.id, { name: e.target.value })} className="flex-1 min-w-0 px-1.5 py-1 text-[11px] text-foreground bg-transparent border-0 focus:outline-none focus:bg-muted" />
                    <input type="number" value={dc.knowledgeWorkers || ''} onChange={e => updateDataCenter(dc.id, { knowledgeWorkers: e.target.value })} className="w-12 px-1 py-1 text-[11px] text-[#00BD4D] font-semibold bg-transparent border-0 focus:outline-none focus:bg-muted text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => deleteDataCenter(dc.id)} className="px-1 py-1 hover:bg-destructive/20 shrink-0" data-testid={`delete-dc-${dc.id}`}><X className="h-3 w-3 text-destructive" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5 mt-auto">
              <input ref={dcNameRef} value={dcName} onChange={e => setDcName(e.target.value)} placeholder="Name" className="flex-1 min-w-0 h-7 px-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                onKeyDown={e => { if (e.key === 'Enter' && dcName.trim()) { e.preventDefault(); dcKWRef.current?.focus(); dcKWRef.current?.select(); } }}
                data-testid="dc-name-input" />
              <input ref={dcKWRef} type="number" value={dcKW} onChange={e => setDcKW(e.target.value)} placeholder="KW" className="w-14 h-7 px-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDC(); } }}
                data-testid="dc-kw-input" />
              <button onClick={handleAddDC} disabled={!dcName.trim()} className="shrink-0 h-7 w-7 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-muted flex items-center justify-center text-white disabled:text-muted-foreground" data-testid="dc-add-btn"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Sites */}
          <div className="bg-card rounded-xl p-3 flex flex-col border border-border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-3.5 w-3.5 text-foreground" />
              <span className="text-xs font-semibold text-foreground">Sites</span>
            </div>
            {sites.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {sites.map((site) => (
                  <div key={site.id} className="flex items-center bg-secondary border border-border rounded-lg overflow-hidden">
                    <input value={site.name} onChange={e => updateSite(site.id, { name: e.target.value })} className="flex-1 min-w-0 px-1.5 py-1 text-[11px] text-foreground bg-transparent border-0 focus:outline-none focus:bg-muted" />
                    <input type="number" value={site.knowledgeWorkers || ''} onChange={e => updateSite(site.id, { knowledgeWorkers: e.target.value })} className="w-12 px-1 py-1 text-[11px] text-[#00594C] dark:text-[#12C2D3] font-semibold bg-transparent border-0 focus:outline-none focus:bg-muted text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => deleteSite(site.id)} className="px-1 py-1 hover:bg-destructive/20 shrink-0" data-testid={`delete-site-${site.id}`}><X className="h-3 w-3 text-destructive" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5 mt-auto">
              <input ref={siteNameRef} value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="Name" className="flex-1 min-w-0 h-7 px-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                onKeyDown={e => { if (e.key === 'Enter' && siteName.trim()) { e.preventDefault(); siteKWRef.current?.focus(); siteKWRef.current?.select(); } }}
                data-testid="site-name-input" />
              <input ref={siteKWRef} type="number" value={siteKW} onChange={e => setSiteKW(e.target.value)} placeholder="KW" className="w-14 h-7 px-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSite(); } }}
                data-testid="site-kw-input" />
              <button onClick={handleAddSite} disabled={!siteName.trim()} className="shrink-0 h-7 w-7 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-muted flex items-center justify-center text-white disabled:text-muted-foreground" data-testid="site-add-btn"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Target Solutions */}
          <div className="bg-card rounded-xl p-2.5 border border-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="h-3.5 w-3.5 text-foreground" />
              <span className="text-[11px] font-semibold text-foreground">Target Solutions</span>
            </div>
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => toggleFeature('nios')} className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${isNIOS ? 'bg-primary text-white border-primary' : 'bg-secondary text-secondary-foreground hover:bg-muted border-border'}`} data-testid="toggle-feature-nios">
                  NIOS
                  {isNIOS && isAsset && (<div className="relative group"><Info className="h-2.5 w-2.5" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-lg border border-border">+Mgmt Tokens Added</div></div>)}
                </button>
                <button onClick={() => toggleFeature('uddi')} className={`flex items-center justify-center px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${isUDDI ? 'bg-[#12C2D3] text-white border-[#12C2D3]' : 'bg-secondary text-secondary-foreground hover:bg-muted border-border'}`} data-testid="toggle-feature-uddi">UDDI</button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => toggleFeature('security')} className={`flex items-center justify-center px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${isSecurity ? 'bg-[#FF585D] text-white border-[#FF585D]' : 'bg-secondary text-secondary-foreground hover:bg-muted border-border'}`} data-testid="toggle-feature-security">Security</button>
                <button onClick={() => setAnswer('feature-asset insights', !isAsset ? 'Yes' : 'No')} className={`flex items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${isAsset ? 'bg-[#7D97F8] text-white border-[#7D97F8]' : 'bg-secondary text-secondary-foreground hover:bg-muted border-border'}`} data-testid="toggle-feature-asset">
                  Asset
                  {isAsset && isNIOS && (<div className="relative group"><Info className="h-2.5 w-2.5" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-lg border border-border">+Mgmt Tokens Added</div></div>)}
                </button>
              </div>
              <button onClick={() => {
                const newHybrid = !isHybrid;
                updateDrawingConfig(activeDrawingId, {
                  featureNIOS: newHybrid, featureUDDI: newHybrid,
                  platformMode: newHybrid ? 'Hybrid' : 'NIOS',
                });
              }} className={`w-full flex items-center justify-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${isHybrid ? 'bg-gradient-to-r from-[#00BD4D] to-[#00594C] dark:to-[#12C2D3] text-white shadow-md border-transparent' : 'bg-secondary text-secondary-foreground hover:bg-muted border-dashed border-border'}`} data-testid="toggle-hybrid">
                <span>Hybrid</span>{isHybrid && <Check className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Active IPs */}
          <div className="bg-card rounded-xl p-2.5 border border-border">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-[#00BD4D]" />
                <span className="text-[11px] font-semibold text-foreground">Active IPs</span>
              </div>
              <span className="text-base font-bold text-[#00BD4D]">{formatKW(activeIPs)}</span>
            </div>
            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-0.5 block">Knowledge Workers</label>
                <input type="number" value={answers['ud-1'] || ''} onChange={e => setAnswer('ud-1', e.target.value)} placeholder="0" className="w-full h-7 px-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" data-testid="kw-input" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-0.5 block">Multiplier</label>
                <div className="flex items-center gap-1">
                  <button onClick={() => { const c = parseFloat(answers['ipam-multiplier'] || '2.5'); setAnswer('ipam-multiplier', Math.max(0.5, c - 0.5).toString()); }} className="h-7 w-7 shrink-0 rounded-lg bg-secondary border border-border hover:bg-muted flex items-center justify-center text-foreground" data-testid="multiplier-down"><ChevronDown className="h-3.5 w-3.5" /></button>
                  <input type="number" step="0.5" value={answers['ipam-multiplier'] || '2.5'} onChange={e => setAnswer('ipam-multiplier', e.target.value)} className="flex-1 min-w-0 h-7 px-1 text-xs text-center rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" data-testid="multiplier-input" />
                  <button onClick={() => { const c = parseFloat(answers['ipam-multiplier'] || '2.5'); setAnswer('ipam-multiplier', (c + 0.5).toString()); }} className="h-7 w-7 shrink-0 rounded-lg bg-secondary border border-border hover:bg-muted flex items-center justify-center text-foreground" data-testid="multiplier-up"><ChevronUp className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium text-center pt-0.5">
                {formatKW(kw)} x {mult} = <span className="text-[#00BD4D] font-bold">{formatKW(activeIPs)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
