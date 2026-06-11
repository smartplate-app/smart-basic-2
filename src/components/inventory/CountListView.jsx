import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, FileText, MoreHorizontal, Download, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../LanguageProvider";

import { Loader } from "lucide-react";

export default function CountListView({ counts, onEdit, onDelete, onExport, onExportSheet, exportingSheetId }) {
  const [deleteDialogItem, setDeleteDialogItem] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const { t, language } = useLanguage();

  const statusColors = {
    in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
    completed: "bg-green-50 text-green-700 border-green-200"
  };

  const countTypeLabels = {
    daily: t('daily'),
    weekly: t('weekly'),
    monthly: t('monthly'),
    quarterly: t('quarterly'),
    annual: t('annual')
  };

  const sortedCounts = [...counts].sort((a, b) => {
    if (sortBy === 'value_asc') {
      return (a.total_inventory_value || 0) - (b.total_inventory_value || 0);
    } else if (sortBy === 'value_desc') {
      return (b.total_inventory_value || 0) - (a.total_inventory_value || 0);
    } else if (sortBy === 'date_asc') {
      return new Date(a.count_date) - new Date(b.count_date);
    } else if (sortBy === 'name_asc') {
      return (a.name || a.warehouse_name || '').localeCompare(b.name || b.warehouse_name || '');
    } else if (sortBy === 'name_desc') {
      return (b.name || b.warehouse_name || '').localeCompare(a.name || a.warehouse_name || '');
    } else if (sortBy === 'status_asc') {
      return (a.status || '').localeCompare(b.status || '');
    } else if (sortBy === 'status_desc') {
      return (b.status || '').localeCompare(a.status || '');
    } else if (sortBy === 'warehouse_asc') {
      return (a.warehouse_name || '').localeCompare(b.warehouse_name || '');
    } else if (sortBy === 'warehouse_desc') {
      return (b.warehouse_name || '').localeCompare(a.warehouse_name || '');
    } else { // date_desc is default
      return new Date(b.count_date) - new Date(a.count_date);
    }
  });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Table className="w-full" dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
          <TableHeader className="bg-gray-50 border-b">
            <TableRow>
              <TableHead 
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setSortBy(sortBy === 'warehouse_desc' ? 'warehouse_asc' : 'warehouse_desc')}
              >
                <div className="flex items-center justify-end gap-1">
                  {sortBy === 'warehouse_desc' && <span className="text-gray-900">↓</span>}
                  {sortBy === 'warehouse_asc' && <span className="text-gray-900">↑</span>}
                  {t('warehouse')}
                </div>
              </TableHead>
              <TableHead 
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setSortBy(sortBy === 'name_desc' ? 'name_asc' : 'name_desc')}
              >
                <div className="flex items-center justify-end gap-1">
                  {sortBy === 'name_desc' && <span className="text-gray-900">↓</span>}
                  {sortBy === 'name_asc' && <span className="text-gray-900">↑</span>}
                  {language === 'he' ? 'שם ספירה' : 'Name'}
                </div>
              </TableHead>
              <TableHead 
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setSortBy(sortBy === 'date_desc' ? 'date_asc' : 'date_desc')}
              >
                <div className="flex items-center justify-end gap-1">
                  {sortBy === 'date_desc' && <span className="text-gray-900">↓</span>}
                  {sortBy === 'date_asc' && <span className="text-gray-900">↑</span>}
                  {t('count_date')}
                </div>
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('count_type')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('items')}
              </TableHead>
              <TableHead 
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setSortBy(sortBy === 'value_desc' ? 'value_asc' : 'value_desc')}
              >
                <div className="flex items-center justify-end gap-1">
                  {sortBy === 'value_desc' && <span className="text-gray-900">↓</span>}
                  {sortBy === 'value_asc' && <span className="text-gray-900">↑</span>}
                  {t('total_inventory_value')}
                </div>
              </TableHead>
              <TableHead 
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setSortBy(sortBy === 'status_desc' ? 'status_asc' : 'status_desc')}
              >
                <div className="flex items-center justify-end gap-1">
                  {sortBy === 'status_desc' && <span className="text-gray-900">↓</span>}
                  {sortBy === 'status_asc' && <span className="text-gray-900">↑</span>}
                  {t('status')}
                </div>
              </TableHead>
              <TableHead className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions') || 'פעולות'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {sortedCounts.map((count) => (
              <TableRow
                key={count.id}
                onDoubleClick={() => onEdit(count)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <TableCell className="px-4 py-3 text-right">
                  <div className="text-sm font-medium text-gray-900">{count.warehouse_name}</div>
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-gray-900 font-medium hover:text-indigo-600 hover:underline" onClick={(e) => { e.stopPropagation(); onEdit(count); }}>
                  {count.name || '-'}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-gray-700">
                  {new Date(count.count_date).toLocaleDateString('he-IL')}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-gray-700">
                  {countTypeLabels[count.count_type]}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-gray-700">
                  {(count.items || []).filter(i => Number(i.counted_quantity) > 0).length} / {count.items?.length || 0}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm font-bold text-green-600">
                  ₪{(count.total_inventory_value || 0).toFixed(2)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <Badge variant="secondary" className={`${statusColors[count.status]} border`}>
                    {t(`status_${count.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1 flex-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={exportingSheetId === count.id}
                      onClick={() => onExportSheet && onExportSheet(count)}
                      className="text-gray-500 hover:text-green-600 hover:bg-green-50 relative"
                      title={language === 'he' ? 'ייצוא לאקסל/Sheets' : 'Export to Sheets'}
                    >
                      {exportingSheetId === count.id ? (
                        <Loader className="w-4 h-4 animate-spin text-green-600" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onExport && onExport(count)}
                      className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                      title={t('export_pdf') || 'Export PDF'}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(count)}
                      className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                      title={t('edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeleteDialogItem(count);
                        setDeleteConfirmationText("");
                      }}
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
                </TableRow>
                ))}
                </TableBody>
                </Table>
                </div>

                <Dialog open={!!deleteDialogItem} onOpenChange={(open) => !open && setDeleteDialogItem(null)}>
                <DialogContent>
                <DialogHeader>
                <DialogTitle>{language === 'he' ? 'מחיקת ספירה' : 'Delete Count'}</DialogTitle>
                <DialogDescription>
                {language === 'he' 
                ? `האם אתה בטוח שברצונך למחוק את הספירה "${deleteDialogItem?.name || deleteDialogItem?.warehouse_name}"? פעולה זו אינה ניתנת לביטול.` 
                : `Are you sure you want to delete the count "${deleteDialogItem?.name || deleteDialogItem?.warehouse_name}"? This action cannot be undone.`}
                <br /><br />
                <span className="font-semibold text-gray-900">
                {language === 'he' ? 'כדי למחוק, הקלד "מחיקה" למטה:' : 'To delete, type "delete" below:'}
                </span>
                </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                <Input 
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder={language === 'he' ? 'מחיקה' : 'delete'}
                className="font-semibold text-center"
                />
                </div>
                <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogItem(null)}>
                {language === 'he' ? 'ביטול' : 'Cancel'}
                </Button>
                <Button 
                variant="destructive" 
                disabled={
                (language === 'he' ? deleteConfirmationText.trim() !== 'מחיקה' : deleteConfirmationText.trim().toLowerCase() !== 'delete')
                }
                onClick={() => {
                if (onDelete && deleteDialogItem) {
                  onDelete(deleteDialogItem);
                }
                setDeleteDialogItem(null);
                }}
                >
                {language === 'he' ? 'מחק' : 'Delete'}
                </Button>
                </DialogFooter>
                </DialogContent>
                </Dialog>
                </div>
                );
                }