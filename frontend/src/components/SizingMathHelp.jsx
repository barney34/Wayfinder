import { useState, useEffect } from "react";
import { HelpCircle, ChevronDown, Calculator, Server, Database, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SizingMathHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    // Load the sizing math markdown
    fetch('/sizing-math.md')
      .then(res => res.text())
      .then(text => setMarkdown(text))
      .catch(() => setMarkdown(''));
  }, []);

  return (
    <Card className="border-dashed border-accent/30 bg-accent/5">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-accent" />
            Sizing Math Explained
          </CardTitle>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="pt-0 space-y-4">
          {/* Quick Reference Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Step 1: IPs */}
            <div className="p-3 rounded-lg bg-card border">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Step 1: Active IPs</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="font-mono bg-muted/50 px-2 py-1 rounded">
                  IPs = KW × Multiplier
                </div>
                <div className="text-[10px]">
                  Example: 10,000 × 2.5 = <span className="font-bold">25,000 IPs</span>
                </div>
              </div>
            </div>
            
            {/* Step 2: Workload */}
            <div className="p-3 rounded-lg bg-card border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold">Step 2: Workload</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="font-mono bg-muted/50 px-2 py-1 rounded text-[10px]">
                  QPS = IPs ÷ 3 (NIOS)<br/>
                  LPS = DHCP ÷ 900
                </div>
                <div className="text-[10px]">
                  25K IPs → <span className="font-bold">8,333 QPS</span>
                </div>
              </div>
            </div>
            
            {/* Step 3: Model */}
            <div className="p-3 rounded-lg bg-card border">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold">Step 3: Select Model</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="text-[10px]">
                  Find smallest server at <span className="font-bold">60% capacity</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-[9px]">TE-926</Badge>
                  <Badge variant="outline" className="text-[9px]">TE-1516</Badge>
                  <Badge variant="outline" className="text-[9px]">TE-1526</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Formulas Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b">
              <span className="text-xs font-semibold flex items-center gap-2">
                <Database className="h-3.5 w-3.5" />
                Key Formulas
              </span>
            </div>
            <div className="p-3">
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-1.5 font-medium w-1/3">DNS Objects</td>
                    <td className="py-1.5 font-mono text-muted-foreground">(DHCP × 3) + (Static × 2)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium">DHCP Objects</td>
                    <td className="py-1.5 font-mono text-muted-foreground">DHCP Clients × 2</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium">Peak QPS (NIOS)</td>
                    <td className="py-1.5 font-mono text-muted-foreground">Active IPs ÷ 3</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium">Peak QPS (UDDI)</td>
                    <td className="py-1.5 font-mono text-muted-foreground">Active IPs ÷ 50</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium">Aggregate LPS</td>
                    <td className="py-1.5 font-mono text-muted-foreground">DHCP Clients ÷ 900</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Penalties */}
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-amber-100/50 dark:bg-amber-900/20 px-3 py-2 border-b">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Performance Penalties</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span>Multi-protocol (DNS+DHCP)</span>
                <Badge variant="outline" className="text-[10px]">+30%</Badge>
              </div>
              <div className="flex justify-between">
                <span>DHCP Failover</span>
                <Badge variant="outline" className="text-[10px]">-50%</Badge>
              </div>
              <div className="flex justify-between">
                <span>Hub & Spoke (Spoke)</span>
                <Badge variant="outline" className="text-[10px]">-50%</Badge>
              </div>
              <div className="flex justify-between">
                <span>DHCP Fingerprinting</span>
                <Badge variant="outline" className="text-[10px]">-10%</Badge>
              </div>
            </div>
          </div>

          {/* Server Models Quick Ref */}
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b">
              <span className="text-xs font-semibold">NIOS TE-Series Models (at 60% capacity)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Model</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Objects</th>
                    <th className="px-2 py-1.5 text-right font-semibold">QPS</th>
                    <th className="px-2 py-1.5 text-right font-semibold">LPS</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="px-2 py-1">TE-926</td><td className="px-2 py-1 text-right font-mono">66K</td><td className="px-2 py-1 text-right font-mono">20K</td><td className="px-2 py-1 text-right font-mono">135</td><td className="px-2 py-1 text-right font-mono">880</td></tr>
                  <tr><td className="px-2 py-1">TE-1516</td><td className="px-2 py-1 text-right font-mono">264K</td><td className="px-2 py-1 text-right font-mono">40K</td><td className="px-2 py-1 text-right font-mono">240</td><td className="px-2 py-1 text-right font-mono">2,270</td></tr>
                  <tr><td className="px-2 py-1">TE-1526</td><td className="px-2 py-1 text-right font-mono">528K</td><td className="px-2 py-1 text-right font-mono">67K</td><td className="px-2 py-1 text-right font-mono">405</td><td className="px-2 py-1 text-right font-mono">2,995</td></tr>
                  <tr><td className="px-2 py-1">TE-2326</td><td className="px-2 py-1 text-right font-mono">2.7M</td><td className="px-2 py-1 text-right font-mono">150K</td><td className="px-2 py-1 text-right font-mono">720</td><td className="px-2 py-1 text-right font-mono">6,755</td></tr>
                  <tr><td className="px-2 py-1">TE-4126</td><td className="px-2 py-1 text-right font-mono">14.4M</td><td className="px-2 py-1 text-right font-mono">270K</td><td className="px-2 py-1 text-right font-mono">900</td><td className="px-2 py-1 text-right font-mono">17,010</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
