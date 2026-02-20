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
  { key: 'feature-nios', label: 'NIOS', color: '#30d158' },
  { key: 'feature-uddi', label: 'UDDI', color: '#0a84ff' },
  { key: 'feature-security', label: 'Security', color: '#ff453a' },
  { key: 'feature-asset insights', label: 'Asset', color: '#bf5af2' },
];

export function TopBar({ customerName, opportunity, onNameChange, onOpportunityChange, onNameBlur, onOpportunityBlur }) {
  const { answers, setAnswer, dataCenters, sites, addDataCenter, addSite, deleteDataCenter, deleteSite, updateDataCenter, updateSite, setPlatformMode } = useDiscovery();
  const [collapsed, setCollapsed] = useState(false);
  const [dcName, setDcName] = useState('');
  const [dcKW, setDcKW] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteKW, setSiteKW] = useState('');

  const kw = parseInt(answers['ud-1']) || 0;
  const mult = parseFloat(answers['ipam-multiplier']) || 2.5;
  const activeIPs = Math.ceil(kw * mult);
  const totalKW = dataCenters.reduce((sum, dc) => sum + (dc.knowledgeWorkers || 0), 0) + sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0);

  const niosEnabled = answers['feature-nios'] === 'Yes';
  const uddiEnabled = answers['feature-uddi'] === 'Yes';
  const assetEnabled = answers['feature-asset insights'] === 'Yes';

  const cloudMgmtActive = answers['uddi-1'] === 'Yes' || answers['uddi-4'] === 'Yes';
  const prevCloudMgmt = useRef(cloudMgmtActive);
  useEffect(() => {
    if (cloudMgmtActive && !prevCloudMgmt.current && !uddiEnabled) setAnswer('feature-uddi', 'Yes');
    prevCloudMgmt.current = cloudMgmtActive;
  }, [cloudMgmtActive, uddiEnabled, setAnswer]);

  useEffect(() => {
    if (niosEnabled && (uddiEnabled || assetEnabled)) setPlatformMode('Hybrid');
    else if (uddiEnabled && !niosEnabled) setPlatformMode('UDDI');
    else if (niosEnabled && !uddiEnabled && !assetEnabled) setPlatformMode('NIOS');
  }, [niosEnabled, uddiEnabled, assetEnabled, setPlatformMode]);

  const handleAddDC = () => { if (!dcName.trim()) return; addDataCenter(dcName.trim(), parseInt(dcKW) || 0); setDcName(''); setDcKW(''); };
  const handleAddSite = () => { if (!siteName.trim()) return; addSite(siteName.trim(), '', parseInt(siteKW) || 0); setSiteName(''); setSiteKW(''); };

  const isNIOS = answers['feature-nios'] === 'Yes';
  const isUDDI = answers['feature-uddi'] === 'Yes';
  const isSecurity = answers['feature-security'] === 'Yes';
  const isAsset = answers['feature-asset insights'] === 'Yes';
  const isHybrid = isNIOS && isUDDI;
  const activeSolutions = TARGET_SOLUTIONS.filter(s => answers[s.key] === 'Yes');

  const nameLen = Math.max((customerName || '').length, 6);
  const oppLen = Math.max((opportunity || '').length, 8);

  return (
    <div className="flex-shrink-0 bg-[#1c1c1e] border-b border-[#2c2c2e]" data-testid="topbar">
      {/* Header row with customer pill on left, summary items aligned with cards */}
      <div 
        className="px-4 py-1.5 flex items-center border-b border-[#2c2c2e] cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        {/* Customer Pill - Fixed width, not part of the grid alignment */}
        <div onClick={e => e.stopPropagation()} className="shrink-0 mr-4">
          <div className="flex flex-col gap-0 px-2.5 py-1 rounded-lg bg-[#2c2c2e] border border-[#3c3c3e]">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-[#8e8e93] uppercase tracking-wide shrink-0">Customer:</span>
              <input
                value={customerName}
                onChange={e => onNameChange?.(e.target.value)}
                onBlur={() => onNameBlur?.()}
                style={{ width: `${Math.min(Math.max(nameLen * 7.5 + 20, 60), 300)}px` }}
                className="text-xs font-semibold text-white bg-transparent border-0 focus:outline-none placeholder:text-[#6e6e73]"
                placeholder="Name..."
                data-testid="topbar-customer-name"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-[#ff9f0a]/70 uppercase tracking-wide shrink-0">Opportunity:</span>
              <input
                value={opportunity || ''}
                onChange={e => onOpportunityChange?.(e.target.value)}
                onBlur={() => onOpportunityBlur?.()}
                style={{ width: `${Math.min(Math.max(oppLen * 7 + 20, 60), 300)}px` }}
                className="text-[11px] text-[#ff9f0a] bg-transparent border-0 focus:outline-none placeholder:text-[#6e6e73]"
                placeholder="Opportunity..."
                data-testid="topbar-opportunity"
              />
            </div>
          </div>
        </div>

        {/* Summary items - uses same grid as input cards for perfect alignment */}
        <div className="flex-1 grid gap-x-3" style={{ gridTemplateColumns: '5fr 5fr 3fr 3fr' }}>
          {/* DC Summary - centered in column */}
          <div className="flex items-center justify-center gap-1.5">
            <Building2 className="h-3 w-3 text-[#30d158]" />
            <span className="text-[10px] font-medium text-[#30d158]">DC</span>
            <span className="text-[11px] font-semibold text-white">{dataCenters.length}</span>
          </div>

          {/* Sites Summary - centered in column */}
          <div className="flex items-center justify-center gap-1.5">
            <MapPin className="h-3 w-3 text-[#5e5ce6]" />
            <span className="text-[10px] font-medium text-[#5e5ce6]">Sites</span>
            <span className="text-[11px] font-semibold text-white">{sites.length}</span>
          </div>

          {/* TS Summary - centered in column */}
          <div className="flex flex-col items-center justify-center gap-0.5">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-[#ff9f0a]" />
              <span className="text-[10px] font-medium text-[#ff9f0a]">TS</span>
            </div>
            {activeSolutions.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                {activeSolutions.map(s => (
                  <span key={s.key} className="px-1 rounded text-[8px] font-semibold leading-tight text-center" style={{ backgroundColor: s.color + '25', color: s.color }}>
                    {s.label}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[9px] text-[#6e6e73]">--</span>
            )}
            {isHybrid && (
              <span className="px-1.5 rounded text-[8px] font-bold leading-tight bg-gradient-to-r from-[#30d158]/25 to-[#0a84ff]/25 text-[#64d2ff]">Hybrid</span>
            )}
          </div>

          {/* KW + IPs Summary - centered in column */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-1">
              <Calculator className="h-3 w-3 text-[#32d74b]" />
              <span className="text-[10px] text-[#8e8e93]">KW</span>
              <span className="text-[11px] font-semibold text-white">{formatKW(totalKW)}</span>
            </div>
            <span className="text-[11px] font-bold text-[#32d74b]">{formatKW(activeIPs)} IPs</span>
          </div>
        </div>

        {/* Chevron - always visible on the right */}
        <div className="shrink-0 ml-2 p-1 rounded-lg bg-[#2c2c2e]">
          {collapsed ? <ChevronDown className="h-3 w-3 text-[#8e8e93]" /> : <ChevronUp className="h-3 w-3 text-[#8e8e93]" />}
        </div>
      </div>

      {/* Input cards row - uses the same grid template for alignment */}
      {!collapsed && (
        <div className="px-4 flex">
          {/* Spacer to match customer pill width */}
          <div className="shrink-0 mr-4" style={{ width: `${Math.min(Math.max(Math.max(nameLen, oppLen) * 7.5 + 80, 140), 380)}px` }} />
          
          {/* Input cards grid - matches summary grid exactly */}
          <div className="flex-1 grid gap-x-3 py-3" style={{ gridTemplateColumns: '5fr 5fr 3fr 3fr' }}>
            {/* Data Centers */}
            <div className="pr-0">
              <div className="bg-[#2c2c2e] rounded-xl p-3 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-3.5 w-3.5 text-[#30d158]" />
                  <span className="text-xs font-medium text-white">Data Centers</span>
                </div>
                {dataCenters.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {dataCenters.map((dc) => (
                      <div key={dc.id} className="flex items-center bg-[#3c3c3e] rounded-lg overflow-hidden">
                        <input value={dc.name} onChange={e => updateDataCenter(dc.id, { name: e.target.value })} className="flex-1 min-w-0 px-1.5 py-1 text-[11px] text-white bg-transparent border-0 focus:outline-none focus:bg-[#4c4c4e]" />
                        <input type="number" value={dc.knowledgeWorkers || ''} onChange={e => updateDataCenter(dc.id, { knowledgeWorkers: e.target.value })} className="w-12 px-1 py-1 text-[11px] text-[#30d158] bg-transparent border-0 focus:outline-none focus:bg-[#4c4c4e] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <button onClick={() => deleteDataCenter(dc.id)} className="px-1 py-1 hover:bg-[#ff453a]/20 shrink-0" data-testid={`delete-dc-${dc.id}`}><X className="h-3 w-3 text-[#ff453a]" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5 mt-auto">
                  <input value={dcName} onChange={e => setDcName(e.target.value)} placeholder="Name" className="flex-1 min-w-0 h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white placeholder:text-[#6e6e73] focus:outline-none focus:border-[#30d158]" onKeyDown={e => e.key === 'Enter' && handleAddDC()} data-testid="dc-name-input" />
                  <input type="number" value={dcKW} onChange={e => setDcKW(e.target.value)} placeholder="KW" className="w-14 h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white placeholder:text-[#6e6e73] focus:outline-none focus:border-[#30d158] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" onKeyDown={e => e.key === 'Enter' && handleAddDC()} data-testid="dc-kw-input" />
                  <button onClick={handleAddDC} disabled={!dcName.trim()} className="shrink-0 h-7 w-7 rounded-lg bg-[#30d158] hover:bg-[#30d158]/80 disabled:bg-[#3c3c3e] flex items-center justify-center text-black disabled:text-[#8e8e93]" data-testid="dc-add-btn"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>

            {/* Sites */}
            <div className="pr-0">
              <div className="bg-[#2c2c2e] rounded-xl p-3 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-[#5e5ce6]" />
                  <span className="text-xs font-medium text-white">Sites</span>
                </div>
                {sites.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {sites.map((site) => (
                      <div key={site.id} className="flex items-center bg-[#3c3c3e] rounded-lg overflow-hidden">
                        <input value={site.name} onChange={e => updateSite(site.id, { name: e.target.value })} className="flex-1 min-w-0 px-1.5 py-1 text-[11px] text-white bg-transparent border-0 focus:outline-none focus:bg-[#4c4c4e]" />
                        <input type="number" value={site.knowledgeWorkers || ''} onChange={e => updateSite(site.id, { knowledgeWorkers: e.target.value })} className="w-12 px-1 py-1 text-[11px] text-[#5e5ce6] bg-transparent border-0 focus:outline-none focus:bg-[#4c4c4e] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <button onClick={() => deleteSite(site.id)} className="px-1 py-1 hover:bg-[#ff453a]/20 shrink-0" data-testid={`delete-site-${site.id}`}><X className="h-3 w-3 text-[#ff453a]" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5 mt-auto">
                  <input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="Name" className="flex-1 min-w-0 h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white placeholder:text-[#6e6e73] focus:outline-none focus:border-[#5e5ce6]" onKeyDown={e => e.key === 'Enter' && handleAddSite()} data-testid="site-name-input" />
                  <input type="number" value={siteKW} onChange={e => setSiteKW(e.target.value)} placeholder="KW" className="w-14 h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white placeholder:text-[#6e6e73] focus:outline-none focus:border-[#5e5ce6] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" onKeyDown={e => e.key === 'Enter' && handleAddSite()} data-testid="site-kw-input" />
                  <button onClick={handleAddSite} disabled={!siteName.trim()} className="shrink-0 h-7 w-7 rounded-lg bg-[#5e5ce6] hover:bg-[#5e5ce6]/80 disabled:bg-[#3c3c3e] flex items-center justify-center text-white disabled:text-[#8e8e93]" data-testid="site-add-btn"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>

            {/* Target Solutions */}
            <div className="pr-0">
              <div className="bg-[#2c2c2e] rounded-xl p-2.5 h-full">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="h-3.5 w-3.5 text-[#ff9f0a]" />
                  <span className="text-[11px] font-medium text-white">Target Solutions</span>
                </div>
                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-1">
                    <button onClick={() => setAnswer('feature-nios', !isNIOS ? 'Yes' : 'No')} className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${isNIOS ? 'bg-[#30d158] text-black' : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e]'}`} data-testid="toggle-feature-nios">
                      NIOS
                      {isNIOS && isAsset && (<div className="relative group"><Info className="h-2.5 w-2.5" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">+Mgmt Tokens Added</div></div>)}
                    </button>
                    <button onClick={() => setAnswer('feature-uddi', !isUDDI ? 'Yes' : 'No')} className={`flex items-center justify-center px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${isUDDI ? 'bg-[#0a84ff] text-white' : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e]'}`} data-testid="toggle-feature-uddi">UDDI</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button onClick={() => setAnswer('feature-security', !isSecurity ? 'Yes' : 'No')} className={`flex items-center justify-center px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${isSecurity ? 'bg-[#ff453a] text-white' : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e]'}`} data-testid="toggle-feature-security">Security</button>
                    <button onClick={() => setAnswer('feature-asset insights', !isAsset ? 'Yes' : 'No')} className={`flex items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${isAsset ? 'bg-[#bf5af2] text-white' : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e]'}`} data-testid="toggle-feature-asset">
                      Asset
                      {isAsset && isNIOS && (<div className="relative group"><Info className="h-2.5 w-2.5" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">+Mgmt Tokens Added</div></div>)}
                    </button>
                  </div>
                  <button onClick={() => { if (isHybrid) { setAnswer('feature-nios', 'No'); setAnswer('feature-uddi', 'No'); } else { setAnswer('feature-nios', 'Yes'); setAnswer('feature-uddi', 'Yes'); } }} className={`w-full flex items-center justify-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isHybrid ? 'bg-gradient-to-r from-[#30d158] to-[#0a84ff] text-white shadow-lg' : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e] border border-dashed border-[#5c5c5e]'}`} data-testid="toggle-hybrid">
                    <span>Hybrid</span>{isHybrid && <Check className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Active IPs */}
            <div>
              <div className="bg-[#2c2c2e] rounded-xl p-2.5 h-full">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5 text-[#32d74b]" />
                    <span className="text-[11px] font-medium text-white">Active IPs</span>
                  </div>
                  <span className="text-base font-bold text-[#32d74b]">{formatKW(activeIPs)}</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <label className="text-[10px] text-[#8e8e93] mb-0.5 block">Knowledge Workers</label>
                    <input type="number" value={answers['ud-1'] || ''} onChange={e => setAnswer('ud-1', e.target.value)} placeholder="0" className="w-full h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white placeholder:text-[#6e6e73] focus:outline-none focus:border-[#32d74b] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" data-testid="kw-input" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8e8e93] mb-0.5 block">Multiplier</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { const c = parseFloat(answers['ipam-multiplier'] || '2.5'); setAnswer('ipam-multiplier', Math.max(0.5, c - 0.5).toString()); }} className="h-7 w-7 shrink-0 rounded-lg bg-[#3c3c3e] hover:bg-[#4c4c4e] flex items-center justify-center text-white" data-testid="multiplier-down"><ChevronDown className="h-3.5 w-3.5" /></button>
                      <input type="number" step="0.5" value={answers['ipam-multiplier'] || '2.5'} onChange={e => setAnswer('ipam-multiplier', e.target.value)} className="flex-1 min-w-0 h-7 px-1 text-xs text-center rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white focus:outline-none focus:border-[#32d74b] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" data-testid="multiplier-input" />
                      <button onClick={() => { const c = parseFloat(answers['ipam-multiplier'] || '2.5'); setAnswer('ipam-multiplier', (c + 0.5).toString()); }} className="h-7 w-7 shrink-0 rounded-lg bg-[#3c3c3e] hover:bg-[#4c4c4e] flex items-center justify-center text-white" data-testid="multiplier-up"><ChevronUp className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#8e8e93] text-center pt-0.5">
                    {formatKW(kw)} x {mult} = <span className="text-[#32d74b] font-semibold">{formatKW(activeIPs)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spacer to match chevron width */}
          <div className="shrink-0 ml-2" style={{ width: '28px' }} />
        </div>
      )}
    </div>
  );
}
