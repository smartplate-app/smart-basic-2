import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, FileText, MoreHorizontal, Download } from "lucide-react";
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

export default function CountListView({ counts, onEdit, onDelete, onExport }) {
  const [deleteDialogItem, setDeleteDialogItem] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Table className="w-full">
          <TableHeader className="bg-gray-50 border-b">
            <TableRow>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('warehouse')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {language === 'he' ? 'שם ספירה' : 'Name'}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('count_date')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('count_type')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('items')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('total_inventory_value')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status')}
              </TableHead>
              <TableHead className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions') || 'פעולות'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {counts.map((count) => (
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
                  {count.items?.length || 0}
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

                {counts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                {t('no_counts_to_display')}
                </div>
                )}

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
                (language === 'he' ? deleteConfirmationText !== 'מחיקה' : deleteConfirmationText.toLowerCase() !== 'delete')
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