import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getSavedReports, deleteReport, type SavedReport } from '@/lib/storage';
import { Trash2, ExternalLink } from 'lucide-react';
import { formatINR } from '@/lib/taxEngine';

interface SavedReportsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadReport: (report: SavedReport) => void;
}

export function SavedReportsMenu({ isOpen, onClose, onLoadReport }: SavedReportsMenuProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);

  useEffect(() => {
    if (isOpen) {
      setReports(getSavedReports());
    }
  }, [isOpen]);

  const handleOpen = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleDelete = (id: string) => {
    deleteReport(id);
    setReports(getSavedReports());
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[600px] border-zinc-800 bg-zinc-950 text-zinc-100 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saved Reports</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Locally saved tax calculation results. (Stored in browser)
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {reports.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-6">No saved reports found.</p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">{report.name}</h4>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {report.year} &middot; {report.totalTransactions} txns &middot; Saved on {new Date(report.timestamp).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-emerald-400/80 mt-2 font-medium">
                    Net Gain: {formatINR(report.overallSummary.total.gain)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 h-8"
                    onClick={() => {
                      onLoadReport(report);
                      onClose();
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Load
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="border-red-900/30 bg-red-900/10 text-red-400 hover:bg-red-900/30 hover:text-red-300 h-8 w-8"
                    onClick={() => handleDelete(report.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
