import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Check, Loader2, AlertCircle } from "lucide-react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { cn } from "@/lib/utils";

/**
 * FloatingSaveButton Component
 * Sticky save button that appears when there are unsaved changes
 */
export function FloatingSaveButton({ onSave, className }) {
  const { isDirty, isSaving, lastSaved } = useDiscovery();
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState(null);
  
  // Show "Saved" indicator briefly after save
  useEffect(() => {
    if (lastSaved && !isSaving) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved, isSaving]);
  
  const handleSave = async () => {
    try {
      setError(null);
      if (onSave) {
        await onSave();
      }
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  };
  
  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const date = new Date(lastSaved);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };
  
  // Don't show if nothing to save
  if (!isDirty && !showSaved && !isSaving) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 p-3 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg transition-all duration-300",
        isDirty ? "border-amber-500/50" : "border-green-500/50",
        className
      )}
      data-testid="floating-save-button"
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-sm">
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-muted-foreground">Saving...</span>
          </>
        ) : showSaved ? (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-green-600 dark:text-green-400">Saved</span>
          </>
        ) : isDirty ? (
          <>
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
          </>
        ) : null}
      </div>
      
      {/* Last saved time */}
      {lastSaved && !isDirty && (
        <Badge variant="outline" className="text-xs">
          {formatLastSaved()}
        </Badge>
      )}
      
      {/* Error message */}
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
      
      {/* Save button */}
      {isDirty && (
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="gap-2"
          data-testid="save-button"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
      )}
    </div>
  );
}

export default FloatingSaveButton;
