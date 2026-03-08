/**
 * ImportExportSection Component
 * Handles data import and export functionality
 */

import { useState } from "react";
import { Download, FolderSync } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import yaml from "js-yaml";

export function ImportExportSection({ customerId, customerName }) {
  const { answers, notes, meetingNotes, contextFields, updateAnswers } = useDiscovery();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [exportType, setExportType] = useState('discovery');

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let data;
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        data = yaml.load(text);
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const idIdx = headers.indexOf('Question ID');
        const ansIdx = headers.indexOf('Answer');
        if (idIdx === -1 || ansIdx === -1) throw new Error('CSV must have "Question ID" and "Answer" columns');
        const imported = {};
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].match(/(".*?"|[^,]*)/g)?.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || [];
          if (cols[idIdx] && cols[ansIdx]) imported[cols[idIdx]] = cols[ansIdx];
        }
        data = { answers: imported };
      } else {
        throw new Error('Unsupported file format. Use .json, .yaml, or .csv');
      }

      if (data.answers) {
        updateAnswers(data.answers);
        toast({ title: "Import successful", description: `Imported ${Object.keys(data.answers).length} answers.` });
      } else if (data.sections) {
        const imported = {};
        Object.values(data.sections).forEach(section => {
          if (Array.isArray(section)) {
            section.forEach(q => { if (q.id && q.answer) imported[q.id] = q.answer; });
          }
        });
        updateAnswers(imported);
        toast({ title: "Import successful", description: `Imported ${Object.keys(imported).length} answers.` });
      } else {
        toast({ title: "Import failed", description: "Could not find answers in the file.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const exportData = (format) => {
    const data = {
      customer: customerName,
      exportedAt: new Date().toISOString(),
      type: exportType,
      answers,
      notes,
      meetingNotes,
      contextFields,
    };

    let content, filename, mimeType;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = `${customerName}-${exportType}-export.json`;
      mimeType = 'application/json';
    } else if (format === 'yaml') {
      content = yaml.dump(data);
      filename = `${customerName}-${exportType}-export.yaml`;
      mimeType = 'text/yaml';
    } else if (format === 'csv') {
      const rows = [['Question ID', 'Answer', 'Note']];
      Object.entries(answers).forEach(([id, answer]) => {
        rows.push([id, answer || '', notes[id] || '']);
      });
      content = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      filename = `${customerName}-${exportType}-export.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export successful", description: `Exported ${exportType} data as ${format.toUpperCase()}.` });
  };

  return (
    <div className="space-y-6" data-testid="import-export-section">
      <div className="flex items-center justify-between">
        <h2 className="text-base lg:text-lg font-semibold flex items-center gap-2">
          <FolderSync className="h-5 w-5" />
          Import / Export
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              Import Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import discovery data from a previously exported file.
            </p>
            <label className="cursor-pointer inline-block">
              <input type="file" accept=".json,.yaml,.yml,.csv" onChange={handleFileImport} className="hidden" data-testid="import-file-input" />
              <Button variant="outline" asChild disabled={importing}>
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {importing ? 'Importing...' : 'Choose File'}
                </span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground">Supports .json, .yaml, .csv</p>
          </CardContent>
        </Card>

        {/* Export Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4 rotate-180" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export your discovery data to share or backup.
            </p>
            
            {/* Export Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Export Type</label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger className="w-full" data-testid="export-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discovery">Discovery Questions</SelectItem>
                  <SelectItem value="sizing">Sizing Data</SelectItem>
                  <SelectItem value="tokens">Token Calculations</SelectItem>
                  <SelectItem value="all">All Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Format Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => exportData('json')} data-testid="export-json">
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportData('yaml')} data-testid="export-yaml">
                YAML
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportData('csv')} data-testid="export-csv">
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
