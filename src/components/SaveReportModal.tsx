import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SaveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, year: string) => void;
  defaultYear: string;
}

export function SaveReportModal({ isOpen, onClose, onSave, defaultYear }: SaveReportModalProps) {
  const [name, setName] = useState('');
  const [year, setYear] = useState(defaultYear);

  useEffect(() => {
    if (isOpen) {
      setYear(defaultYear);
      setName('');
    }
  }, [isOpen, defaultYear]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), year.trim() || defaultYear);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] border-zinc-800 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Save Results Locally</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Provide a name and year to save this analyzed report in your browser for future reference. (Input data is not saved to conserve space).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right text-xs font-medium text-zinc-400">
              Name
            </label>
            <Input
              id="name"
              placeholder="e.g. Zerodha Portfolio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3 border-zinc-800 bg-zinc-900 focus-visible:ring-zinc-700"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="year" className="text-right text-xs font-medium text-zinc-400">
              Year
            </label>
            <Input
              id="year"
              placeholder="e.g. FY 23-24"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="col-span-3 border-zinc-800 bg-zinc-900 focus-visible:ring-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="bg-zinc-200 text-zinc-900 hover:bg-zinc-300">
            Save Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
