import { useState } from "react";
import { 
  Building2, MapPin, Calculator, Target, Plus, AlertCircle, Check
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
  const { answers, setAnswer, dataCenters, sites, addDataCenter, addSite } = useDiscovery();
  
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
      {/* Row 1: Customer Name + Target Solutions */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">{customerName}</h1>
          {opportunity && (
            <Badge variant="secondary" className="text-xs font-medium">{opportunity}</Badge>
          )}
        </div>
        
        {/* Target Solutions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span className="font-medium">Target Solutions</span>
          </div>
          <div className="flex gap-1.5">
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
                      className={`relative px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                        isOn 
                          ? 'bg-green-500 text-white shadow-md hover:bg-green-600' 
                          : needsWhyNot 
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-600' 
                            : 'bg-white dark:bg-slate-700 text-muted-foreground border border-border hover:bg-muted shadow-sm'
                      }`}
                    >
                      {isOn && <Check className="h-3.5 w-3.5 inline mr-1.5" />}
                      {sol.label}
                      {needsWhyNot && !whyNotValue && (
                        <AlertCircle className="h-3 w-3 absolute -top-1 -right-1 text-amber-500" />
                      )}
                    </button>
                  </PopoverTrigger>
                  {needsWhyNot && (
                    <PopoverContent className="w-56 p-3" side="bottom">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Why not {sol.label}?</span>
                          {!whyNotValue && <Badge variant="outline" className="text-[10px] px-1.5 text-amber-600 border-amber-400">Required</Badge>}
                        </div>
                        <Textarea
                          value={whyNotValue}
                          onChange={e => setAnswer(whyNotKey, e.target.value)}
                          placeholder={`Reason for not selecting ${sol.label}...`}
                          className="text-sm min-h-[80px] resize-none"
                        />
                        <Button 
                          size="sm" 
                          className="w-full"
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
      </div>

      {/* Row 2: DC/Site Entry (stacked) + IP Calculator */}
      <div className="px-5 py-3 flex items-start gap-6 border-t border-border/50 bg-white/50 dark:bg-slate-800/50">
        
        {/* DC and Site Entry - Stacked */}
        <div className="flex flex-col gap-2">
          {/* DC Entry */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 min-w-[90px]">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-bold leading-none">{dataCenters.length}</div>
                <div className="text-[10px] text-muted-foreground">Data Centers</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-lg border p-1">
              <Input
                value={dcName}
                onChange={e => setDcName(e.target.value)}
                placeholder="DC Name"
                className="h-7 w-32 text-sm border-0 bg-transparent focus-visible:ring-0"
                onKeyDown={e => e.key === 'Enter' && handleAddDC()}
              />
              <Input
                type="number"
                value={dcKW}
                onChange={e => setDcKW(e.target.value)}
                placeholder="KW"
                className="h-7 w-16 text-sm border-0 bg-transparent focus-visible:ring-0 text-center"
                onKeyDown={e => e.key === 'Enter' && handleAddDC()}
              />
              <Button 
                size="sm" 
                className="h-7 w-7 p-0 bg-blue-500 hover:bg-blue-600"
                onClick={handleAddDC}
                disabled={!dcName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Site Entry - Below DC */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 min-w-[90px]">
              <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-lg font-bold leading-none">{sites.length}</div>
                <div className="text-[10px] text-muted-foreground">Sites</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-lg border p-1">
              <Input
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                placeholder="Site Name"
                className="h-7 w-32 text-sm border-0 bg-transparent focus-visible:ring-0"
                onKeyDown={e => e.key === 'Enter' && handleAddSite()}
              />
              <Input
                type="number"
                value={siteKW}
                onChange={e => setSiteKW(e.target.value)}
                placeholder="KW"
                className="h-7 w-16 text-sm border-0 bg-transparent focus-visible:ring-0 text-center"
                onKeyDown={e => e.key === 'Enter' && handleAddSite()}
              />
              <Button 
                size="sm" 
                className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600"
                onClick={handleAddSite}
                disabled={!siteName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-20 bg-border self-center" />

        {/* IP Calculator - Improved Design */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 shadow-lg min-w-[320px]">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">IP Calculator</span>
          </div>
          
          {/* Calculator Layout */}
          <div className="flex items-end gap-3">
            {/* Knowledge Workers Input */}
            <div className="flex-1">
              <Label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Knowledge Workers</Label>
              <Input
                type="number"
                value={kw || ''}
                onChange={e => setAnswer('ud-1', e.target.value)}
                className="h-10 text-lg text-center font-mono bg-slate-700/80 border-slate-600 text-white focus:border-blue-400"
                placeholder="0"
              />
            </div>
            
            {/* Multiply Sign */}
            <div className="text-2xl text-slate-500 font-light pb-2">×</div>
            
            {/* Multiplier Input */}
            <div className="w-20">
              <Label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Multiplier</Label>
              <Input
                type="number"
                step="0.1"
                value={mult}
                onChange={e => setAnswer('ipam-multiplier', e.target.value)}
                className="h-10 text-lg text-center font-mono bg-slate-700/80 border-slate-600 text-white focus:border-blue-400"
              />
            </div>
            
            {/* Equals Sign */}
            <div className="text-2xl text-slate-500 font-light pb-2">=</div>
            
            {/* Result */}
            <div className="bg-slate-700/50 rounded-lg px-4 py-2 text-center min-w-[100px]">
              <div className="text-2xl font-bold text-green-400 font-mono">{formatKW(activeIPs)}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Active IPs</div>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Summary Stats */}
        <div className="text-right space-y-1 self-center">
          <div className="text-sm text-muted-foreground">
            Total Knowledge Workers
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatKW(dataCenters.reduce((sum, dc) => sum + (dc.knowledgeWorkers || 0), 0) + sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0))}
          </div>
        </div>
      </div>
    </div>
  );
}
