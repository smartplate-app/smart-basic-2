import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, MoreVertical, Eye } from "lucide-react";
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
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "../LanguageProvider";

export default function CountListView({ counts, onEdit }) {
  const { t, language } = useLanguage();

  const statusColors = {
    in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
    completed: "bg-green-50 text-green-700 border-green-200"
  };

  const countTypeLabels = {
    weekly: t('weekly'),
    monthly: t('monthly'),
    quarterly: t('quarterly'),
    annual: t('annual')
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
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
                <TableCell className="px-4 py-3 text-right text-sm text-gray-900">
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
                <TableCell className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(count)}
                      className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      {t('edit')}
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
    </div>
  );
}