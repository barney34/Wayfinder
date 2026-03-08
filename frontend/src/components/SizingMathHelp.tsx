import { Calculator, Server, Database, Zap, Shield, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SizingMathHelp() {
  return (
    <div className="space-y-4 text-xs">
      {/* Step-by-step cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="font-semibold">Step 1: Active IPs</span>
          </div>
          <div className="text-muted-foreground space-y-1">
            <div className="font-mono bg-muted/50 px-2 py-1 rounded text-[10px]">IPs = KW × Devices/User</div>
            <div className="text-[10px]">10,000 KW × 2.5 = <span className="font-bold">25,000 IPs</span></div>
            <div className="text-[10px]">Default: 80% DHCP, 20% static</div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="font-semibold">Step 2: Workload</span>
          </div>
          <div className="text-muted-foreground space-y-1">
            <div className="font-mono bg-muted/50 px-2 py-1 rounded text-[10px]">
              QPS = IPs ÷ 3 (NIOS)<br/>
              QPS = IPs ÷ 50 (UDDI)<br/>
              LPS = DHCP IPs ÷ 900
            </div>
            <div className="text-[10px]">25K IPs → <span className="font-bold">8,333 QPS</span></div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-4 w-4 text-accent" />
            <span className="font-semibold">Step 3: Model Selection</span>
          </div>
          <div className="text-muted-foreground space-y-1">
            <div className="text-[10px]">Smallest model at <span className="font-bold">60% capacity</span></div>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className="text-[9px]">TE-926</Badge>
              <Badge variant="outline" className="text-[9px]">TE-1516</Badge>
              <Badge variant="outline" className="text-[9px]">TE-1526</Badge>
              <Badge variant="outline" className="text-[9px]">TE-2326</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Object Counts — Kea DHCP aware */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 border-b flex items-center gap-2">
          <Database className="h-3.5 w-3.5" />
          <span className="font-semibold">DNS Object Counts (Kea DHCP)</span>
        </div>
        <div className="p-3">
          <table className="w-full text-[11px]">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left py-1 font-medium w-1/4">Platform</th>
                <th className="text-left py-1 font-medium">Formula</th>
                <th className="text-left py-1 font-medium">Records per DHCP lease</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-1.5 font-semibold text-[#00BD4D]">NIOS</td>
                <td className="py-1.5 font-mono text-muted-foreground">(DHCP × 3) + (Static × 2)</td>
                <td className="py-1.5 text-muted-foreground text-[10px]">A + DHCID + PTR</td>
              </tr>
              <tr>
                <td className="py-1.5 font-semibold text-[#12C2D3]">UDDI</td>
                <td className="py-1.5 font-mono text-muted-foreground">(DHCP × 4) + (Static × 2)</td>
                <td className="py-1.5 text-muted-foreground text-[10px]">A + 2×DHCID (fwd+rev) + PTR</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-2 text-[10px] text-muted-foreground/70 border-t pt-2">
            Kea DHCP creates a DHCID record in both the forward and reverse zones. ISC DHCP only creates one DHCID (forward zone only).
            A +15% buffer is applied automatically.
          </div>
        </div>
      </div>

      {/* Token Calculations */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 border-b flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="font-semibold">Token Calculations</span>
        </div>
        <div className="p-3 space-y-3">
          <div>
            <div className="font-semibold mb-1 text-[#00BD4D]">Server Tokens (UDDI/Hybrid only)</div>
            <div className="text-muted-foreground text-[10px] space-y-0.5">
              <div>Only <span className="font-mono">NXVS</span> and <span className="font-mono">NXaaS</span> platforms consume server tokens — NIOS appliances do not.</div>
              <div className="font-mono bg-muted/50 px-2 py-1 rounded">1 token pack = 500 tokens</div>
            </div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-[#12C2D3]">MGMT Tokens</div>
            <table className="w-full text-[11px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-1 font-medium">Component</th>
                  <th className="text-right py-1 font-medium">NIOS rate</th>
                  <th className="text-right py-1 font-medium">UDDI native rate</th>
                </tr>
              </thead>
              <tbody className="divide-y text-muted-foreground">
                <tr>
                  <td className="py-1">DDI Objects</td>
                  <td className="py-1 text-right font-mono">÷ 50</td>
                  <td className="py-1 text-right font-mono">÷ 25</td>
                </tr>
                <tr>
                  <td className="py-1">Active IPs</td>
                  <td className="py-1 text-right font-mono">÷ 25</td>
                  <td className="py-1 text-right font-mono">÷ 13</td>
                </tr>
                <tr>
                  <td className="py-1">Discovered Assets (5% of IPs)</td>
                  <td className="py-1 text-right font-mono">÷ 13</td>
                  <td className="py-1 text-right font-mono">÷ 3</td>
                </tr>
              </tbody>
            </table>
            <div className="text-[10px] text-muted-foreground/70 mt-1">NIOS MGMT tokens apply when Hybrid or NIOS+Asset Insights. 1 MGMT token pack = 1,000 tokens.</div>
          </div>
        </div>
      </div>

      {/* Performance Penalties */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-amber-100/50 dark:bg-amber-900/20 px-3 py-2 border-b">
          <span className="font-semibold text-amber-700 dark:text-amber-300">Performance Penalties</span>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          <div className="flex justify-between"><span>Multi-protocol (DNS+DHCP)</span><Badge variant="outline" className="text-[10px]">+30%</Badge></div>
          <div className="flex justify-between"><span>DHCP Failover</span><Badge variant="outline" className="text-[10px]">-50%</Badge></div>
          <div className="flex justify-between"><span>Hub & Spoke (Spoke)</span><Badge variant="outline" className="text-[10px]">-50%</Badge></div>
          <div className="flex justify-between"><span>DHCP Fingerprinting</span><Badge variant="outline" className="text-[10px]">-10%</Badge></div>
        </div>
      </div>

      {/* NIOS TE-Series Models */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 border-b">
          <span className="font-semibold">NIOS TE-Series (at 60% capacity)</span>
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
    </div>
  );
}
