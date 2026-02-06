import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Package,
  Users,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Trash2,
  Plus,
} from 'lucide-react';
import { reportApi, type ReportScheduleItem } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const REPORT_TYPES = [
  { key: 'monthly-sales', label: 'Monthly Sales Report', icon: TrendingUp, desc: 'Revenue, top products, and sales trends.' },
  { key: 'inventory-status', label: 'Inventory Status Report', icon: Package, desc: 'Stock levels, low-stock alerts, and inventory valuation.' },
  { key: 'vendor-performance', label: 'Vendor Performance Report', icon: Users, desc: 'Reliability scores, lead times, and delivery rates.' },
  { key: 'financial-summary', label: 'Financial Summary', icon: FileText, desc: 'Revenue breakdown, inventory value, and expenses.' },
] as const;

type ReportTypeKey = (typeof REPORT_TYPES)[number]['key'];

export default function Reports() {
  const { toast } = useToast();
  const [previewing, setPreviewing] = useState<ReportTypeKey | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ReportScheduleItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ reportType: 'monthly-sales' as string, cronExpression: '0 8 1 * *', format: 'EXCEL' as string });
  const [creatingSchedule, setCreatingSchedule] = useState(false);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoadingSchedules(true);
      const res = await reportApi.listSchedules();
      setSchedules(res.schedules);
    } catch { /* ignore */ } finally {
      setLoadingSchedules(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const handlePreview = async (type: ReportTypeKey) => {
    setPreviewing(type);
    setPreviewData(null);
    try {
      const res = await reportApi.get(type);
      setPreviewData(res.data);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to load report', variant: 'destructive' });
      setPreviewing(null);
    }
  };

  const handleDownload = async (type: ReportTypeKey, format: 'excel' | 'pdf') => {
    const dlKey = `${type}-${format}`;
    setDownloading(dlKey);
    try {
      await reportApi.download(type, format);
      toast({ title: 'Downloaded', description: `${format.toUpperCase()} report downloaded.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Download failed', variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  const handleCreateSchedule = async () => {
    setCreatingSchedule(true);
    try {
      await reportApi.createSchedule(newSchedule);
      toast({ title: 'Schedule created', description: 'Report will be generated on schedule.' });
      setScheduleDialogOpen(false);
      fetchSchedules();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to create schedule', variant: 'destructive' });
    } finally {
      setCreatingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await reportApi.deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => s._id !== id));
      toast({ title: 'Deleted', description: 'Schedule removed.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate, preview, and download business reports.</p>
        </div>
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Calendar className="h-4 w-4" />
              Schedule Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Schedule a Report</DialogTitle>
              <DialogDescription>
                Set up automatic report generation with a cron schedule.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={newSchedule.reportType} onValueChange={(v) => setNewSchedule({ ...newSchedule, reportType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((r) => (<SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cron Expression</Label>
                <Input value={newSchedule.cronExpression} onChange={(e) => setNewSchedule({ ...newSchedule, cronExpression: e.target.value })} placeholder="0 8 1 * *" />
                <p className="text-xs text-muted-foreground">Default: 1st of every month at 8am UTC</p>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={newSchedule.format} onValueChange={(v) => setNewSchedule({ ...newSchedule, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCEL">Excel</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="JSON">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSchedule} disabled={creatingSchedule}>
                {creatingSchedule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {REPORT_TYPES.map((report) => (
          <div key={report.key} className="card-dashboard">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <report.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{report.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{report.desc}</p>
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handlePreview(report.key)} disabled={previewing === report.key}>
                    {previewing === report.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    Preview
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1"
                    onClick={() => handleDownload(report.key, 'excel')}
                    disabled={downloading === `${report.key}-excel`}>
                    {downloading === `${report.key}-excel` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    Excel
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1"
                    onClick={() => handleDownload(report.key, 'pdf')}
                    disabled={downloading === `${report.key}-pdf`}>
                    {downloading === `${report.key}-pdf` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Preview */}
      {previewing && previewData && (
        <div className="card-dashboard">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {REPORT_TYPES.find((r) => r.key === previewing)?.label} — Preview
            </h2>
            <Button size="sm" variant="ghost" onClick={() => { setPreviewing(null); setPreviewData(null); }}>Close</Button>
          </div>
          <div className="max-h-96 overflow-auto rounded-lg border p-4">
            <pre className="text-sm text-foreground whitespace-pre-wrap">
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Scheduled Reports */}
      <div className="card-dashboard">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Scheduled Reports</h2>
          <Button variant="ghost" size="sm" onClick={fetchSchedules}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {loadingSchedules ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No scheduled reports. Use the "Schedule Report" button above.
          </p>
        ) : (
          <div className="space-y-3">
            {schedules.map((sch) => (
              <div key={sch._id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{sch.reportType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  <p className="text-xs text-muted-foreground">
                    Cron: {sch.cronExpression} &bull; Format: {sch.format}
                    {sch.lastRunAt && ` • Last: ${new Date(sch.lastRunAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={sch.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                    {sch.isActive ? 'Active' : 'Paused'}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteSchedule(sch._id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
