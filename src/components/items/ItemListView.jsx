import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"; // Added table component imports
import { useLanguage } from "../LanguageProvider";
import { Checkbox } from "@/components/ui/checkbox";

export default function ItemListView({ items, onEdit, onDelete, selectedIds = [], onToggleSelect, onToggleSelectAll }) {
  const { t } = useLanguage();

  const getFinalPrice = (item) => {
    if (!item.price) return 0;
    return item.discount > 0
      ? item.price * (1 - item.discount / 100)
      : item.price;
  };

  const allSelected = items.length > 0 && items.every(i => selectedIds.includes(i.id));

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="w-full"> {/* Replaced <table> with <Table> */}
          <TableHeader className="bg-gray-50 border-b"> {/* Replaced <thead> with <TableHeader> */}
            <TableRow> {/* Replaced <tr> with <TableRow> */}
              <TableHead className="px-3 py-3 text-center">
                <Checkbox checked={allSelected} onCheckedChange={() => onToggleSelectAll && onToggleSelectAll(items)} aria-label="Select all" />
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"> {/* Replaced <th> with <TableHead> */}
                {t('item_name')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('supplier')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('catalog_number')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('unit_of_measure')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('price')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('discount')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('final_price') || 'מחיר סופי'}
              </TableHead>
              <TableHead className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions') || 'פעולות'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200"> {/* Replaced <tbody> with <TableBody> */}
            {items.map((item) => (
              <TableRow
                key={item.id}
                onDoubleClick={() => onEdit(item)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              > {/* Replaced <tr> with <TableRow> */}
                <TableCell className="px-3 py-3 text-center">
                  <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => onToggleSelect && onToggleSelect(item.id)} aria-label="Select row" />
                </TableCell>
                <TableCell className="px-4 py-3 text-right"> {/* Replaced <td> with <TableCell> */}
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  {item.description && (
                    <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-gray-700">
                  {item.supplier_name}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-gray-600">
                  {item.catalog_number || '-'}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-gray-700">
                  {item.units_per_package} {t('unit_' + item.unit)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-gray-900 font-medium">
                  {item.price > 0 ? `₪${item.price.toFixed(2)}` : '-'} {/* Removed t('currency') */}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm">
                  {item.discount > 0 ? (
                    <span className="text-red-600 font-medium">{item.discount}%</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm font-bold">
                  {item.price > 0 ? (
                    <span className={item.discount > 0 ? "text-red-600" : "text-gray-900"}>
                      ₪{getFinalPrice(item).toFixed(2)} {/* Removed t('currency') */}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        {t('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(item)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {t('no_items_to_display')}
        </div>
      )}
    </div>
  );
}