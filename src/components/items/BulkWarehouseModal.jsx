import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "../LanguageProvider";
import { Loader2 } from "lucide-react";

export default function BulkWarehouseModal({
  isOpen,
  onClose,
  selectedCount,
  warehouses = [],
  onAssignToWarehouses,
}) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [targetWarehouseIds, setTargetWarehouseIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleWarehouse = (id) => {
    setTargetWarehouseIds((prev) =>
      prev.includes(id) ? prev.filter((wId) => wId !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (targetWarehouseIds.length === 0) return;
    setSaving(true);
    try {
      await onAssignToWarehouses(targetWarehouseIds);
      setTargetWarehouseIds([]);
      onClose();
    } catch (e) {
      console.error(e);
      alert(isRTL ? 'שגיאה בשיוך למחסנים' : 'Error assigning to warehouses');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={isRTL ? 'text-right' : 'text-left'}>
        <DialogHeader>
          <DialogTitle>{isRTL ? 'שייך למחסנים' : 'Assign to warehouses'}</DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? `שייך ${selectedCount} פריטים נבחרים למחסנים הבאים:` : `Assign ${selectedCount} selected items to the following warehouses:`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {warehouses.map((w) => (
            <div key={w.id} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Checkbox
                id={`wh-${w.id}`}
                checked={targetWarehouseIds.includes(w.id)}
                onCheckedChange={() => toggleWarehouse(w.id)}
              />
              <label
                htmlFor={`wh-${w.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {w.name}
              </label>
            </div>
          ))}
          {warehouses.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4">
              {isRTL ? 'לא נמצאו מחסנים' : 'No warehouses found'}
            </div>
          )}
        </div>

        <DialogFooter className={`gap-2 sm:gap-0 ${isRTL ? 'sm:justify-start flex-row-reverse' : ''}`}>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {isRTL ? 'ביטול' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving || targetWarehouseIds.length === 0} className="bg-amber-500 hover:bg-amber-600 text-white">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin rtl:ml-2 rtl:mr-0" />}
            {isRTL ? 'שמור שיוך' : 'Save Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}