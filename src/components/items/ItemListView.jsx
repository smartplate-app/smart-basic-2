import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

  // Sorting state
  const [sortKey, setSortKey] = React.useState('name');
  const [sortDir, setSortDir] = React.useState('asc'); // 'asc' | 'desc'

  const handleSort = (key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      } else {
        setSortDir('asc');
        return key;
      }
    });
  };

  const getSortValue = (item, key) => {
    switch (key) {
      case 'name':
        return (item.name || '').toString().toLowerCase();
      case 'supplier_name':
        return (item.supplier_name || '').toString().toLowerCase();
      case 'catalog_number':
        return (item.catalog_number || '').toString().toLowerCase();
      case 'unit':
        return `${item.unit || ''}_${item.units_per_package || 0}`;
      case 'price':
        return Number(item.price) || 0;
      case 'discount':
        return Number(item.discount) || 0;
      case 'finalPrice':
        return getFinalPrice(item) || 0;
      default:
        return '';
    }
  };

  const sortedItems = React.useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [items, sortKey, sortDir]);

  function getFinalPrice(item) {
    if (!item.price) return 0;
    return item.discount > 0
      ? item.price * (1 - item.discount / 100)
      : item.price;
  }

  const allSelected = items.length > 0 && items.every(i => selectedIds.includes(i.id));

  return (
    <div className="bg-white rounded-lg shadow relative min-h-0">
      <div>
        <Table className="w-full min-w-max"> {/* Replaced <table> with <Table> */}
          <TableHeader className="sticky top-20 md:top-16 z-10 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/80 backdrop-blur border-b shadow-sm"> {/* Sticky header below filters */}
            <TableRow> {/* Replaced <tr> with <TableRow> */}
              <TableHead className="sticky top-20 md:top-16 z-10 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur px-3 py-3 text-center bg-white">
                <Checkbox checked={allSelected} onCheckedChange={() => onToggleSelectAll && onToggleSelectAll(items)} aria-label="Select all" className="h-5 w-5 sm:h-4 sm:w-4" />
              </TableHead>
              <TableHead className="sticky top-20 md:top-16 z-10 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('name')}>
                  <span>{t('item_name')}</span>
                  {sortKey === 'name' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="sticky top-20 md:top-16 z-10 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('supplier_name')}>
                  <span>{t('supplier')}</span>
                  {sortKey === 'supplier_name' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="sticky top-20 md:top-16 z-10 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('catalog_number')}>
                  <span>{t('catalog_number')}</span>
                  {sortKey === 'catalog_number' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="sticky top-20 md:top-16 z-10 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('unit')}>
                  <span>{t('unit_of_measure')}</span>
                  {sortKey === 'unit' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="sticky top-20 md:top-16 z-10 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('price')}>
                  <span>{t('price')}</span>
                  {sortKey === 'price' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="sticky top-20 md:top-16 z-10 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('discount')}>
                  <span>{t('discount')}</span>
                  {sortKey === 'discount' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="sticky top-20 md:top-16 z-10 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('finalPrice')}>
                  <span>{t('final_price') || 'מחיר סופי'}</span>
                  {sortKey === 'finalPrice' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="sticky top-20 md:top-16 z-10 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                {t('actions') || 'פעולות'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200"> {/* Replaced <tbody> with <TableBody> */}
            {sortedItems.map((item) => (
              <TableRow
                key={item.id}
                onDoubleClick={() => onEdit(item)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              > {/* Replaced <tr> with <TableRow> */}
                <TableCell className="px-3 py-3 text-center">
                  <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => onToggleSelect && onToggleSelect(item.id)} aria-label="Select row" className="h-5 w-5 sm:h-4 sm:w-4" />
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
                      <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8">
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