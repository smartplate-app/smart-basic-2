import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeftRight, FileText, ClipboardList, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Link } from "react-router-dom";
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

const sourceLabel = (item, language) => {
  if (!item.source_type || item.source_type === 'manual') return null;
  const isReceipt = item.source_type === 'supply_receipt';
  return {
    label: isReceipt ? (language === 'he' ? 'קבלת אספקה' : 'Supply receipt') : (language === 'he' ? 'ספירה' : 'Count'),
    icon: isReceipt ? FileText : ClipboardList,
    color: isReceipt ? 'text-blue-400' : 'text-green-500',
    url: isReceipt ? `/SupplyReceipts?highlight=${item.source_document_id}` : `/MonthlyCount?highlight=${item.source_document_id}`,
  };
};

export default function ItemListView({ items, onEdit, onDelete, selectedIds = [], onToggleSelect, onToggleSelectAll, onPreviewDocument, headerTopClass = "top-[64px] md:top-[84px]" }) {
  const { t, language } = useLanguage();

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
        return (item.nickname || item.name || '').toString().toLowerCase();
      case 'supplier_name':
        return (item.supplier_name || '').toString().toLowerCase();
      case 'catalog_number':
        return (item.catalog_number || '').toString().toLowerCase();
      case 'warehouse':
        return ((item.warehouse_names && item.warehouse_names.filter(Boolean).length > 0) 
          ? item.warehouse_names.filter(Boolean).join(', ') 
          : (item.warehouse_name || '')).toString().toLowerCase();
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
    <div className="bg-white rounded-lg shadow relative min-h-0 flex flex-col">
      <div className="md:hidden text-xs text-gray-500 bg-blue-50/40 p-2.5 flex items-center justify-center gap-2 border-b rounded-t-lg">
        <ArrowLeftRight className="w-4 h-4 animate-pulse text-blue-400" />
        <span>{language === 'he' ? 'החליקו לצדדים לצפייה בפרטים נוספים' : 'Swipe left/right for more details'}</span>
      </div>
      <div className="relative overflow-auto max-h-[calc(100vh-250px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-[inset_-12px_0_12px_-12px_rgba(0,0,0,0.1),inset_12px_0_12px_-12px_rgba(0,0,0,0.1)]">
        <table className="w-full min-w-max caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-50 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur border-b shadow-sm">
            <TableRow> {/* Replaced <tr> with <TableRow> */}
              <TableHead className="bg-white px-3 py-3 text-center">
                <Checkbox checked={allSelected} onCheckedChange={() => onToggleSelectAll && onToggleSelectAll(items)} aria-label="Select all" className="h-5 w-5 sm:h-4 sm:w-4" />
              </TableHead>
              <TableHead className="bg-white px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('name')}>
                  <span>{t('item_name')}</span>
                  {sortKey === 'name' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="bg-white px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('supplier_name')}>
                  <span>{t('supplier')}</span>
                  {sortKey === 'supplier_name' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="bg-white px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('catalog_number')}>
                  <span>{t('catalog_number')}</span>
                  {sortKey === 'catalog_number' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="bg-white px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('warehouse')}>
                  <span>{t('warehouse') || 'מחסן'}</span>
                  {sortKey === 'warehouse' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="bg-white px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('unit')}>
                  <span>{t('unit_of_measure')}</span>
                  {sortKey === 'unit' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="bg-white px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('price')}>
                  <span>{t('price')}</span>
                  {sortKey === 'price' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="bg-white px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('discount')}>
                  <span>{t('discount')}</span>
                  {sortKey === 'discount' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="bg-white px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                <button className="w-full flex items-center justify-between gap-2 select-none" onClick={() => handleSort('finalPrice')}>
                  <span>{t('final_price') || 'מחיר סופי'}</span>
                  {sortKey === 'finalPrice' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                </button>
              </TableHead>
              <TableHead className="bg-white px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                {t('actions') || 'פעולות'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {sortedItems.map((item) => {
              const src = sourceLabel(item, language);
              return (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger asChild>
                  <TableRow
                    onDoubleClick={() => onEdit(item)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <TableCell className="px-3 py-3 text-center">
                      <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => onToggleSelect && onToggleSelect(item.id)} aria-label="Select row" className="h-5 w-5 sm:h-4 sm:w-4" />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div 
                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                        className="text-sm font-bold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer inline-block"
                        title={language === 'he' ? 'לחץ לעריכת פריט' : 'Click to edit item'}
                      >
                        {item.nickname || item.name}
                        {item.nickname && <span className="text-xs text-gray-500 font-normal ml-1 rtl:mr-1 rtl:ml-0">({item.name})</span>}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{item.description}</div>
                      )}
                      {src && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <src.icon className={`w-3 h-3 ${src.color}`} />
                          <span className="text-xs text-gray-400 flex items-center gap-1">{src.label}{item.source_document_number && <><span className="mx-1">·</span><span className="font-medium" dir="ltr">{item.source_document_number}</span></>}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm text-gray-700">
                      {item.supplier_name}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm text-gray-600">
                      {item.catalog_number || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm text-gray-700 truncate max-w-[120px]" title={item.warehouse_names && item.warehouse_names.filter(Boolean).length > 0 ? item.warehouse_names.filter(Boolean).join(', ') : item.warehouse_name || '-'}>
                      {item.warehouse_names && item.warehouse_names.filter(Boolean).length > 0 
                        ? item.warehouse_names.filter(Boolean).join(', ') 
                        : item.warehouse_name || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm text-gray-700">
                      {item.units_per_package} {language === 'he' ? ({ unit: 'יחידה', liter: 'ליטר', kg: 'קילוגרם', gram: 'גרם', ml: 'מ"ל', case: 'ארגז' }[item.unit] || item.unit) : item.unit}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm text-gray-900 font-medium">
                      {item.price > 0 ? `₪${item.price.toFixed(2)}` : '-'}
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
                          ₪{getFinalPrice(item).toFixed(2)}
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
                          <DropdownMenuItem onClick={(e) => {
                            if (!(src && item.source_document_id)) {
                              e.preventDefault();
                              alert(language === 'he' ? 'לא נמצא מסמך מקור מקושר לפריט זה' : 'Source document not linked');
                            } else if (onPreviewDocument) {
                              onPreviewDocument(item.source_document_id, item.source_type);
                            }
                          }}>
                            {src && item.source_document_id ? (
                              <div className="flex items-center gap-2 cursor-pointer">
                                <ExternalLink className="w-4 h-4 shrink-0 mr-2 rtl:ml-2 rtl:mr-0" />
                                <span>
                                  {item.source_type === 'inventory_count'
                                    ? (language === 'he' ? `מספירת מלאי: ${item.source_document_number || 'ללא שם'}` : `From count: ${item.source_document_number || 'Unnamed'}`)
                                    : item.source_type === 'supply_receipt'
                                    ? (language === 'he' ? `מקבלת אספקה (מסמך ${item.source_document_number || 'ללא מספר'})` : `From receipt (Doc ${item.source_document_number || 'N/A'})`)
                                    : (language === 'he' ? 'מקור פריט' : 'Source document')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 cursor-pointer text-gray-500">
                                <FileText className="w-4 h-4 shrink-0 mr-2 rtl:ml-2 rtl:mr-0 text-amber-600" />
                                <span>
                                  {item.source_type === 'inventory_count'
                                    ? (language === 'he' ? `מספירת מלאי (חסר קישור)` : `From count (No link)`)
                                    : item.source_type === 'supply_receipt'
                                    ? (language === 'he' ? `מקבלת אספקה (חסר קישור)` : `From receipt (No link)`)
                                    : (language === 'he' ? 'מקור פריט לא ידוע' : 'Unknown source')}
                                </span>
                              </div>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Pencil className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(item)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={(e) => {
                    if (!(src && item.source_document_id)) {
                      e.preventDefault();
                      alert(language === 'he' ? 'לא נמצא מסמך מקור מקושר לפריט זה' : 'Source document not linked');
                    } else if (onPreviewDocument) {
                      onPreviewDocument(item.source_document_id, item.source_type);
                    }
                  }}>
                    {src && item.source_document_id ? (
                      <div className="flex items-center gap-2 cursor-pointer">
                        <src.icon className={`w-4 h-4 shrink-0 ${src.color} mr-2 rtl:ml-2 rtl:mr-0`} />
                        <span>
                          {item.source_type === 'inventory_count'
                            ? (language === 'he' ? `מספירת מלאי: ${item.source_document_number || 'ללא שם'}` : `From count: ${item.source_document_number || 'Unnamed'}`)
                            : item.source_type === 'supply_receipt'
                            ? (language === 'he' ? `מקבלת אספקה (מסמך ${item.source_document_number || 'ללא מספר'})` : `From receipt (Doc ${item.source_document_number || 'N/A'})`)
                            : (language === 'he' ? 'מקור פריט' : 'Source document')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 cursor-pointer text-gray-500">
                        <ExternalLink className="w-4 h-4 shrink-0 mr-2 rtl:ml-2 rtl:mr-0" />
                        <span>
                          {item.source_type === 'inventory_count'
                            ? (language === 'he' ? `מספירת מלאי (חסר קישור)` : `From count (No link)`)
                            : item.source_type === 'supply_receipt'
                            ? (language === 'he' ? `מקבלת אספקה (חסר קישור)` : `From receipt (No link)`)
                            : (language === 'he' ? 'מקור פריט לא ידוע' : 'Unknown source')}
                        </span>
                      </div>
                    )}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => onEdit(item)}>
                    <Pencil className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {language === 'he' ? 'ערוך פריט' : 'Edit item'}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => onDelete(item)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {language === 'he' ? 'מחק פריט' : 'Delete item'}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
              );
            })}
          </TableBody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {t('no_items_to_display')}
        </div>
      )}
    </div>
  );
}