import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, CheckCircle2 } from "lucide-react";

export default function SelectionBar({
  selectedCount,
  currentWarehouseName,
  onAddToCurrent,
  onCreateNew
}) {
  if (!selectedCount) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-white/95 backdrop-blur border shadow-xl rounded-xl px-4 py-3 flex items-center gap-3">
        <Badge variant="secondary" className="text-sm">
          {selectedCount} selected
        </Badge>
        {currentWarehouseName ? (
          <div className="text-sm text-gray-700 hidden sm:block">
            Add to: <span className="font-semibold">{currentWarehouseName}</span>
          </div>
        ) : (
          <div className="text-sm text-gray-500 hidden sm:block">Choose a warehouse to enable quick add</div>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!currentWarehouseName}
            onClick={onAddToCurrent}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Add to current
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