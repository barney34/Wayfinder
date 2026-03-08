import { useState, useEffect, useRef } from "react";
import { 
  Building2, MapPin, Calculator, Target, Plus, Check, X, ChevronDown, ChevronUp, Info
} from "lucide-react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import type { DrawingConfig } from "@/types";
import { SizingMathHelp } from "./SizingMathHelp";
import { getAssetTier } from "@/lib/tokenData";

const formatKW = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return n.toString();
};

export function TopBar({ customerName, nickname, opportunity, onNameChange, onNicknameChange, onOpportunityChange, onNameBlur, onNicknameBlur, onOpportunityBlur, onEditRequest }) {
  const {
    answers, setAnswer, dataCenters, sites, addDataCenter, addSite, deleteDataCenter, deleteSite,
    updateDataCenter, updateSite,
    drawings, activeDrawingId, getDrawingConfig, updateDrawingConfig,
    sizingSummary,
  } = useDiscovery();
  const [collapsed, setCollapsed] = useState(false);
  const [showSizingMath, setShowSizingMath] = useState(false);
  const [dcName, setDcName] = useState('');
  const [dcKW, setDcKW] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteKW, setSiteKW] = useState('');
  const [dcQuickCount, setDcQuickCount] = useState('');
  const [siteQuickCount, setSiteQuickCount] = useState('');

  // Global KW from top bar field (single source of truth)
  const kw = parseInt(answers['ud-1']) || 0;
  const mult = parseFloat(answers['ipam-multiplier']) || 2.5;
  const calcActiveIPs = Math.ceil(kw * mult);
  const activeIPs = parseInt(answers['active-ips-override']) || calcActiveIPs;

  // Per-drawing feature state (each drawing independent)
  const activeConfig = getDrawingConfig(activeDrawingId);
  const niosEnabled = activeConfig.featureNIOS ?? true;
  const uddiEnabled = activeConfig.featureUDDI ?? false;
  const securityEnabled = activeConfig.featureSecurity ?? false;
  const assetEnabled = answers['feature-asset insights'] === 'Yes'; // asset is still global

  // Strip platform-specific siteOverride fields so sites revert to new-mode defaults
  const _buildCleanedSiteOverrides = () => {
    const current = getDrawingConfig(activeDrawingId).siteOverrides || {};
    const cleaned = {};
    Object.keys(current).forEach(id => {
      const { platform: _p, modelOverride: _m, hardwareSku: _s, dhcpPartner: _dp, ...rest } = current[id] as any;
      cleaned[id] = rest;
    });
    return cleaned;
  };

  const toggleFeature = (feature: string) => {
    const updates: Partial<DrawingConfig> = {};
    if (feature === 'nios') {
      const newNIOS = !niosEnabled;
      updates.featureNIOS = newNIOS;
      updates.platformMode = newNIOS && uddiEnabled ? 'Hybrid' : newNIOS ? 'NIOS' : uddiEnabled ? 'UDDI' : 'NIOS';
      updates.dhcpAssociations = [];
      updates.siteOverrides = _buildCleanedSiteOverrides();
    } else if (feature === 'uddi') {
      const newUDDI = !uddiEnabled;
      updates.featureUDDI = newUDDI;
      updates.platformMode = niosEnabled && newUDDI ? 'Hybrid' : newUDDI ? 'UDDI' : niosEnabled ? 'NIOS' : 'NIOS';
      updates.dhcpAssociations = [];
      updates.siteOverrides = _buildCleanedSiteOverrides();
    } else if (feature === 'security') {
      const newSecurity = !securityEnabled;
      updates.featureSecurity = newSecurity;
      if (newSecurity) {
        // Auto-enable TD Cloud when Security is turned on
        try {
          const assetCfg = JSON.parse(answers['beta-asset-config'] || '{}');
          if (!assetCfg.tdCloudEnabled) {
            setAnswer('beta-asset-config', JSON.stringify({ ...assetCfg, tdCloudEnabled: true }));
          }
        } catch { /* ignore parse errors */ }
      }
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

  const handleAddDC = () => { if (!dcName.trim()) return; addDataCenter(dcName.trim(), parseInt(dcKW) || 0); setDcName(''); setDcKW(''); setTimeout(() => dcNameRef.current?.focus(), 0); };
  const handleAddSite = () => { if (!siteName.trim()) return; addSite(siteName.trim(), '', parseInt(siteKW) || 0); setSiteName(''); setSiteKW(''); setTimeout(() => siteNameRef.current?.focus(), 0); };
  const handleQuickAddDCs = () => {
    const n = parseInt(dcQuickCount);
    if (!n || n < 1) return;
    for (let i = 1; i <= n; i++) addDataCenter(`DC ${dataCenters.length + i}`, 0);
    setDcQuickCount('');
  };
  const handleQuickAddSites = () => {
    const n = parseInt(siteQuickCount);
    if (!n || n < 1) return;
    for (let i = 1; i <= n; i++) addSite(`Site ${sites.length + i}`, '', 0);
    setSiteQuickCount('');
  };

  const dcNameRef = useRef(null);
  const dcKWRef = useRef(null);
  const siteNameRef = useRef(null);
  const siteKWRef = useRef(null);

  const isNIOS = niosEnabled;
  const isUDDI = uddiEnabled;
  const isAsset = assetEnabled;

  // IPv6 / DNSSEC flags
  // hasIPv6: considering IPv6 AND confirmed it's in sizing (ipam-3 != 'No')
  const hasIPv6   = answers['ipam-2-toggle'] === 'Yes' && answers['ipam-3'] !== 'No';
  const hasDNSSEC = answers['edns-3'] === 'Yes';

  // Objects estimate (live, based on active IPs + DHCP %)
  // IPv4 NIOS:  dhcp×3 (A+DHCID+PTR)          + static×2 (A+PTR)
  // IPv4 UDDI:  dhcp×4 (A+2×DHCID+PTR)         + static×2
  // IPv6 adds:  dhcp+4 (AAAA+PTR6+DHCID6+lease6) + static+2 (AAAA+PTR6)
  // DNSSEC adds 4× DNS records (A/AAAA/PTR only, not leases/DHCID)
  const _dhcpPct = (parseInt(answers['dhcp-0-pct']) || 80) / 100;
  const _dhcp = Math.ceil(activeIPs * _dhcpPct);
  const _stat = activeIPs - _dhcp;
  const v6DhcpExtra = hasIPv6 ? 4 : 0;
  const v6StatExtra = hasIPv6 ? 2 : 0;
  // DNSSEC: uses external DNS records only (edns-5) — signing is for authoritative external zones
  const extDnsRecords = parseInt(answers['edns-5']) || 0;
  const dnssecExtra = hasDNSSEC && extDnsRecords > 0 ? extDnsRecords * 4 : 0;
  const niosObjects = activeIPs > 0 ? _dhcp * (3 + v6DhcpExtra) + _stat * (2 + v6StatExtra) + dnssecExtra : 0;
  const uddiObjects = activeIPs > 0 ? _dhcp * (4 + v6DhcpExtra) + _stat * (2 + v6StatExtra) + dnssecExtra : 0;
  // Per-type overrides — customer-provided object counts
  const effectiveNiosObjects = parseInt(answers['nios-objects-override']) || niosObjects;
  const effectiveUddiObjects = parseInt(answers['uddi-objects-override']) || uddiObjects;

  // Discovered assets — sourced from ni-discovered-source question
  const discoveredSource = answers['ni-discovered-source'] || '';
  const hasNativeAI = discoveredSource === 'Native Asset Insight' || discoveredSource === 'Both';
  const hasNIOSNI   = discoveredSource === 'NIOS Network Insight' || discoveredSource === 'Both';
  // NIOS Network Insight: SNMP/SSH device count from ni-3, fallback 5% of IPs
  const snmpSshCount = parseInt(answers['ni-3']) || 0;
  const niosDiscoveredAssets = hasNIOSNI ? (snmpSshCount > 0 ? snmpSshCount : Math.ceil(activeIPs * 0.05)) : 0;
  // Native Asset Insight: Active IPs with optional override
  const uddiDiscoveredOverride = parseInt(answers['ni-uddi-discovered-override']) || 0;
  const uddiDiscoveredAssets = hasNativeAI ? (uddiDiscoveredOverride > 0 ? uddiDiscoveredOverride : activeIPs) : 0;

  // NIOS MGMT — fires when NIOS NI is selected, or Hybrid, or no source set yet (Asset backward compat)
  // When a source IS explicitly set, only hasNIOSNI triggers NIOS MGMT — Native AI alone must NOT
  const showMgmtTokens = isHybrid || hasNIOSNI || (!discoveredSource && isNIOS && isAsset);
  const rawMgmtTokens = showMgmtTokens && kw > 0
    ? Math.ceil(effectiveNiosObjects / 50) + Math.ceil(activeIPs / 25) + Math.ceil(niosDiscoveredAssets / 13)
    : 0;

  // UDDI MGMT — fires when UDDI/Hybrid active OR Native AI selected
  const showUddiMgmt = isUDDI || isHybrid || hasNativeAI;
  const rawUddiMgmtTokens = showUddiMgmt && activeIPs > 0
    ? Math.ceil(effectiveUddiObjects / 25) + Math.ceil(activeIPs / 13) + Math.ceil(uddiDiscoveredAssets / 3)
    : 0;

  // Security tokens — calculated live from Tokens tab answers
  const _secTokens = (() => {
    try {
      const assetCfg = JSON.parse(answers['beta-asset-config'] || '{}');
      const tdCloud = (() => {
        if (!assetCfg.tdCloudEnabled) return 0;
        // Use stored totalAssets if available; otherwise compute from KW using tier defaults
        const stored = assetCfg.totalAssets || 0;
        const base = stored > 0 ? stored : (() => {
          const tier = getAssetTier(kw);
          return Math.round(kw * tier.assetsPerWorker);
        })();
        // Growth buffer always applied — default 15%, overridable
        const growthBufferPct = assetCfg.growthBufferOverride ? (assetCfg.growthBuffer ?? 0.15) : 0.15;
        const growthMultiplier = 1 + growthBufferPct;
        return Math.round(base * growthMultiplier) * 3;
      })();
      const tdNios = (() => { try { const d = JSON.parse(answers['beta-td-nios-section'] || '{}'); return d.enabled && Array.isArray(d.tokens) ? d.tokens.reduce((s, t) => s + (t.tokens || 0) * (t.quantity || 1), 0) : 0; } catch { return 0; } })();
      const dossier = (() => { try { const d = JSON.parse(answers['beta-dossier'] || '{}'); return d.enabled ? (d.quantity || 0) * 450 : 0; } catch { return 0; } })();
      const lookalike = (() => { try { const d = JSON.parse(answers['beta-lookalike'] || '{}'); return d.enabled ? (d.quantity || 0) * 1200 : 0; } catch { return 0; } })();
      const takedown = (() => { try { const d = JSON.parse(answers['beta-domain-takedown'] || '{}'); return d.enabled ? (d.quantity || 0) * 200 : 0; } catch { return 0; } })();
      const soc = (() => { try { const d = JSON.parse(answers['beta-soc-insights'] || '{}'); return d.enabled ? (d.calculatedTokens || 0) : 0; } catch { return 0; } })();
      return tdCloud + tdNios + dossier + lookalike + takedown + soc;
    } catch { return 0; }
  })();


  return (
    <div className="flex-shrink-0 bg-card border-b border-border" data-testid="topbar">
      {/* Toggle button — floats at top-right, always visible */}
      <div className="flex justify-end px-4 pt-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          data-testid="topbar-toggle"
        >
          {collapsed
            ? <><ChevronDown className="h-3 w-3" /><span>show inputs</span></>
            : <><ChevronUp className="h-3 w-3" /><span>hide</span></>}
        </button>
      </div>

      {/* Input cards row */}
      {!collapsed && (
        <div className="px-4 pb-3 grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(160px, 0.65fr) minmax(170px, 0.7fr) minmax(180px, 0.75fr)' }}>
          {/* Data Centers */}
          <div className="bg-card rounded-xl p-3 flex flex-col border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-3.5 w-3.5 text-[#00BD4D]" />
              <span className="text-xs font-semibold text-foreground">Data Centers</span>
              <div className="flex items-center gap-1 ml-auto">
                <input type="number" value={dcQuickCount} onChange={e => setDcQuickCount(e.target.value)} placeholder="#" className="w-10 h-5 px-1.5 text-[11px] rounded bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" onKeyDown={e => { if (e.key === 'Enter') handleQuickAddDCs(); }} />
                <button onClick={handleQuickAddDCs} disabled={!dcQuickCount} className="h-5 px-1.5 text-[10px] rounded bg-primary hover:bg-primary/90 disabled:bg-muted text-white disabled:text-muted-foreground shrink-0">Add</button>
              </div>
            </div>
            {dataCenters.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {dataCenters.map((dc) => (
                  <div key={dc.id} className="flex items-center bg-secondary border border-border rounded-lg overflow-hidden">
                    <input value={dc.name} onChange={e => updateDataCenter(dc.id, { name: e.target.value })} className="flex-1 min-w-0 px-1.5 py-1 text-[11px] text-foreground bg-transparent border-0 focus:outline-none focus:bg-muted" />
                    <input type="number" value={dc.knowledgeWorkers || ''} onChange={e => updateDataCenter(dc.id, { knowledgeWorkers: parseInt(e.target.value) || 0 })} className="w-12 px-1 py-1 text-[11px] text-[#00BD4D] font-semibold bg-transparent border-0 focus:outline-none focus:bg-muted text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
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
              <div className="flex items-center gap-1 ml-auto">
                <input type="number" value={siteQuickCount} onChange={e => setSiteQuickCount(e.target.value)} placeholder="#" className="w-10 h-5 px-1.5 text-[11px] rounded bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" onKeyDown={e => { if (e.key === 'Enter') handleQuickAddSites(); }} />
                <button onClick={handleQuickAddSites} disabled={!siteQuickCount} className="h-5 px-1.5 text-[10px] rounded bg-primary hover:bg-primary/90 disabled:bg-muted text-white disabled:text-muted-foreground shrink-0">Add</button>
              </div>
            </div>
            {sites.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {sites.map((site) => (
                  <div key={site.id} className="flex items-center bg-secondary border border-border rounded-lg overflow-hidden">
                    <input value={site.name} onChange={e => updateSite(site.id, { name: e.target.value })} className="flex-1 min-w-0 px-1.5 py-1 text-[11px] text-foreground bg-transparent border-0 focus:outline-none focus:bg-muted" />
                    <input type="number" value={site.knowledgeWorkers || ''} onChange={e => updateSite(site.id, { knowledgeWorkers: parseInt(e.target.value) || 0 })} className="w-12 px-1 py-1 text-[11px] text-[#00594C] dark:text-[#12C2D3] font-semibold bg-transparent border-0 focus:outline-none focus:bg-muted text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
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

          {/* Inputs — KW + Dev/User + Active IPs + Objects */}
          <div className="bg-card rounded-xl p-2.5 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-[#00BD4D]" />
                <span className="text-[11px] font-semibold text-foreground">Inputs</span>
              </div>
              <span className="text-sm font-bold text-[#00BD4D]">{formatKW(activeIPs)} IPs{parseInt(answers['active-ips-override']) ? ' *' : ''}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-muted-foreground shrink-0 w-20">KW</label>
                <input type="number" value={answers['ud-1'] || ''} onChange={e => setAnswer('ud-1', e.target.value)} placeholder="0" className="flex-1 min-w-0 h-6 px-2 text-xs rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" data-testid="kw-input" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-muted-foreground shrink-0 w-20">Dev/User</label>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => { const c = parseFloat(answers['ipam-multiplier'] || '2.5'); setAnswer('ipam-multiplier', Math.max(0.5, c - 0.5).toString()); }} className="h-5 w-5 shrink-0 rounded bg-secondary border border-border hover:bg-muted flex items-center justify-center text-foreground" data-testid="multiplier-down"><ChevronDown className="h-3 w-3" /></button>
                  <input type="number" step="0.5" value={answers['ipam-multiplier'] || '2.5'} onChange={e => setAnswer('ipam-multiplier', e.target.value)} className="w-10 h-5 px-0 text-[11px] text-center rounded bg-secondary border border-border text-foreground focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" data-testid="multiplier-input" />
                  <button onClick={() => { const c = parseFloat(answers['ipam-multiplier'] || '2.5'); setAnswer('ipam-multiplier', (c + 0.5).toString()); }} className="h-5 w-5 shrink-0 rounded bg-secondary border border-border hover:bg-muted flex items-center justify-center text-foreground" data-testid="multiplier-up"><ChevronUp className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                <label className="text-[11px] text-muted-foreground shrink-0 w-20">Active IPs</label>
                <input
                  type="number"
                  value={answers['active-ips-override'] || ''}
                  onChange={e => setAnswer('active-ips-override', e.target.value)}
                  placeholder={calcActiveIPs > 0 ? calcActiveIPs.toLocaleString() : '0'}
                  className="flex-1 min-w-0 h-6 px-2 text-xs rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  data-testid="active-ips-override-input"
                />
              </div>
              <div className="pt-1 border-t border-border/40 space-y-1">
                <span className="text-[10px] text-muted-foreground/60">Objects</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* NIOS pill */}
                  <div className="flex items-center gap-1 bg-secondary border border-border rounded-full px-2 py-0.5">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">NIOS</span>
                    <input
                      type="number"
                      value={answers['nios-objects-override'] || ''}
                      onChange={e => setAnswer('nios-objects-override', e.target.value)}
                      placeholder={niosObjects > 0 ? niosObjects.toLocaleString() : '0'}
                      className="w-16 h-4 px-0 text-[11px] text-right bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      data-testid="nios-objects-input"
                    />
                  </div>
                  {/* UDDI pill — only in UDDI/Hybrid */}
                  {(isUDDI || isHybrid) && (
                    <div className="flex items-center gap-1 bg-secondary border border-border rounded-full px-2 py-0.5">
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">UDDI</span>
                      <input
                        type="number"
                        value={answers['uddi-objects-override'] || ''}
                        onChange={e => setAnswer('uddi-objects-override', e.target.value)}
                        placeholder={uddiObjects > 0 ? uddiObjects.toLocaleString() : '0'}
                        className="w-16 h-4 px-0 text-[11px] text-right bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        data-testid="uddi-objects-input"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Target Solutions — tiles with context descriptions */}
          <div className="bg-card rounded-xl p-2.5 border border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="h-3.5 w-3.5 text-foreground" />
              <span className="text-[11px] font-semibold text-foreground">Target Solutions</span>
            </div>
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => toggleFeature('nios')} className={`flex flex-col items-start px-2 py-1.5 rounded-lg text-left transition-all border ${isNIOS ? 'bg-[#00BD4D] text-white border-[#00BD4D]' : 'bg-secondary text-secondary-foreground hover:bg-muted border-border'}`} data-testid="toggle-feature-nios">
                  <span className="text-[11px] font-bold">NIOS</span>
                  <span className={`text-[9px] leading-tight ${isNIOS ? 'text-white/80' : 'text-muted-foreground'}`}>Grid + Mgmt tokens</span>
                </button>
                <button onClick={() => toggleFeature('uddi')} className={`flex flex-col items-start px-2 py-1.5 rounded-lg text-left transition-all border ${isUDDI ? 'bg-[#12C2D3] text-white border-[#12C2D3]' : 'bg-secondary text-secondary-foreground hover:bg-muted border-border'}`} data-testid="toggle-feature-uddi">
                  <span className="text-[11px] font-bold">UDDI</span>
                  <span className={`text-[9px] leading-tight ${isUDDI ? 'text-white/80' : 'text-muted-foreground'}`}>Native DDI tokens</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => toggleFeature('security')} className={`flex flex-col items-start px-2 py-1.5 rounded-lg text-left transition-all border ${securityEnabled ? 'bg-[#FF585D] text-white border-[#FF585D]' : 'bg-secondary text-secondary-foreground hover:bg-muted border-border'}`} data-testid="toggle-feature-security">
                  <span className="text-[11px] font-bold">Security</span>
                  <span className={`text-[9px] leading-tight ${securityEnabled ? 'text-white/80' : 'text-muted-foreground'}`}>Threat defense tokens</span>
                </button>
                <button onClick={() => {
                  const newAsset = !isAsset;
                  setAnswer('feature-asset insights', newAsset ? 'Yes' : 'No');
                  if (newAsset) {
                    // Auto-set discovered source based on current platform
                    const src = isHybrid ? 'Both' : isUDDI ? 'Native Asset Insight' : 'NIOS Network Insight';
                    if (!answers['ni-discovered-source']) setAnswer('ni-discovered-source', src);
                  }
                }} className={`flex flex-col items-start px-2 py-1.5 rounded-lg text-left transition-all border ${isAsset ? 'bg-[#7D97F8] text-white border-[#7D97F8]' : 'bg-secondary text-secondary-foreground hover:bg-muted border-border'}`} data-testid="toggle-feature-asset">
                  <span className="text-[11px] font-bold">Asset</span>
                  <span className={`text-[9px] leading-tight ${isAsset ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {isAsset ? ({ 'Native Asset Insight': 'Asset Insight', 'NIOS Network Insight': 'Net Insight', 'Both': 'NI + AI' }[discoveredSource] || 'Mgmt tokens') : 'Discovered assets'}
                  </span>
                </button>
              </div>
              <button onClick={() => { const newHybrid = !isHybrid; updateDrawingConfig(activeDrawingId, { featureNIOS: newHybrid, featureUDDI: newHybrid, platformMode: newHybrid ? 'Hybrid' : 'NIOS', dhcpAssociations: [], siteOverrides: _buildCleanedSiteOverrides() }); }} className={`w-full flex flex-col items-start px-2 py-1.5 rounded-lg transition-all border ${isHybrid ? 'bg-gradient-to-r from-[#00BD4D] to-[#00594C] dark:to-[#12C2D3] text-white border-transparent shadow-sm' : 'bg-secondary text-secondary-foreground hover:bg-muted border-dashed border-border'}`} data-testid="toggle-hybrid">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold">Hybrid</span>
                  {isHybrid && <Check className="h-3 w-3" />}
                </div>
                <span className={`text-[9px] leading-tight ${isHybrid ? 'text-white/80' : 'text-muted-foreground'}`}>NIOS + UDDI together</span>
              </button>

              {/* Discovered asset source — shown when Asset is active */}
              {isAsset && (
                <div className="pt-1 border-t border-border/40">
                  <div className="text-[9px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">Discovered Assets Source</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['Native Asset Insight', 'NIOS Network Insight', 'Both'] as const).map(src => (
                      <button
                        key={src}
                        onClick={() => setAnswer('ni-discovered-source', src)}
                        className={`px-1.5 py-1 rounded text-[9px] font-semibold border transition-colors text-center leading-tight ${
                          discoveredSource === src
                            ? 'bg-[#7D97F8] text-white border-[#7D97F8]'
                            : 'bg-secondary text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {src === 'Native Asset Insight' ? 'Native AI' : src === 'NIOS Network Insight' ? 'NIOS NI' : 'Both'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary — context-aware token breakdown with raw + packs */}
          {(() => {
            const reportingRaw = parseInt(answers['reporting-tokens']) || 0;
            const reportingPacks = reportingRaw > 0 ? Math.ceil(reportingRaw / 1000) : 0;
            const infraRaw = sizingSummary?.infraTokens || 0;
            const infraPacks = infraRaw > 0 ? Math.ceil(infraRaw / 500) : 0;
            const uddiMgmtRaw = rawUddiMgmtTokens;
            const secRaw = securityEnabled ? _secTokens : 0;
            const secPacks = secRaw > 0 ? Math.ceil(secRaw / 1000) : 0;
            const SummaryRow = ({ label, raw, packs, color, indent }: { label: string; raw: number; packs: number; color?: string; indent?: boolean }) => (
              <div className={`flex items-center justify-between gap-1 text-[10px] ${indent ? 'pl-2 text-muted-foreground' : ''}`}>
                <span className={color ? `font-semibold ${color}` : 'text-muted-foreground'}>{label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {raw > 0 ? (
                    <>
                      <span className="text-muted-foreground">{raw.toLocaleString()}</span>
                      <span className={`font-bold ${color || 'text-foreground'}`}>{packs}pk</span>
                    </>
                  ) : <span className="text-muted-foreground/40">—</span>}
                </div>
              </div>
            );
            return (
              <div className="bg-card rounded-xl p-2.5 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-foreground">Summary</span>
                  <button
                    onClick={() => setShowSizingMath(v => !v)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${showSizingMath ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground border-border hover:text-foreground hover:bg-muted'}`}
                  >
                    <Info className="h-3 w-3" />
                    <span>Sizing Math</span>
                  </button>
                </div>
                <div className="space-y-1">
                  {/* Objects section — NIOS (×3) and UDDI (×4) shown separately in Hybrid */}
                  <div className="pb-1 border-b border-border/40 space-y-1">
                    {/* NIOS objects row */}
                    {(isNIOS || isHybrid) && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-muted-foreground font-medium">{isHybrid ? 'NIOS Objects' : 'Objects (est.)'}</span>
                          <span className="font-semibold text-foreground">{niosObjects > 0 ? effectiveNiosObjects.toLocaleString() : '—'}{parseInt(answers['nios-objects-override']) ? ' *' : ''}</span>
                        </div>
                        {niosObjects > 0 && (
                          <div className="space-y-0.5 pl-2 border-l-2 border-border/30">
                            <div className="flex justify-between text-[9px] text-muted-foreground/70">
                              <span>DHCP {Math.round(_dhcpPct * 100)}%: {_dhcp.toLocaleString()} ×{3 + v6DhcpExtra}</span>
                              <span>{(_dhcp * (3 + v6DhcpExtra)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[9px] text-muted-foreground/70">
                              <span>Static: {_stat.toLocaleString()} ×{2 + v6StatExtra}</span>
                              <span>{(_stat * (2 + v6StatExtra)).toLocaleString()}</span>
                            </div>
                            {hasIPv6 && <div className="flex justify-between text-[9px] text-blue-400/80"><span>+IPv6 dual-stack</span><span>+AAAA/PTR6/DHCID6</span></div>}
                            {hasDNSSEC && <div className="flex justify-between text-[9px] text-amber-400/80"><span>+DNSSEC ×4 DNS recs</span><span>+{dnssecExtra.toLocaleString()}</span></div>}
                          </div>
                        )}
                      </div>
                    )}
                    {/* UDDI objects row */}
                    {(isUDDI || isHybrid) && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-muted-foreground font-medium">{isHybrid ? 'UDDI Objects' : 'Objects (est.)'}</span>
                          <span className="font-semibold text-foreground">{uddiObjects > 0 ? effectiveUddiObjects.toLocaleString() : '—'}{parseInt(answers['uddi-objects-override']) ? ' *' : ''}</span>
                        </div>
                        {uddiObjects > 0 && (
                          <div className="space-y-0.5 pl-2 border-l-2 border-border/30">
                            <div className="flex justify-between text-[9px] text-muted-foreground/70">
                              <span>DHCP {Math.round(_dhcpPct * 100)}%: {_dhcp.toLocaleString()} ×{4 + v6DhcpExtra}</span>
                              <span>{(_dhcp * (4 + v6DhcpExtra)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[9px] text-muted-foreground/70">
                              <span>Static: {_stat.toLocaleString()} ×{2 + v6StatExtra}</span>
                              <span>{(_stat * (2 + v6StatExtra)).toLocaleString()}</span>
                            </div>
                            {hasIPv6 && <div className="flex justify-between text-[9px] text-blue-400/80"><span>+IPv6 dual-stack</span><span>+AAAA/PTR6/DHCID6</span></div>}
                            {hasDNSSEC && <div className="flex justify-between text-[9px] text-amber-400/80"><span>+DNSSEC ×4 DNS recs</span><span>+{dnssecExtra.toLocaleString()}</span></div>}
                          </div>
                        )}
                      </div>
                    )}
                    {/* NIOS-only: show single objects row */}
                    {!isNIOS && !isHybrid && !isUDDI && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground font-medium">Objects (est.)</span>
                        <span className="font-semibold text-foreground">{niosObjects > 0 ? niosObjects.toLocaleString() : '—'}</span>
                      </div>
                    )}
                  </div>
                  {/* Token rows — flat, consistent depth */}
                  <div className="space-y-0.5 pt-0.5">
                    {/* Server Tokens first — infrastructure/compute */}
                    {(isUDDI || isHybrid) && <SummaryRow label="Server Tokens" raw={infraRaw} packs={infraPacks} color="text-[#00BD4D]" />}
                    {/* MGMT contributors — shown as contributing rows, then combined subtotal */}
                    {(showMgmtTokens || showUddiMgmt) && (() => {
                      const mgmtTotal = (rawMgmtTokens || 0) + (uddiMgmtRaw || 0);
                      const mgmtPacks = mgmtTotal > 0 ? Math.ceil(mgmtTotal / 1000) : 0;
                      const showDivider = showUddiMgmt || isHybrid;
                      return (
                        <div className={`space-y-0.5 ${showDivider ? 'pt-1 mt-0.5 border-t border-border/40' : ''}`}>
                          {showMgmtTokens && rawMgmtTokens > 0 && (
                            <div className="flex items-center justify-between gap-1 text-[10px]">
                              <span className="text-muted-foreground">NIOS Mgmt</span>
                              <span className="text-muted-foreground tabular-nums">{rawMgmtTokens.toLocaleString()}</span>
                            </div>
                          )}
                          {uddiMgmtRaw > 0 && (
                            <div className="flex items-center justify-between gap-1 text-[10px]">
                              <span className="text-muted-foreground">{isUDDI || isHybrid ? 'UDDI Mgmt' : 'Native AI Mgmt'}</span>
                              <span className="text-muted-foreground tabular-nums">{uddiMgmtRaw.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-1 text-[10px] pt-0.5 border-t border-border/30">
                            <span className="font-semibold text-[#12C2D3]">MGMT Total</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {mgmtTotal > 0 ? (
                                <>
                                  <span className="text-muted-foreground tabular-nums">{mgmtTotal.toLocaleString()}</span>
                                  <span className="font-bold text-[#12C2D3]">{mgmtPacks}pk</span>
                                </>
                              ) : <span className="text-muted-foreground/40">—</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Security and Reporting — service layer */}
                    <div className="pt-1 mt-0.5 border-t border-border/40 space-y-0.5">
                        {securityEnabled && <SummaryRow label="Security" raw={secRaw} packs={secPacks} color="text-[#FF585D]" />}
                        <SummaryRow label="Reporting" raw={reportingRaw} packs={reportingPacks} color="text-[#7D97F8]" />
                      </div>
                  </div>
                  {infraRaw === 0 && uddiMgmtRaw === 0 && secRaw === 0 && !showMgmtTokens && (
                    <p className="text-[9px] text-muted-foreground/50 pt-0.5">Visit Sizing tab to populate token totals</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {showSizingMath && !collapsed && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <SizingMathHelp />
        </div>
      )}
    </div>
  );
}
