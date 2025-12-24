import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SelectionBar({
  selectedCount,
  currentWarehouseName,
  onAddToCurrent,
  onCreateNew,
  warehouses = [],
  targetWarehouseId,
  onChangeTargetWarehouse
}) {
  if (!selectedCount) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-white/95 backdrop-blur border shadow-xl rounded-xl px-4 py-3 flex items-center gap-3">
        <Badge variant="secondary" className="text-sm">
          {selectedCount} selected
        </Badge>

        <div className="hidden sm:block">
          <Select value={targetWarehouseId || ""} onValueChange={(v) => onChangeTargetWarehouse && onChangeTargetWarehouse(v)}>
            <SelectTrigger className="h-8 w-56">
              <SelectValue placeholder="Choose warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-700 hidden sm:block">
          Add to: <span className="font-semibold">{currentWarehouseName || (warehouses.find(w => w.id === targetWarehouseId)?.name) || '—'}</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={onAddToCurrent}
            disabled={!targetWarehouseId}
          >
            Add to current
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateNew}
          >
            <PlusCircle className="w-4 h-4 mr-2" /> New warehouse
          </Button>
        </div>
      </div>
    </div>
  );
}