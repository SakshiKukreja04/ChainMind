import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, TrendingUp, Package, Users } from 'lucide-react';

const reports = [
  {
    id: '1',
    name: 'Monthly Sales Report',
    description: 'Complete breakdown of sales performance, top products, and revenue trends.',
    icon: TrendingUp,
    lastGenerated: '2024-01-15',
    type: 'PDF',
  },
  {
    id: '2',
    name: 'Inventory Status Report',
    description: 'Current stock levels, low-stock alerts, and inventory valuation.',
    icon: Package,
    lastGenerated: '2024-01-14',
    type: 'Excel',
  },
  {
    id: '3',
    name: 'Vendor Performance Report',
    description: 'Reliability scores, lead times, and vendor comparison analysis.',
    icon: Users,
    lastGenerated: '2024-01-12',
    type: 'PDF',
  },
  {
    id: '4',
    name: 'Financial Summary',
    description: 'Profit margins, cost analysis, and cash flow overview.',
    icon: FileText,
    lastGenerated: '2024-01-10',
    type: 'PDF',
  },
];

export default function Reports() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate and download business reports.</p>
        </div>
        <Button>
          <Calendar className="h-4 w-4" />
          Schedule Report
        </Button>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reports.map((report) => (
          <div key={report.id} className="card-dashboard">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <report.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{report.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground">
                    {report.type}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Last generated: {report.lastGenerated}
                  </p>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Report Builder */}
      <div className="card-dashboard">
        <h2 className="text-lg font-semibold text-foreground mb-4">Custom Report Builder</h2>
        <p className="text-muted-foreground mb-6">
          Create custom reports by selecting the data you need and the time period.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors">
            <h4 className="font-medium text-foreground">Sales Data</h4>
            <p className="text-sm text-muted-foreground">Revenue, orders, customers</p>
          </div>
          <div className="p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors">
            <h4 className="font-medium text-foreground">Inventory Data</h4>
            <p className="text-sm text-muted-foreground">Stock, turnover, valuations</p>
          </div>
          <div className="p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors">
            <h4 className="font-medium text-foreground">Vendor Data</h4>
            <p className="text-sm text-muted-foreground">Performance, orders, costs</p>
          </div>
        </div>
        <Button className="mt-6">Generate Custom Report</Button>
      </div>
    </div>
  );
}
