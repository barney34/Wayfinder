import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { whatsNewEntries, type WhatsNewEntry } from "@/data/whatsNew";

const CATEGORY_STYLES: Record<WhatsNewEntry['category'], { label: string; className: string }> = {
  feature: { label: 'Feature', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  fix: { label: 'Fix', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  improvement: { label: 'Improvement', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};

export function WhatsNew() {
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h2 className="text-lg font-semibold mb-4">What's New</h2>
      <div className="space-y-3">
        {whatsNewEntries.map((entry, i) => {
          const style = CATEGORY_STYLES[entry.category];
          return (
            <Card key={i} className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                  <Badge variant="secondary" className={style.className}>
                    {style.label}
                  </Badge>
                </div>
                <h3 className="text-sm font-medium">{entry.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
