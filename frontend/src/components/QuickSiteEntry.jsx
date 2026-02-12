import { useState, useRef, useCallback } from "react";
import { Building2, MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDiscovery } from "@/contexts/DiscoveryContext";

// Editable tag for DC/Site
function SiteTag({ name, kw, color, onRemove }) {
  const bgColor = color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300' : 'bg-green-100 dark:bg-green-900/30 border-green-300';
  const textColor = color === 'blue' ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300';
  const displayKW = kw || '0';
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${bgColor} text-xs`}>
      <span className={`font-medium ${textColor}`}>{name || 'Unnamed'}</span>
      <span className="text-muted-foreground">({displayKW})</span>
      <button onClick={onRemove} className="ml-0.5 hover:text-destructive transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function QuickSiteEntry() {
  const { dataCenters, sites, addDataCenter, addSite, deleteDataCenter, deleteSite } = useDiscovery();
  const [entryType, setEntryType] = useState('dc');
  const [name, setName] = useState('');
  const [kw, setKW] = useState('');
  const nameRef = useRef(null);

  const handleAdd = useCallback(() => {
    if (!name.trim()) return;
    const kwNum = parseInt(kw) || 0;
    
    if (entryType === 'dc') {
      addDataCenter(name.trim(), kwNum);
    } else {
      addSite(name.trim(), '', kwNum);
    }
    
    setName('');
    setKW('');
    nameRef.current?.focus();
  }, [name, kw, entryType, addDataCenter, addSite]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && name.trim()) {
      e.preventDefault();
      handleAdd();
    }
  }, [name, handleAdd]);

  const formatKW = (n) => {
    if (n === undefined || n === null) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
    return n.toString();
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
      {/* Entry Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Type Toggle */}
        <div className="flex items-center bg-background rounded-full p-0.5 border">
          <button
            type="button"
            onClick={() => setEntryType('dc')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all flex items-center gap-1 ${entryType === 'dc' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Building2 className="h-3 w-3" /> DC
          </button>
          <button
            type="button"
            onClick={() => setEntryType('site')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all flex items-center gap-1 ${entryType === 'site' ? 'bg-green-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <MapPin className="h-3 w-3" /> Site
          </button>
        </div>

        {/* Name Input */}
        <Input
          ref={nameRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={entryType === 'dc' ? 'DC Name' : 'Site Name'}
          className="w-32 h-8 text-sm"
          data-testid="quick-entry-name"
        />

        {/* KW Input */}
        <Input
          type="number"
          value={kw}
          onChange={e => setKW(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="KW"
          className="w-20 h-8 text-sm"
          data-testid="quick-entry-kw"
        />

        {/* Add Button */}
        <Button
          size="sm"
          className="h-8"
          onClick={handleAdd}
          disabled={!name.trim()}
          data-testid="quick-entry-add"
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>

        {/* Summary Badges */}
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200">
            <Building2 className="h-3 w-3 mr-1" /> {dataCenters.length} DC
          </Badge>
          <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200">
            <MapPin className="h-3 w-3 mr-1" /> {sites.length} Sites
          </Badge>
        </div>
      </div>

      {/* Tags Row - Show existing DCs and Sites */}
      {(dataCenters.length > 0 || sites.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {dataCenters.map(dc => (
            <SiteTag
              key={dc.id}
              name={dc.name}
              kw={formatKW(dc.knowledgeWorkers)}
              color="blue"
              onRemove={() => deleteDataCenter(dc.id)}
            />
          ))}
          {sites.map(site => (
            <SiteTag
              key={site.id}
              name={site.name}
              kw={formatKW(site.knowledgeWorkers)}
              color="green"
              onRemove={() => deleteSite(site.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
