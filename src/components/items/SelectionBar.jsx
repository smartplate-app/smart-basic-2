import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Warehouse, Plus, Check, ChevronDown, X } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function SelectionBar({
  selectedCount,
  onAssignToWarehouses,
  onRemoveFromCurrent,
  onCreateNew,
  warehouses = [],
  currentWarehouseName
}) {
  const { language } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [targetWarehouseIds, setTargetWarehouseIds] = useState([]);
  const isRTL = language === 'he';

  if (!selectedCount) return null;

  const toggleWarehouse = (id) => {
    setTargetWarehouseIds(prev => 
      prev.includes(id) ? prev.filter(wId => wId !== id) : [...prev, id]
    );
  };

  const selectedNames = warehouses
    .filter(w => targetWarehouseIds.includes(w.id))
    .map(w => w.name)
    .join(', ');

  const displayNames = selectedNames || (isRTL ? 'בחר מחסנים...' : 'Select warehouses...');

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-4 flex flex-col gap-3">
        
        {/* Top row: count + dismiss hint */}
        <div className={`flex items-center justify-between`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="bg-amber-400 text-gray-900 font-bold text-sm rounded-full w-7 h-7 flex items-center justify-center">
              {selectedCount}
            </div>
            <span className="text-sm text-gray-300">
              {isRTL ? `פריטים נבחרו` : `items selected`}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {isRTL ? 'שייך למחסנים' : 'Assign to warehouses'}
          </span>
        </div>

        {/* Warehouse picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(o => !o)}
            className={`w-full flex items-center justify-between gap-2 bg-white/10 hover:bg-white/15 transition-colors rounded-xl px-4 py-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
          >
            <div className={`flex items-center gap-2 overflow-hidden ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Warehouse className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className={`truncate ${targetWarehouseIds.length > 0 ? 'text-white font-medium' : 'text-gray-400'}`}>
                {displayNames}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto z-50">
              {warehouses.map((w) => {
                const isSelected = targetWarehouseIds.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWarehouse(w.id);
                    }}
                    className={`w-full px-4 py-3 text-sm text-gray-800 hover:bg-amber-50 flex items-center gap-2 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'} ${isSelected ? 'bg-amber-50 font-semibold text-amber-700' : ''}`}
                  >
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      {isSelected && <Check className="w-4 h-4 text-amber-500" />}
                    </div>
                    <Warehouse className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{w.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {currentWarehouseName && onRemoveFromCurrent && (
            <Button
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl h-10 px-3 flex-shrink-0"
              onClick={onRemoveFromCurrent}
              title={isRTL ? `הסר מ-${currentWarehouseName}` : `Remove from ${currentWarehouseName}`}
            >
              <X className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {isRTL ? 'הסר ממחסן נוכחי' : 'Remove from current'}
            </Button>
          )}
          <Button
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold rounded-xl h-10 whitespace-nowrap"
            onClick={() => {
              if (targetWarehouseIds.length > 0) {
                onAssignToWarehouses(targetWarehouseIds);
                setDropdownOpen(false);
                setTargetWarehouseIds([]);
              }
            }}
            disabled={targetWarehouseIds.length === 0}
          >
            <Check className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {isRTL ? 'שייך למחסנים' : 'Assign to warehouses'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onCreateNew}
            className="bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl h-10 w-10 flex-shrink-0"
            title={isRTL ? 'מחסן חדש' : 'New warehouse'}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}