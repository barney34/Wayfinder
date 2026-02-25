/**
 * Export functions for Sizing Calculator
 * Handles CSV, YAML, Excel, PDF, and Drawing exports
 */
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatNumber } from "@/lib/utils";
import { getSwBaseSku, getSwPackage, getHwSkuInfo, getUnitGroup } from "@/lib/tokenData";

export function exportCSV(sites, totals) {
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

export function exportYAML(sites, totals, partnerSku, bom) {
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

export function exportExcel(sites, totals, bom, partnerSku, platformMode) {
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

export function exportPDF(sites, totals, bom, partnerSku, platformMode, securityEnabled, uddiEnabled) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Site Sizing Report', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });
  doc.text(`Platform Mode: ${platformMode} | Partner SKU: ${partnerSku.sku}`, pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(9);
  const summaryY = 35;
  const boxWidth = 45;
  const boxGap = 5;
  const startX = (pageWidth - (4 * boxWidth + 3 * boxGap)) / 2;

  const summaryBoxes = [
    { label: 'Total Sites', value: sites.length.toString() },
    { label: 'Total IPs', value: totals.totalIPs.toLocaleString() },
    { label: 'Total Tokens', value: totals.totalTokens.toLocaleString() },
    { label: 'Partner SKU', value: partnerSku.sku },
  ];

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

  autoTable(doc, {
    startY: 55,
    head: [['Location', 'Type', '# IPs', 'KW', 'Role', 'Services', 'Platform', 'Model', 'SKU', 'Tokens']],
    body: [
      ...sites.map(s => [
        s.name, s.sourceType || 'Manual', s.numIPs.toLocaleString(), s.knowledgeWorkers.toLocaleString(),
        s.role, (s.services || []).join(', ') || '-', s.platform, s.recommendedModel, s.hardwareSku, s.tokens.toLocaleString()
      ]),
      ['TOTAL', '', totals.totalIPs.toLocaleString(), totals.totalKW.toLocaleString(), '', '', '', '', '', totals.infraTokens.toLocaleString()]
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    footStyles: { fillColor: [229, 231, 235], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 35 }, 1: { cellWidth: 20 }, 2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 15, halign: 'right' }, 4: { cellWidth: 20 }, 5: { cellWidth: 30 },
      6: { cellWidth: 30 }, 7: { cellWidth: 20 }, 8: { cellWidth: 30 }, 9: { cellWidth: 20, halign: 'right' },
    },
  });

  if (bom.length > 0) {
    const finalY = doc.lastAutoTable?.finalY || 55;
    if (finalY > 150) doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill of Materials', 14, finalY > 150 ? 15 : finalY + 15);
    autoTable(doc, {
      startY: finalY > 150 ? 22 : finalY + 22,
      head: [['Hardware SKU', 'Description', 'Qty', 'Sites']],
      body: bom.map(b => [b.sku, b.description, b.quantity.toString(), b.sites.slice(0, 5).join(', ') + (b.sites.length > 5 ? '...' : '')]),
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 50 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 80 } },
    });
  }

  doc.addPage();
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Token Summary', 14, 15);
  autoTable(doc, {
    startY: 22,
    head: [['Category', 'Tokens', 'Status']],
    body: [
      ['Infrastructure', totals.infraTokens.toLocaleString(), 'Active'],
      ['Security', totals.securityTokens.toLocaleString(), securityEnabled ? 'Active' : 'Disabled'],
      ['UDDI', totals.uddiTokens.toLocaleString(), uddiEnabled ? 'Active' : 'Disabled'],
      ['TOTAL', totals.totalTokens.toLocaleString(), ''],
    ],
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 40, halign: 'right' }, 2: { cellWidth: 30 } },
  });

  doc.save('site-sizing-export.pdf');
}

export function exportForLucid(sites, drawingNum, unitAssignments = {}) {
  console.log('[exportForLucid] Called with', sites?.length, 'sites, drawing:', drawingNum);
  
  if (!sites || sites.length === 0) {
    alert('No sites to export. Please add sites to the sizing table first.');
    return;
  }

  // --- Helper: build description for a site ---
  function buildDesc(site, overrideLabel) {
    if (site.description?.trim()) return site.description.trim();
    const parts = [];
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
  function makeRow(site, unitGroup, unitRange, swCount, hwCount, desc) {
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

  const rows = [];

  // Sort by role priority
  const roleOrder = {
    'GM': 0, 'GMC': 1, 'GM+DNS': 0, 'GM+DHCP': 0, 'GM+DNS/DHCP': 0,
    'GMC+DNS': 1, 'GMC+DHCP': 1, 'GMC+DNS/DHCP': 1,
    'DNS': 2, 'DNS/DHCP': 2, 'DHCP': 3,
    'Edge': 4, 'ExtDNS': 5, 'Cache': 6, 'Guest': 7,
    'MSSync': 8, 'ND': 9, 'Reporting': 10, 'LIC': 11, 'CDC': 12,
  };
  const sortedSites = [...sites].sort((a, b) =>
    (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5)
  );

  // Group expanded servers by parent site to produce individual + combined rows
  const parentGroups = new Map();
  sortedSites.forEach(site => {
    if (site.addToReport === false) return;
    const parentId = site._parentSiteId || site.id;
    if (!parentGroups.has(parentId)) parentGroups.set(parentId, []);
    parentGroups.get(parentId).push(site);
  });

  parentGroups.forEach((groupSites) => {
    const firstSite = groupSites[0];
    const unitGroup = firstSite.unitLetterOverride || getUnitGroup(firstSite.role, firstSite.sourceType, firstSite.services);

    // --- Reporting: special handling ---
    if (firstSite.role === 'Reporting') {
      const ua = unitAssignments[firstSite.id];
      const unitNum = firstSite.unitNumberOverride ?? ua?.unitNumber ?? 1;
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
      const unitNum = firstSite.unitNumberOverride ?? ua?.unitNumber ?? 1;
      const sw = haMultiplier;
      const hw = isVirtual ? 0 : sw;
      rows.push(makeRow(firstSite, unitGroup, String(unitNum), sw, hw, buildDesc(firstSite)));
    } else {
      // --- Multi-server: individual rows + combined summary ---
      let totalSW = 0;
      let totalHW = 0;

      // For multi-server groups we use SERVER INDICES (1-based position within the group)
      // NOT the global unit assignment number — keeps display consistent with UI chips.
      let minServerIdx = Infinity;
      let maxServerIdx = -Infinity;

      // Emit individual rows
      groupSites.forEach(site => {
        const srvCount = site._serverCount || 1;
        const sw = srvCount * haMultiplier;
        const hw = isVirtual ? 0 : sw;

        let range;
        if (site._groupRange) {
          // Grouped range: use server index range directly (e.g. "1-3")
          range = site._groupRange;
          const parts = site._groupRange.split('-').map(Number);
          minServerIdx = Math.min(minServerIdx, parts[0]);
          maxServerIdx = Math.max(maxServerIdx, parts[1] || parts[0]);
        } else {
          // Individual row within multi-server site: use 1-based server position
          const serverPos = (site._serverIndex ?? 0) + 1;
          range = String(serverPos);
          minServerIdx = Math.min(minServerIdx, serverPos);
          maxServerIdx = Math.max(maxServerIdx, serverPos);
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

  console.log('[exportForLucid] Created', rows.length, 'rows');

  try {
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
    console.log('[exportForLucid] Export complete');
  } catch (err) {
    console.error('[exportForLucid] Error:', err);
    alert('Export failed: ' + err.message);
  }
}
