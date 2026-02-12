import { useState } from "react";
import { 
  Building2, MapPin, Calculator, Target, Plus, AlertCircle, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
    <div className="flex-shrink-0 bg-card border-b">
      {/* Row 1: Customer Name + Target Solutions */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{customerName}</h1>
          {opportunity && (
            <Badge variant="outline" className="text-xs">{opportunity}</Badge>
          )}
        </div>
        
        {/* Target Solutions */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Target className="h-3.5 w-3.5" />
            Solutions:
          </span>
          <div className="flex gap-1">
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
                      className={`relative px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                        isOn 
                          ? 'bg-green-500 text-white shadow-sm' 
                          : needsWhyNot 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {isOn && <Check className="h-3 w-3 inline mr-1" />}
                      {sol.label}
                      {needsWhyNot && !whyNotValue && (
                        <AlertCircle className="h-2.5 w-2.5 absolute -top-1 -right-1 text-amber-500" />
                      )}
                    </button>
                  </PopoverTrigger>
                  {needsWhyNot && (
                    <PopoverContent className="w-52 p-3" side="bottom">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Why not {sol.label}?</span>
                          {!whyNotValue && <Badge variant="outline" className="text-[10px] px-1.5 text-amber-600">Required</Badge>}
                        </div>
                        <Textarea
                          value={whyNotValue}
                          onChange={e => setAnswer(whyNotKey, e.target.value)}
                          placeholder={`Reason for not selecting ${sol.label}...`}
                          className="text-xs min-h-[70px] resize-none"
                        />
                        <Button 
                          size="sm" 
                          className="w-full h-8 text-xs"
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

      {/* Row 2: DC Entry | Site Entry | IP Calculator */}
      <div className="px-4 py-2 flex items-center gap-4">
        
        {/* DC Entry */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-bold">{dataCenters.length}</span>
            <span className="text-xs text-muted-foreground">DC</span>
          </div>
          <div className="flex items-center gap-1">
            <Input
              value={dcName}
              onChange={e => setDcName(e.target.value)}
              placeholder="DC Name"
              className="h-8 w-28 text-xs"
              onKeyDown={e => e.key === 'Enter' && handleAddDC()}
            />
            <Input
              type="number"
              value={dcKW}
              onChange={e => setDcKW(e.target.value)}
              placeholder="KW"
              className="h-8 w-16 text-xs"
              onKeyDown={e => e.key === 'Enter' && handleAddDC()}
            />
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 px-2"
              onClick={handleAddDC}
              disabled={!dcName.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Site Entry */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded">
            <MapPin className="h-4 w-4 text-green-500" />
            <span className="text-sm font-bold">{sites.length}</span>
            <span className="text-xs text-muted-foreground">Sites</span>
          </div>
          <div className="flex items-center gap-1">
            <Input
              value={siteName}
              onChange={e => setSiteName(e.target.value)}
              placeholder="Site Name"
              className="h-8 w-28 text-xs"
              onKeyDown={e => e.key === 'Enter' && handleAddSite()}
            />
            <Input
              type="number"
              value={siteKW}
              onChange={e => setSiteKW(e.target.value)}
              placeholder="KW"
              className="h-8 w-16 text-xs"
              onKeyDown={e => e.key === 'Enter' && handleAddSite()}
            />
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 px-2"
              onClick={handleAddSite}
              disabled={!siteName.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* IP Calculator */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5">
          <Calculator className="h-4 w-4 text-blue-400" />
          <Input
            type="number"
            value={kw || ''}
            onChange={e => setAnswer('ud-1', e.target.value)}
            className="h-7 w-16 text-xs text-center font-mono bg-slate-700 border-slate-600 text-white"
            placeholder="KW"
          />
          <span className="text-slate-400 font-medium">×</span>
          <Input
            type="number"
            step="0.1"
            value={mult}
            onChange={e => setAnswer('ipam-multiplier', e.target.value)}
            className="h-7 w-12 text-xs text-center font-mono bg-slate-700 border-slate-600 text-white"
          />
          <span className="text-slate-400 font-medium">=</span>
          <div className="bg-slate-700 rounded px-2 py-1 min-w-[60px] text-center">
            <span className="text-lg font-bold text-green-400 font-mono">{formatKW(activeIPs)}</span>
          </div>
          <span className="text-[10px] text-slate-400">IPs</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Quick stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Total KW: <strong className="text-foreground">{formatKW(dataCenters.reduce((sum, dc) => sum + (dc.knowledgeWorkers || 0), 0) + sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0))}</strong></span>
        </div>
      </div>
    </div>
  );
}
