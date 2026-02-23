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

export function exportForLucid(sites, drawingNum) {
  console.log('[exportForLucid] Called with', sites?.length, 'sites, drawing:', drawingNum);
  
  if (!sites || sites.length === 0) {
    alert('No sites to export. Please add sites to the sizing table first.');
    return;
  }

  const rows = [];
  let unitCounter = {};

  const sortedSites = [...sites].sort((a, b) => {
    const roleOrder = { 'GM': 0, 'GMC': 1, 'DNS/DHCP': 2, 'DNS': 3, 'DHCP': 4 };
    return (roleOrder[a.role] || 5) - (roleOrder[b.role] || 5);
  });

  console.log('[exportForLucid] Processing', sortedSites.length, 'sorted sites');

  sortedSites.forEach((site, idx) => {
    // Skip sites not marked for report
    if (site.addToReport === false) {
      console.log('[exportForLucid] Skipping site (not in report):', site.name);
      return;
    }
    
    console.log('[exportForLucid] Site', idx, site.name, site.role, 'HA:', site.haEnabled, 'Srv#:', site.serverCount);
    
    const unitGroup = getUnitGroup(site.role, site.sourceType);
    unitCounter[unitGroup] = (unitCounter[unitGroup] || 0) + 1;

    let solution = 'NIOS';
    if (site.platform?.includes('NXVS') || site.platform?.includes('NXaaS')) solution = 'UDDI';
    if (site.role === 'GM' || site.role === 'GMC') solution = 'NIOS';

    const model = site.recommendedModel || site.platform || 'TBD';
    const swBaseSku = getSwBaseSku(model);
    const swPackage = getSwPackage(site.role, (site.services || []).includes('Discovery'));
    const hwInfo = getHwSkuInfo(model);

    // Description: siteName - role + services
    let description = site.role || 'DNS/DHCP';
    if (site.services && site.services.length > 0) description += ` + ${site.services.join(', ')}`;
    if (site.name) description = `${site.name} - ${description}`;

    // SW Add-ons based on services
    const swAddons = [];
    if ((site.services || []).includes('DFP')) swAddons.push('ADP');
    if ((site.services || []).includes('NTP')) swAddons.push('NTP');

    // SW Instances: serverCount * (HA ? 2 : 1)
    const swInstances = site.swInstances || (site.serverCount || 1) * (site.haEnabled ? 2 : 1);
    
    // HW Count: use site.hwCount if defined, otherwise auto-calculate
    const isVirtual = site.platform?.includes('NXVS') || site.platform?.includes('NXaaS') || 
                      site.platform === 'NIOS-V' || site.platform === 'NIOS-VHA';
    const hwCount = site.hwCount !== undefined ? site.hwCount : (isVirtual ? 0 : swInstances);

    // Unit # or Range
    let unitRange = unitCounter[unitGroup].toString();
    if (site.serverCount > 1 || swInstances > 1) {
      const startNum = unitCounter[unitGroup];
      unitRange = `${startNum}-${startNum + swInstances - 1}`;
      unitCounter[unitGroup] += swInstances - 1; // Account for multiple units
    }

    rows.push({
      'Drawing #': drawingNum || '',
      'Unit Group': unitGroup,
      'Unit #/Range': unitRange,
      'Solution': solution,
      'Model Info': model,
      'SW Instances': swInstances,
      'Description': description,
      'SW Base SKU': swBaseSku,
      'SW Package': swPackage,
      'SW Add-ons': swAddons.join(', ') || '',
      'HW License SKU': hwInfo.hwSku,
      'HW Add-ons': '',
      'HW Count': hwCount,
      'Add to Report': site.addToReport !== false ? 'Yes' : 'No',
      'Add to BOM': site.addToBom !== false ? 'Yes' : 'No',
    });
  });

  console.log('[exportForLucid] Created', rows.length, 'rows');

  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, // Drawing #
      { wch: 10 }, // Unit Group
      { wch: 12 }, // Unit #/Range
      { wch: 10 }, // Solution
      { wch: 15 }, // Model Info
      { wch: 12 }, // SW Instances
      { wch: 35 }, // Description
      { wch: 18 }, // SW Base SKU
      { wch: 12 }, // SW Package
      { wch: 15 }, // SW Add-ons
      { wch: 18 }, // HW License SKU
      { wch: 12 }, // HW Add-ons
      { wch: 10 }, // HW Count
      { wch: 12 }, // Add to Report
      { wch: 12 }, // Add to BOM
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Drawing');
    const filename = `drawing-${drawingNum || '1'}-lucid-export.xlsx`;
    console.log('[exportForLucid] Writing file:', filename);
    XLSX.writeFile(wb, filename);
    console.log('[exportForLucid] Export complete');
  } catch (err) {
    console.error('[exportForLucid] Error:', err);
    alert('Export failed: ' + err.message);
  }
}
