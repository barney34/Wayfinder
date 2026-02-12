import { useState } from "react";
import { 
  Building2, MapPin, Calculator, Target, Plus, AlertCircle, Check, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useDiscovery } from "@/contexts/DiscoveryContext";

// Format numbers
const formatKW = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return n.toString();
};

// Target Solutions config
const TARGET_SOLUTIONS = [
  { key: 'feature-nios', label: 'NIOS', noWhyNot: true },
  { key: 'feature-uddi', label: 'UDDI', noWhyNot: false },
  { key: 'feature-security', label: 'Security', noWhyNot: false },
  { key: 'feature-asset insights', label: 'Asset', noWhyNot: false },
];

export function TopBar({ customerName, opportunity }) {
  const { answers, setAnswer, dataCenters, sites, addDataCenter, addSite, deleteDataCenter, deleteSite } = useDiscovery();
  
  // DC/Site entry state
  const [dcName, setDcName] = useState('');
  const [dcKW, setDcKW] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteKW, setSiteKW] = useState('');

  // IP Calculator values
  const kw = parseInt(answers['ud-1']) || 0;
  const mult = parseFloat(answers['ipam-multiplier']) || 2.5;
  const activeIPs = Math.ceil(kw * mult);

  // Add DC handler
  const handleAddDC = () => {
    if (!dcName.trim()) return;
    addDataCenter(dcName.trim(), parseInt(dcKW) || 0);
    setDcName('');
    setDcKW('');
  };

  // Add Site handler
  const handleAddSite = () => {
    if (!siteName.trim()) return;
    addSite(siteName.trim(), '', parseInt(siteKW) || 0);
    setSiteName('');
    setSiteKW('');
  };

  return (
    <div className="flex-shrink-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b shadow-sm">
      {/* Row 1: Customer Name */}
      <div className="px-5 py-2 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">{customerName}</h1>
          {opportunity && (
            <Badge variant="secondary" className="text-xs font-medium">{opportunity}</Badge>
          )}
        </div>
        
        {/* Summary Stats */}
        <div className="text-sm text-muted-foreground">
          Total Knowledge Workers: <span className="font-bold text-foreground text-lg">{formatKW(dataCenters.reduce((sum, dc) => sum + (dc.knowledgeWorkers || 0), 0) + sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0))}</span>
        </div>
      </div>

      {/* Row 2: 4 Equal Columns - DC | Sites | Target Solutions | IP Calculator */}
      <div className="px-5 py-3 grid grid-cols-4 gap-4">
        
        {/* Column 1: Data Centers */}
        <div className="flex flex-col">
          {/* DC Header & Entry */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-bold leading-none">{dataCenters.length} Data Centers</div>
            </div>
          </div>
          
          {/* DC Entry Form */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg border p-1.5 mb-2">
            <Input
              value={dcName}
              onChange={e => setDcName(e.target.value)}
              placeholder="DC Name"
              className="h-7 flex-1 text-sm border-0 bg-transparent focus-visible:ring-0"
              onKeyDown={e => e.key === 'Enter' && handleAddDC()}
            />
            <Input
              type="number"
              value={dcKW}
              onChange={e => setDcKW(e.target.value)}
              placeholder="KW"
              className="h-7 w-20 text-sm border-0 bg-transparent focus-visible:ring-0 text-center font-medium"
              onKeyDown={e => e.key === 'Enter' && handleAddDC()}
            />
            <Button 
              size="sm" 
              className="h-7 w-7 p-0 bg-blue-500 hover:bg-blue-600"
              onClick={handleAddDC}
              disabled={!dcName.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* DC Tags - Stacked (max 3 rows) */}
          <div className="flex flex-col gap-1 max-h-[72px] overflow-y-auto">
            {dataCenters.map((dc, idx) => (
              <div 
                key={dc.id || idx} 
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-xs"
                data-testid={`dc-tag-${idx}`}
              >
                <span className="font-medium text-blue-700 dark:text-blue-300 flex-1 truncate" title={dc.name}>
                  {dc.name}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="tabular-nums text-blue-600 dark:text-blue-400 font-medium">{formatKW(dc.knowledgeWorkers || 0)}</span>
                <button 
                  onClick={() => deleteDataCenter(dc.id)}
                  className="p-0.5 rounded hover:bg-destructive/20"
                  data-testid={`delete-dc-${idx}`}
                >
                  <X className="h-3 w-3 text-muted-foreground/50 hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Sites */}
        <div className="flex flex-col">
          {/* Sites Header & Entry */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-bold leading-none">{sites.length} Sites</div>
            </div>
          </div>
          
          {/* Site Entry Form */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg border p-1.5 mb-2">
            <Input
              value={siteName}
              onChange={e => setSiteName(e.target.value)}
              placeholder="Site Name"
              className="h-7 flex-1 text-sm border-0 bg-transparent focus-visible:ring-0"
              onKeyDown={e => e.key === 'Enter' && handleAddSite()}
            />
            <Input
              type="number"
              value={siteKW}
              onChange={e => setSiteKW(e.target.value)}
              placeholder="KW"
              className="h-7 w-20 text-sm border-0 bg-transparent focus-visible:ring-0 text-center font-medium"
              onKeyDown={e => e.key === 'Enter' && handleAddSite()}
            />
            <Button 
              size="sm" 
              className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600"
              onClick={handleAddSite}
              disabled={!siteName.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* Site Tags - Stacked (max 3 rows) */}
          <div className="flex flex-col gap-1 max-h-[72px] overflow-y-auto">
            {sites.map((site, idx) => (
              <div 
                key={site.id || idx} 
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-xs"
                data-testid={`site-tag-${idx}`}
              >
                <span className="font-medium text-green-700 dark:text-green-300 flex-1 truncate" title={site.name}>
                  {site.name}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="tabular-nums text-green-600 dark:text-green-400 font-medium">{formatKW(site.knowledgeWorkers || 0)}</span>
                <button 
                  onClick={() => deleteSite(site.id)}
                  className="p-0.5 rounded hover:bg-destructive/20"
                  data-testid={`delete-site-${idx}`}
                >
                  <X className="h-3 w-3 text-muted-foreground/50 hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Target Solutions - 2x2 Grid */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-sm font-bold leading-none">Target Solutions</div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {TARGET_SOLUTIONS.map(sol => {
              const isOn = answers[sol.key] === 'Yes';
              const whyNotKey = `${sol.key}-why-not`;
              const whyNotValue = answers[whyNotKey] || '';
              const needsWhyNot = !isOn && !sol.noWhyNot;
              
              return (
                <Popover key={sol.key}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => {
                        if (!needsWhyNot) {
                          e.preventDefault();
                          setAnswer(sol.key, isOn ? 'No' : 'Yes');
                        }
                      }}
                      className={`relative px-3 py-2 text-sm rounded-lg font-medium transition-all ${
                        isOn 
                          ? 'bg-green-500 text-white shadow-sm' 
                          : needsWhyNot 
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300' 
                            : 'bg-white dark:bg-slate-700 text-muted-foreground border border-border hover:bg-muted'
                      }`}
                    >
                      {isOn && <Check className="h-3.5 w-3.5 inline mr-1" />}
                      {sol.label}
                      {needsWhyNot && !whyNotValue && (
                        <AlertCircle className="h-3 w-3 absolute -top-1 -right-1 text-amber-500" />
                      )}
                    </button>
                  </PopoverTrigger>
                  {needsWhyNot && (
                    <PopoverContent className="w-52 p-3" side="bottom">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Why not {sol.label}?</span>
                          {!whyNotValue && <Badge variant="outline" className="text-[9px] px-1 text-amber-600">Required</Badge>}
                        </div>
                        <Textarea
                          value={whyNotValue}
                          onChange={e => setAnswer(whyNotKey, e.target.value)}
                          placeholder={`Reason...`}
                          className="text-xs min-h-[60px] resize-none"
                        />
                        <Button 
                          size="sm" 
                          className="w-full h-7 text-xs"
                          onClick={() => setAnswer(sol.key, 'Yes')}
                        >
                          Enable {sol.label}
                        </Button>
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
        </div>

        {/* Column 4: IP Calculator */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-sm font-bold leading-none">IP Calculator</div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 shadow-lg flex-1">
            {/* Calculator Layout */}
            <div className="flex items-center gap-2">
              {/* Knowledge Workers Input - BIGGER */}
              <div className="flex-1">
                <Label className="text-[9px] text-slate-400 uppercase tracking-wider mb-1 block">Knowledge Workers</Label>
                <Input
                  type="number"
                  value={kw || ''}
                  onChange={e => setAnswer('ud-1', e.target.value)}
                  className="h-9 w-full text-base text-center font-mono bg-slate-700/80 border-slate-600 text-white"
                  placeholder="0"
                  data-testid="ip-calc-kw-input"
                />
              </div>
              
              <div className="text-xl text-slate-500 font-light pt-4">×</div>
              
              {/* Multiplier Input */}
              <div className="w-16">
                <Label className="text-[9px] text-slate-400 uppercase tracking-wider mb-1 block">Mult</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={mult}
                  onChange={e => setAnswer('ipam-multiplier', e.target.value)}
                  className="h-9 w-full text-base text-center font-mono bg-slate-700/80 border-slate-600 text-white"
                />
              </div>
              
              <div className="text-xl text-slate-500 font-light pt-4">=</div>
              
              {/* Result */}
              <div className="bg-slate-700/50 rounded-lg px-3 py-1.5 text-center min-w-[70px]">
                <div className="text-xl font-bold text-green-400 font-mono">{formatKW(activeIPs)}</div>
                <div className="text-[9px] text-slate-400 uppercase">Active IPs</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
