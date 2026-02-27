/**
 * TriggerBanner — slim slide-in notification that appears at the top
 * of the Discovery form when a value trigger fires.
 * Auto-dismisses after 8 seconds. "Explore →" opens the Value Discovery drawer.
 */
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function TriggerBanner({ trigger, onExplore, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay so the slide-in is visible
    const show = setTimeout(() => setVisible(true), 60);
    // Auto-dismiss after 8s
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 8000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExplore = () => {
    setVisible(false);
    setTimeout(onExplore, 280);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 280);
  };

  return (
    <div
      className={`transition-all duration-300 overflow-hidden ${visible ? 'max-h-16 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}
      data-testid="trigger-banner"
    >
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm"
        style={{ borderColor: trigger.color + '55', backgroundColor: trigger.color + '12' }}
      >
        {/* Pulse dot + message */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="h-2 w-2 rounded-full shrink-0 animate-pulse"
            style={{ backgroundColor: trigger.color }}
          />
          <span className="text-foreground text-sm truncate">{trigger.message}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button
            onClick={handleExplore}
            data-testid="trigger-banner-explore"
            className="text-xs font-semibold px-3 py-1 rounded-md text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: trigger.color }}
          >
            Explore →
          </button>
          <button
            onClick={handleDismiss}
            data-testid="trigger-banner-dismiss"
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
