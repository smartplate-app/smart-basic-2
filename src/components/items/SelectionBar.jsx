import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Merge } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "../LanguageProvider";

export default function SelectionBar({
  selectedCount,
  currentWarehouseName,
  onAddToCurrent,
  onCreateNew,
  onMerge,
  warehouses = [],
  targetWarehouseId,
  onChangeTargetWarehouse
}) {
  const { language } = useLanguage();

  if (!selectedCount) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className={`bg-white/95 backdrop-blur border shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 ${language === 'he' ? 'flex-row-reverse' : ''}`}>
        <Badge variant="secondary" className="text-sm">
          {selectedCount} {language === 'he' ? 'נבחרו' : 'selected'}
        </Badge>

        <div className="hidden sm:block">
          <Select value={targetWarehouseId || ""} onValueChange={(v) => onChangeTargetWarehouse && onChangeTargetWarehouse(v)}>
            <SelectTrigger className={`h-8 w-56 ${language === 'he' ? 'text-right flex-row-reverse' : ''}`}>
              <SelectValue placeholder={language === 'he' ? 'בחר מחסן' : 'Choose warehouse'} />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id} className={language === 'he' ? 'flex-row-reverse justify-end' : ''}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-700 hidden sm:block whitespace-nowrap">
          {language === 'he' ? 'הוסף ל:' : 'Add to:'} <span className="font-semibold">{currentWarehouseName || (warehouses.find(w => w.id === targetWarehouseId)?.name) || '—'}</span>
        </div>
        <div className={`flex gap-2 ${language === 'he' ? 'flex-row-reverse' : ''}`}>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={onAddToCurrent}
            disabled={!targetWarehouseId}
          >
            {language === 'he' ? 'הוסף למחסן' : 'Add to current'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateNew}
          >
            <PlusCircle className={`w-4 h-4 ${language === 'he' ? 'ml-2' : 'mr-2'}`} /> {language === 'he' ? 'מחסן חדש' : 'New warehouse'}
          </Button>
          {selectedCount > 1 && onMerge && (
            <Button
              size="sm"
              variant="secondary"
              className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200"
              onClick={onMerge}
            >
              <Merge className={`w-4 h-4 ${language === 'he' ? 'ml-2' : 'mr-2'}`} /> {language === 'he' ? 'אחד פריטים' : 'Merge Items'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}