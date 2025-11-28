
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Trash2, MoreVertical, Pencil, Package } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function ItemCard({ item, onEdit, onDelete }) {
  const { t } = useLanguage();

  const handleDoubleClick = () => {
    onEdit(item);
  };

  const finalPrice = item.price && item.discount > 0 
    ? item.price * (1 - item.discount / 100) 
    : item.price;

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
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900">
              {item.name}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{item.supplier_name}</p>
            {item.catalog_number && (
              <p className="text-xs text-gray-500 mt-1">
                {t('catalog_number')}: {item.catalog_number}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="w-4 h-4 mr-2" />
                {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">
              {item.units_per_package} {t('unit_' + item.unit)} {t('per')} {t('package')}
            </span>
          </div>
          
          {item.price > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              {item.discount > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('price_per_unit')}:</span>
                    <span className="line-through text-gray-400">{item.price}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-600 font-medium">{t('discount')} {item.discount}%:</span>
                    <span className="text-lg font-bold text-red-600">
                      {finalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('price_per_unit')}:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {item.price}
                  </span>
                </div>
              )}
            </div>
          )}

          {item.description && (
            <p className="text-sm text-gray-600 mt-2">{item.description}</p>
          )}

          <div className="text-xs text-gray-400 pt-2 border-t">
            {t('created_at')}: {new Date(item.created_date).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
