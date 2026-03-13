/**
 * Export functions for Sizing Calculator
 * Handles CSV, YAML, Excel, PDF, and Drawing exports
 */
import { formatNumber } from "@/lib/utils";
import { getSwBaseSku, getSwPackage, getUnitGroup, getUtilizationTarget, niosServerGuardrails, nxvsServers } from "@/lib/tokenData";
import { getSiteWorkloadDetails } from "../calculations";

export interface Site {
  id: string;
  name: string;
  sourceType?: string;
  numIPs: number;
  knowledgeWorkers: number;
  role: string;
  services?: string[];
  platform: string;
  recommendedModel: string;
  hardwareSku: string;
  tokens: number;
  description?: string;
  swAddons?: string[];
  effectivePerfFeatures?: string[];
  perfFeatures?: string[];
  dhcpPercent?: number;
  isHub?: boolean;
  isSpoke?: boolean;
  hubLPS?: number;
  foObjects?: number;
  rptQuantity?: string;
  _serverCount?: number;
  serverCount?: number;
  haEnabled?: boolean;
  addToReport?: boolean;
  addToBom?: boolean;
  _parentSiteId?: string;
  unitLetterOverride?: string;
  unitNumberOverride?: number;
  swInstances?: number;
  hwAddons?: string[];
  sfpAddons?: Record<string, number>;
  _serverIndex?: number;
}

export interface Totals {
  totalIPs: number;
  totalKW: number;
  totalTokens: number;
  infraTokens: number;
  securityTokens: number;
  uddiTokens: number;
}

export interface PartnerSku {
  sku: string;
  description: string;
}

export interface BomItem {
  sku: string;
  description: string;
  quantity: number;
  sites: string[];
}

export interface UnitAssignment {
  unitLetter: string;
  unitNumber: number;
}

export interface LucidExportRow {
  'Drawing #': string;
  'Unit Group': string;
  'Unit #/Range': string;
  'Solution': string;
  'Model Info': string;
  'SW Instances': number;
  'Description': string;
  'SW Base SKU': string;
  'SW Package': string;
  'SW Add-ons': string;
  'HW License SKU': string;
  'HW Add-ons': string;
  'HW Count': number;
  'Add to Report': string;
  'Add to BOM': string;
}

export async function exportCSV(sites: Site[], totals: Totals): Promise<void> {
  const headers = ['Location', 'Type', 'IPs', 'KW', 'Role', 'Services', 'Platform', 'Model', 'Hardware SKU', 'Tokens'];
  const rows = sites.map(s => [
    s.name, s.sourceType || 'Manual', s.numIPs, s.knowledgeWorkers, s.role,
    (s.services || []).join(';') || '-', s.platform, s.recommendedModel, s.hardwareSku, s.tokens
  ]);
  rows.push(['TOTAL', '', totals.totalIPs, totals.totalKW, '', '', '', '', '', totals.infraTokens]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'site-sizing-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportYAML(sites: Site[], totals: Totals, partnerSku: PartnerSku, bom: BomItem[]): Promise<void> {
  const data = {
    summary: {
      totalSites: sites.length,
      totalIPs: totals.totalIPs,
      totalKW: totals.totalKW,
      totalTokens: totals.totalTokens,
      partnerSku: partnerSku.sku,
    },
    sites: sites.map(s => ({
      name: s.name, type: s.sourceType || 'manual', ips: s.numIPs,
      knowledgeWorkers: s.knowledgeWorkers, role: s.role, services: s.services || [],
      platform: s.platform, model: s.recommendedModel, hardwareSku: s.hardwareSku, tokens: s.tokens,
    })),
    bom: bom.map(b => ({ sku: b.sku, quantity: b.quantity, sites: b.sites })),
  };

  const yaml = `# Site Sizing Export\n# Generated: ${new Date().toISOString()}\n\nsummary:\n  totalSites: ${data.summary.totalSites}\n  totalIPs: ${data.summary.totalIPs}\n  totalKW: ${data.summary.totalKW}\n  totalTokens: ${data.summary.totalTokens}\n  partnerSku: ${data.summary.partnerSku}\n\nsites:\n${data.sites.map(s => `  - name: "${s.name}"\n    type: ${s.type}\n    ips: ${s.ips}\n    knowledgeWorkers: ${s.knowledgeWorkers}\n    role: ${s.role}\n    services: [${s.services.join(', ')}]\n    platform: ${s.platform}\n    model: ${s.model}\n    hardwareSku: ${s.hardwareSku}\n    tokens: ${s.tokens}`).join('\n')}\n\nbom:\n${data.bom.map(b => `  - sku: ${b.sku}\n    quantity: ${b.quantity}\n    sites: [${b.sites.map(s => `"${s}"`).join(', ')}]`).join('\n')}`;

  const blob = new Blob([yaml], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'site-sizing-export.yaml';
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportExcel(sites: Site[], totals: Totals, bom: BomItem[], partnerSku: PartnerSku, platformMode: string): Promise<void> {
  const XLSX = await import('xlsx');
  const siteData = [
    ['Location', 'Type', '# IPs', 'KW', 'Role', 'Services', 'Platform', 'Model', 'Hardware SKU', 'Tokens'],
    ...sites.map(s => [
      s.name, s.sourceType || 'Manual', s.numIPs, s.knowledgeWorkers, s.role,
      (s.services || []).join(', ') || '-', s.platform, s.recommendedModel, s.hardwareSku, s.tokens
    ]),
    ['TOTAL', '', totals.totalIPs, totals.totalKW, '', '', '', '', '', totals.infraTokens]
  ];

  const bomData = [
    ['Hardware SKU', 'Description', 'Quantity', 'Sites'],
    ...bom.map(b => [b.sku, b.description, b.quantity, b.sites.join(', ')])
  ];

  const summaryData = [
    ['Summary', ''],
    ['Total Sites', sites.length],
    ['Total IPs', totals.totalIPs],
    ['Total Knowledge Workers', totals.totalKW],
    ['Infrastructure Tokens', totals.infraTokens],
    ['Security Tokens', totals.securityTokens],
    ['UDDI Tokens', totals.uddiTokens],
    ['Total Tokens', totals.totalTokens],
    ['Partner SKU', partnerSku.sku],
    ['Partner SKU Description', partnerSku.description],
    ['Platform Mode', platformMode],
    ['Utilization Target', platformMode === 'NIOS' ? '60% (NIOS)' : platformMode === 'UDDI' ? '80% (NIOS-X)' : '60% NIOS / 80% NIOS-X'],
    ['Generated', new Date().toISOString()]
  ];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(siteData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Site Sizing');
  const ws2 = XLSX.utils.aoa_to_sheet(bomData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Bill of Materials');
  const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Summary');
  XLSX.writeFile(wb, 'site-sizing-export.xlsx');
}

export async function exportPDF(sites: Site[], totals: Totals, bom: BomItem[], partnerSku: PartnerSku, platformMode: string, securityEnabled: boolean, uddiEnabled: boolean, customerName?: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const rpzFeatureCodes = new Set(['RPZ', 'NSIP', 'TI']);
  const niosNeedsRpz = platformMode === 'NIOS' && sites.some(site =>
    (site.effectivePerfFeatures || site.perfFeatures || []).some(feature => rpzFeatureCodes.has(feature))
  );
  // Only show tokens when UDDI or Hybrid mode, or if RPZ/Security is enabled
  const showTokens = (platformMode === 'UDDI' || platformMode === 'Hybrid') || niosNeedsRpz || securityEnabled;
  const utilLabel = platformMode === 'NIOS' ? '60% (NIOS)' : platformMode === 'UDDI' ? '80% (NIOS-X)' : '60% NIOS / 80% NIOS-X';
  const partnerSkuValue = totals.totalTokens > 0 ? partnerSku.sku : '—';
  const securityStatus = platformMode === 'NIOS' && niosNeedsRpz
    ? 'RPZ required'
    : securityEnabled
      ? 'Active'
      : 'Disabled';

  type ComparableModel = {
    label: string;
    ratedQps: number;
    ratedLps: number;
    ratedObjects: number;
  };

  type SiteComparisonSnapshot = {
    qpsText: string;
    lpsText: string;
    objectsText: string;
    demandBlock: string;
    lowerBlock: string;
    currentBlock: string;
    higherBlock: string;
  };

  const nonComparableRoles = new Set(['ND', 'ND-X', 'Reporting', 'LIC', 'CDC']);
  const isNiosxPlatform = (platform: string) => platform === 'NXVS' || platform === 'NXaaS' || platform === 'NX-P';
  const metricText = (value: number) => value > 0 ? formatNumber(value) : '—';

  const getModelCatalog = (site: Site): ComparableModel[] => (
    isNiosxPlatform(site.platform)
      ? nxvsServers.map(server => ({
          label: server.serverSize,
          ratedQps: server.qps,
          ratedLps: server.lps,
          ratedObjects: server.objects,
        }))
      : niosServerGuardrails.map(server => ({
          label: server.model,
          ratedQps: server.maxQPS,
          ratedLps: server.maxLPS,
          ratedObjects: server.maxDbObj,
        }))
  );

  const formatModelBlock = (model: ComparableModel | null, site: Site, qpsMultiplier: number, lpsMultiplier: number) => {
    if (!model) return '—';
    const utilization = getUtilizationTarget(site.platform);
    const effectiveQps = Math.round(model.ratedQps * utilization * qpsMultiplier);
    const effectiveLps = Math.round(model.ratedLps * utilization * lpsMultiplier);
    const effectiveObjects = Math.round(model.ratedObjects * utilization);
    return `${model.label}\nQPS ${formatNumber(effectiveQps)}\nLPS ${formatNumber(effectiveLps)}\nObj ${formatNumber(effectiveObjects)}`;
  };

  const buildComparisonSnapshot = (site: Site): SiteComparisonSnapshot | null => {
    if (nonComparableRoles.has(site.role)) return null;

    const workload = getSiteWorkloadDetails(
      site.numIPs,
      site.role,
      platformMode,
      site.dhcpPercent ?? 80,
      site.platform,
      {
        isSpoke: site.isSpoke,
        hubLPS: site.hubLPS || 0,
        foObjects: site.foObjects || 0,
        perfFeatures: site.effectivePerfFeatures || site.perfFeatures || [],
      }
    );

    const models = getModelCatalog(site);
    const currentIndex = models.findIndex(model => model.label === site.recommendedModel);
    const currentModel = currentIndex >= 0
      ? models[currentIndex]
      : {
          label: site.recommendedModel,
          ratedQps: 0,
          ratedLps: 0,
          ratedObjects: 0,
        };

    const qpsText = metricText(workload.adjustedQPS);
    const lpsText = metricText(workload.adjustedLPS);
    const objectsText = metricText(workload.objects);

    return {
      qpsText,
      lpsText,
      objectsText,
      demandBlock: `QPS ${qpsText}\nLPS ${lpsText}\nObj ${objectsText}`,
      lowerBlock: currentIndex > 0
        ? formatModelBlock(models[currentIndex - 1], site, workload.qpsMultiplier ?? 1, workload.lpsMultiplier ?? 1)
        : '—',
      currentBlock: formatModelBlock(currentModel, site, workload.qpsMultiplier ?? 1, workload.lpsMultiplier ?? 1),
      higherBlock: currentIndex >= 0 && currentIndex < models.length - 1
        ? formatModelBlock(models[currentIndex + 1], site, workload.qpsMultiplier ?? 1, workload.lpsMultiplier ?? 1)
        : '—',
    };
  };

  const comparisonSnapshots = new Map<string, SiteComparisonSnapshot | null>();
  sites.forEach(site => {
    comparisonSnapshots.set(site.id, buildComparisonSnapshot(site));
  });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const title = customerName ? `${customerName} - Site Sizing Report` : 'Site Sizing Report';
  doc.text(title, pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });
  const subtitleParts = [`Platform: ${platformMode}`];
  if (showTokens && partnerSkuValue !== '—') subtitleParts.push(`SKU: ${partnerSkuValue}`);
  subtitleParts.push(`Target: ${utilLabel}`);
  doc.text(subtitleParts.join(' | '), pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(9);
  const summaryY = 35;
  const boxWidth = 38;
  const boxGap = 4;
  const summaryBoxes = showTokens
    ? [
        { label: 'Total Sites', value: sites.length.toString() },
        { label: 'Total IPs', value: totals.totalIPs.toLocaleString() },
        { label: 'Total KW', value: totals.totalKW.toLocaleString() },
        { label: 'Total Tokens', value: totals.totalTokens.toLocaleString() },
        { label: 'Partner SKU', value: partnerSkuValue },
      ]
    : [
        { label: 'Total Sites', value: sites.length.toString() },
        { label: 'Total IPs', value: totals.totalIPs.toLocaleString() },
        { label: 'Total KW', value: totals.totalKW.toLocaleString() },
        { label: 'Platform', value: platformMode },
        { label: 'Sizing Target', value: utilLabel },
      ];
  const startX = (pageWidth - (summaryBoxes.length * boxWidth + (summaryBoxes.length - 1) * boxGap)) / 2;

  summaryBoxes.forEach((box, i) => {
    const x = startX + i * (boxWidth + boxGap);
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, summaryY, boxWidth, 15, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text(box.value, x + boxWidth / 2, summaryY + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(box.label, x + boxWidth / 2, summaryY + 12, { align: 'center' });
    doc.setFontSize(9);
  });

  const siteTableHead = showTokens
    ? [['Location', '# IPs', 'KW', 'Role', 'Platform', 'Model', 'QPS', 'LPS', 'Objects', 'SKU', 'Tokens']]
    : [['Location', '# IPs', 'KW', 'Role', 'Platform', 'Model', 'QPS', 'LPS', 'Objects', 'SKU', 'Workload Summary']];
  const siteTableBody = sites.map(s => {
    const snapshot = comparisonSnapshots.get(s.id);
    const base = [
      s.name, s.numIPs.toLocaleString(), s.knowledgeWorkers.toLocaleString(),
      s.role, s.platform, s.recommendedModel, snapshot?.qpsText || '—', snapshot?.lpsText || '—', snapshot?.objectsText || '—', s.hardwareSku,
    ];
    if (showTokens) {
      return [...base, s.tokens.toLocaleString()];
    } else {
      // Add workload summary instead of tokens for NIOS
      const workloadSummary = [];
      if (snapshot?.qpsText && snapshot?.qpsText !== '—') workloadSummary.push(`QPS ${snapshot.qpsText}`);
      if (snapshot?.lpsText && snapshot?.lpsText !== '—') workloadSummary.push(`LPS ${snapshot.lpsText}`);
      if (snapshot?.objectsText && snapshot?.objectsText !== '—') workloadSummary.push(`Obj ${snapshot.objectsText}`);
      return [...base, workloadSummary.length > 0 ? workloadSummary.join(', ') : '—'];
    }
  });
  const siteTableTotal = showTokens
    ? ['TOTAL', totals.totalIPs.toLocaleString(), totals.totalKW.toLocaleString(), '', '', '', '', '', '', '', totals.infraTokens.toLocaleString()]
    : ['TOTAL', totals.totalIPs.toLocaleString(), totals.totalKW.toLocaleString(), '', '', '', '', '', '', '', ''];

  autoTable(doc, {
    startY: 55,
    head: siteTableHead,
    body: [...siteTableBody, siteTableTotal],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
    bodyStyles: { fontSize: 6.5 },
    footStyles: { fillColor: [229, 231, 235], fontStyle: 'bold' },
    columnStyles: showTokens
      ? {
          0: { cellWidth: 38 },
          1: { cellWidth: 16, halign: 'right' },
          2: { cellWidth: 16, halign: 'right' },
          3: { cellWidth: 24 },
          4: { cellWidth: 20 },
          5: { cellWidth: 18 },
          6: { cellWidth: 16, halign: 'right' },
          7: { cellWidth: 16, halign: 'right' },
          8: { cellWidth: 20, halign: 'right' },
          9: { cellWidth: 28 },
          10: { cellWidth: 16, halign: 'right' },
        }
      : {
          0: { cellWidth: 38 },
          1: { cellWidth: 16, halign: 'right' },
          2: { cellWidth: 16, halign: 'right' },
          3: { cellWidth: 24 },
          4: { cellWidth: 20 },
          5: { cellWidth: 18 },
          6: { cellWidth: 16, halign: 'right' },
          7: { cellWidth: 16, halign: 'right' },
          8: { cellWidth: 20, halign: 'right' },
          9: { cellWidth: 28 },
          10: { cellWidth: 40 },
        },
  });

  const comparisonRows = sites.reduce<string[][]>((rows, site) => {
    const snapshot = comparisonSnapshots.get(site.id);
    if (!snapshot) return rows;
    rows.push([
      site.name,
      site.role,
      snapshot.demandBlock,
      snapshot.lowerBlock,
      snapshot.currentBlock,
      snapshot.higherBlock,
    ]);
    return rows;
  }, []);

  if (comparisonRows.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Model Comparison', 14, 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Shows demand plus the next size down, selected model, and next size up at rollout target capacity.', 14, 21);
    autoTable(doc, {
      startY: 26,
      head: [['Location', 'Role', 'Demand', 'Size Down', 'Selected', 'Size Up']],
      body: comparisonRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      bodyStyles: { fontSize: 7, overflow: 'linebreak', valign: 'middle', cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 34 },
        1: { cellWidth: 22 },
        2: { cellWidth: 36 },
        3: { cellWidth: 46 },
        4: { cellWidth: 46, fillColor: [239, 246, 255], textColor: [30, 64, 175] },
        5: { cellWidth: 46 },
      },
    });
  }

  if (bom.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill of Materials', 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['Hardware SKU', 'Description', 'Qty', 'Sites']],
      body: bom.map(b => [b.sku, b.description, b.quantity.toString(), b.sites.slice(0, 5).join(', ') + (b.sites.length > 5 ? '...' : '')]),
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 50 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 80 } },
    });
  }

  if (showTokens) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Token Summary', 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['Category', 'Tokens', 'Status']],
      body: [
        ['Infrastructure', totals.infraTokens.toLocaleString(), 'Active'],
        ['Security', totals.securityTokens.toLocaleString(), securityStatus],
        ['UDDI', totals.uddiTokens.toLocaleString(), uddiEnabled ? 'Active' : 'Disabled'],
        ['TOTAL', totals.totalTokens.toLocaleString(), ''],
      ],
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 40, halign: 'right' }, 2: { cellWidth: 30 } },
    });
  }

  // Methodology footnote
  doc.setPage(1);
  const footY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Sizing Methodology: ${utilLabel} utilization target at rollout. DNS QPS = IPs ÷ 3. DHCP LPS = DHCP clients ÷ 900s. DNS+DHCP = 130% multi-protocol penalty. ` +
    `Database objects = Knowledge Workers × 2.5. Service IPs add 5 QPS and 2 LPS each. DNSSEC reduces QPS by 20%. ` +
    `UDDI platforms use 80% target, NIOS uses 60% target. Model selection based on highest utilization metric.`,
    14, footY
  );

  doc.save('site-sizing-export.pdf');
}

export async function exportForLucid(sites: Site[], drawingNum: string, unitAssignments: Record<string, UnitAssignment> = {}): Promise<void> {
  if (!sites || sites.length === 0) {
    alert('No sites to export. Please add sites to the sizing table first.');
    return;
  }

  // --- Helper: build description for a site ---
  function buildDesc(site: Site, overrideLabel?: string): string {
    if (site.description?.trim()) return site.description.trim();
    const parts: string[] = [];
    const role = site.role || '';
    const sw = site.swAddons || [];
    const pf = site.effectivePerfFeatures || site.perfFeatures || [];

    if (role === 'GM' || role.startsWith('GM+')) {
      parts.push('HA Grid Manager');
      if (sw.includes('CNA')) parts.push('Cloud Network Automation');
    } else if (role === 'GMC' || role.startsWith('GMC+')) {
      parts.push('Grid Manager Candidate');
      if (sw.includes('CNA')) parts.push('Cloud Network Automation');
    } else if (role === 'DNS/DHCP') {
      parts.push(site.isHub ? 'DNS and DHCP Services\nDHCP Failover Hub' :
                 site.isSpoke ? 'DNS and DHCP Services\nDHCP Failover' :
                 'Int. Auth DNS, DHCP');
    } else if (role === 'DNS') {
      parts.push('Int. Auth. DNS');
      if (pf.includes('ADP')) parts.push('Advanced DNS Protection');
      if (pf.includes('DTC')) parts.push('Global Server Load Balancing');
    } else if (role === 'DHCP') {
      parts.push('Core DHCP Services');
      if (site.isHub || site.isSpoke) parts.push('Failover redundancy');
    } else if (role === 'ND') {
      parts.push('Network Insight\nAutomated Discovery\nAuthoritative IPAM');
    } else if (role === 'Reporting') {
      parts.push('Reporting Virtual Server\nScheduled Reports\nAutomated Data Collection');
    } else if (role === 'CDC') {
      parts.push('Cloud Data Connector\nExport service logs');
    } else if (role === 'LIC') {
      parts.push(site.name || 'License');
    } else {
      parts.push(site.name || role);
    }
    if (sw.includes('DDIMSGD') || sw.includes('MS')) parts.push('Microsoft Sync');
    if (sw.includes('ADNS')) parts.push('Advanced DNS');
    if (sw.includes('TA')) parts.push('Threat Analytics');
    if (sw.includes('SECECO')) parts.push('Security Ecosystem');
    if (overrideLabel) parts.push(overrideLabel);
    return parts.join('\n');
  }

  // --- Helper: build one export row ---
  function makeRow(site: Site, unitGroup: string, unitRange: string, swCount: number, hwCount: number, desc: string): LucidExportRow {
    let solution = 'NIOS';
    if (site.platform?.includes('NXVS'))  solution = 'NXVS';
    if (site.platform?.includes('NXaaS')) solution = 'NXaaS';
    if (site.role === 'ND' || site.role === 'Reporting') solution = 'NIOS';

    const model = site.recommendedModel || 'TBD';
    const swBaseSku = getSwBaseSku(model);
    const hasDiscovery = (site.services || []).includes('Discovery');
    const swPackage = getSwPackage(site.role, hasDiscovery, site.rptQuantity || null);
    const isVirtual = site.platform?.includes('NXVS') || site.platform?.includes('NXaaS') ||
                      site.platform === 'NIOS-V' || site.role === 'Reporting';
    const hwLicenseSku = isVirtual ? 'VM' : (site.hardwareSku || `${model}-HW-AC`);
    const swAddons = [...(site.swAddons || [])];
    if ((site.services || []).includes('DFP') && !swAddons.includes('ADP')) swAddons.push('ADP');

    const hwSkuStr = site.hardwareSku || '';
    const srvCnt = site._serverCount || site.serverCount || 1;
    const hwAddonLabels = (site.hwAddons || []).map(v => {
      if (v === 'PSU') return hwSkuStr.includes('-AC') ? 'T-PSU600-AC' : hwSkuStr.includes('-DC') ? 'T-PSU600-DC' : 'T-PSU600';
      return v;
    });
    const sfpLabels = Object.entries(site.sfpAddons || {})
      .filter(([, qty]) => qty > 0)
      .map(([sfp, qty]) => `${qty * srvCnt}×${sfp}`);
    const hwAddons = [...hwAddonLabels, ...sfpLabels].join(', ');

    return {
      'Drawing #':     drawingNum || '',
      'Unit Group':    unitGroup,
      'Unit #/Range':  unitRange,
      'Solution':      solution,
      'Model Info':    model,
      'SW Instances':  swCount,
      'Description':   desc,
      'SW Base SKU':   swBaseSku,
      'SW Package':    swPackage,
      'SW Add-ons':    swAddons.join(', ') || '',
      'HW License SKU':hwLicenseSku,
      'HW Add-ons':    hwAddons,
      'HW Count':      hwCount,
      'Add to Report': 'Yes',
      'Add to BOM':    site.addToBom !== false ? 'Yes' : 'No',
    };
  }

  const rows: LucidExportRow[] = [];

  // Group expanded servers by parent site to produce individual + combined rows
  const parentGroups = new Map<string, Site[]>();
  sites.forEach(site => {
    if (site.addToReport === false) return;
    const parentId = site._parentSiteId || site.id;
    if (!parentGroups.has(parentId)) parentGroups.set(parentId, []);
    parentGroups.get(parentId)!.push(site);
  });

  parentGroups.forEach((groupSites) => {
    const firstSite = groupSites[0];
    const unitGroup = firstSite.unitLetterOverride || getUnitGroup(firstSite.role, firstSite.sourceType, firstSite.services);

    // --- Reporting: special handling ---
    if (firstSite.role === 'Reporting') {
      const ua = unitAssignments[firstSite.id];
      const unitNum = ua?.unitNumber ?? 1;
      const swInst = firstSite.swInstances || 1;
      rows.push(makeRow(firstSite, 'RPT', String(unitNum), swInst, 1,
        'Reporting Virtual Server\nScheduled Reports\nAutomated Data Collection'));
      rows.push({
        'Drawing #':     drawingNum || '',
        'Unit Group':    'RPT',
        'Unit #/Range':  String(unitNum + 1),
        'Solution':      'NIOS',
        'Model Info':    'TR-5005',
        'SW Instances':  1,
        'Description':   'Reporting Data Volume\nScheduled Reports\nAutomated Data Collection',
        'SW Base SKU':   'TR-SWTL',
        'SW Package':    firstSite.rptQuantity || '',
        'SW Add-ons':    '',
        'HW License SKU':'',
        'HW Add-ons':    '',
        'HW Count':      0,
        'Add to Report': 'Yes',
        'Add to BOM':    'Yes',
      });
      return;
    }

    const isVirtual = firstSite.platform?.includes('NXVS') || firstSite.platform?.includes('NXaaS') ||
                      firstSite.platform === 'NIOS-V';
    const haMultiplier = firstSite.haEnabled ? 2 : 1;

    if (groupSites.length === 1 && (firstSite.serverCount || 1) <= 1) {
      // --- Single server: one row ---
      const ua = unitAssignments[firstSite.id];
      const unitNum = ua?.unitNumber ?? 1;
      const sw = haMultiplier;
      const hw = isVirtual ? 0 : sw;
      rows.push(makeRow(firstSite, unitGroup, String(unitNum), sw, hw, buildDesc(firstSite)));
    } else {
      // --- Multi-server: individual rows + combined summary ---
      let totalSW = 0;
      let totalHW = 0;

      let minServerIdx = Infinity;
      let maxServerIdx = -Infinity;

      // Emit individual rows
      groupSites.forEach(site => {
        const srvCount = site._serverCount || 1;
        const sw = srvCount * haMultiplier;
        const hw = isVirtual ? 0 : sw;

        let range: string;
        const unitNum = unitAssignments[site.id]?.unitNumber ?? ((site._serverIndex ?? 0) + 1);
        if (srvCount > 1) {
          range = `${unitNum}-${unitNum + srvCount - 1}`;
          minServerIdx = Math.min(minServerIdx, unitNum);
          maxServerIdx = Math.max(maxServerIdx, unitNum + srvCount - 1);
        } else {
          range = String(unitNum);
          minServerIdx = Math.min(minServerIdx, unitNum);
          maxServerIdx = Math.max(maxServerIdx, unitNum);
        }

        totalSW += sw;
        totalHW += hw;
        rows.push(makeRow(site, unitGroup, range, sw, hw, buildDesc(site)));
      });

      // Emit combined summary row spanning full server index range
      const combinedRange = minServerIdx === maxServerIdx
        ? String(minServerIdx)
        : `${minServerIdx}-${maxServerIdx}`;
      const combinedDesc = buildDesc(firstSite, `${totalSW} total instances`);
      rows.push(makeRow(firstSite, unitGroup, combinedRange, totalSW, totalHW, combinedDesc));
    }
  });

  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
      { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Drawing');
    const filename = `drawing-${drawingNum || '10'}-lucid-export.xlsx`;
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('[exportForLucid] Error:', err);
    alert('Export failed: ' + (err as Error).message);
  }
}
