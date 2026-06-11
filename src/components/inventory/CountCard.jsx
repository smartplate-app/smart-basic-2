import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Edit, Trash2, Package, Warehouse as WarehouseIcon, FileSpreadsheet } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function CountCard({ count, onEdit, onDelete, onExportSheet }) {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer" onClick={() => onEdit(count)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <WarehouseIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-lg text-gray-900">{count.name || count.warehouse_name}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className={`${statusColors[count.status]} border`}>
                  {t(`status_${count.status}`)}
                </Badge>
                <Badge variant="outline">
                  {countTypeLabels[count.count_type]}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(count);
              }}
              className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>{t('count_date')}: {new Date(count.count_date).toLocaleDateString('he-IL')}</span>
          </div>

          {count.total_inventory_value > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-green-900">{t('total_inventory_value')}:</span>
                <span className="text-xl font-bold text-green-600">
                  ₪{count.total_inventory_value.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Package className="w-4 h-4 text-green-500" />
              {t('items')} ({(count.items || []).filter(i => Number(i.counted_quantity) > 0).length} / {count.items?.length || 0}):
            </div>
            {count.items && count.items.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {count.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      <div className="text-sm text-gray-600">
                        {item.counted_quantity} {item.unit}
                        {item.price_per_unit > 0 && (
                          <span className="text-xs text-gray-500">
                            {' '}× ₪{item.price_per_unit}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.total_cost > 0 && (
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          ₪{item.total_cost.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {count.notes && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">{count.notes}</p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {t('created_at')}: {new Date(count.created_date).toLocaleDateString('he-IL')}
            </Badge>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onExportSheet && onExportSheet(count);
                }}
                className="border-green-600 text-green-600 hover:bg-green-50"
                title={language === 'he' ? 'ייצוא לאקסל/Sheets' : 'Export to Sheets'}
              >
                <FileSpreadsheet className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(count);
                }}
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('edit')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(count);
                }}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}