import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, MoreVertical, Pencil, Package, FileText, ClipboardList, ExternalLink } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { Link } from "react-router-dom";

export default function ItemCard({ item, onEdit, onDelete, selectable = true, selected = false, onToggleSelect }) {
  const { t } = useLanguage();

  const handleDoubleClick = () => {
    onEdit(item);
  };

  const finalPrice = item.price_after_discount || (item.price && item.discount > 0 
    ? item.price * (1 - (item.discount / 100))
    : item.price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onDoubleClick={handleDoubleClick}
      className="cursor-pointer"
    >
      <Card className="hover:shadow-xl transition-shadow duration-300 bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div className="flex items-start gap-3 flex-1">
            {selectable && (
              <Checkbox
                checked={!!selected}
                onCheckedChange={() => onToggleSelect && onToggleSelect(item.id)}
                aria-label="Select item"
              />
            )}
            <div className="flex-1">
            <CardTitle 
              className="text-lg font-bold text-gray-900 hover:text-green-600 transition-colors cursor-pointer flex flex-col"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
            >
              <span>{item.nickname || item.name}</span>
              {item.nickname && <span className="text-xs text-gray-500 font-normal">{item.name}</span>}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{item.supplier_name}</p>
            {item.catalog_number && (
              <p className="text-xs text-gray-500 mt-1">
                {t('catalog_number')}: {item.catalog_number}
              </p>
            )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild={!!item.source_document_id} onClick={(e) => {
                if (!item.source_document_id) {
                  e.preventDefault();
                  alert(t('language') === 'he' ? 'לא נמצא מסמך מקור מקושר לפריט זה' : 'Source document not linked');
                }
              }}>
                {item.source_document_id ? (
                  <Link to={item.source_type === 'inventory_count' ? `/MonthlyCount?highlight=${item.source_document_id}` : `/SupplyReceipts?highlight=${item.source_document_id}`} className="flex items-center gap-2 cursor-pointer">
                    <FileText className="w-4 h-4 shrink-0 mr-2 rtl:ml-2 rtl:mr-0 text-amber-600" />
                    <span>
                      {item.source_type === 'inventory_count' 
                        ? (t('language') === 'he' ? `מספירת מלאי: ${item.source_document_number || 'ללא שם'}` : `From count: ${item.source_document_number || 'Unnamed'}`)
                        : item.source_type === 'supply_receipt'
                        ? (t('language') === 'he' ? `מקבלת אספקה (מסמך ${item.source_document_number || 'ללא מספר'})` : `From receipt (Doc ${item.source_document_number || 'N/A'})`)
                        : (t('language') === 'he' ? 'מקור פריט' : 'Source document')}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 cursor-pointer text-gray-500">
                    <FileText className="w-4 h-4 shrink-0 mr-2 rtl:ml-2 rtl:mr-0 text-amber-600" />
                    <span>
                      {item.source_type === 'inventory_count'
                        ? (t('language') === 'he' ? `מספירת מלאי (חסר קישור)` : `From count (No link)`)
                        : item.source_type === 'supply_receipt'
                        ? (t('language') === 'he' ? `מקבלת אספקה (חסר קישור)` : `From receipt (No link)`)
                        : (t('language') === 'he' ? 'מקור פריט לא ידוע' : 'Unknown source')}
                    </span>
                  </div>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(item)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 break-words">
              {item.units_per_package} {t('unit_' + item.unit)} {t('per')} {t('package')}
            </span>
          </div>
          
          {item.price > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {item.discount > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">{t('price_per_unit') || 'מחיר ליחידה'}:</span>
                    <span className="line-through text-gray-400 text-sm">₪{item.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-orange-600 whitespace-nowrap">{t('discount') || 'הנחה'}:</span>
                    <span className="text-orange-600 text-sm font-medium">{item.discount}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <span className="text-sm text-green-700 font-bold">{t('price_after_discount') || 'מחיר אחרי הנחה'}:</span>
                    <span className="text-xl font-bold text-green-700">₪{finalPrice.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600">{t('price_per_unit') || 'מחיר ליחידה'}:</span>
                  <span className="text-xl font-bold text-gray-900">₪{item.price.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {item.description && (
            <p className="text-sm text-gray-600 mt-2">{item.description}</p>
          )}

          {item.source_type && item.source_type !== 'manual' && (
            <div className="flex items-center gap-1.5 pt-2 border-t">
              {item.source_type === 'supply_receipt' ? (
                <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
              ) : (
                <ClipboardList className="w-3 h-3 text-green-400 flex-shrink-0" />
              )}
              <span className="text-xs text-gray-400 flex items-center gap-1">
                {item.source_type === 'supply_receipt'
                  ? (t('language') === 'he' ? 'קבלת אספקה' : 'Supply receipt')
                  : (t('language') === 'he' ? 'ספירה' : 'Count')}
                {item.source_document_number && (
                  <>
                    <span className="mx-1">·</span>
                    <span className="font-medium text-gray-500" dir="ltr">{item.source_document_number}</span>
                  </>
                )}
              </span>
            </div>
          )}
          {(!item.source_type || item.source_type === 'manual') && (
            <div className="text-xs text-gray-400 pt-2 border-t">
              {t('created_at')}: {new Date(item.created_date).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}