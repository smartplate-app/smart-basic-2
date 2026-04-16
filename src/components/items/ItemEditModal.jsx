import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { useLanguage } from "../LanguageProvider";
import { X, ChevronDown } from "lucide-react";

export default function ItemEditModal({ item, suppliers, warehouses, isOpen, onClose, onSave }) {
  const [formData, setFormData] = React.useState(item || {});
  const { t } = useLanguage();

  React.useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWarehouseToggle = (warehouseId, warehouseName) => {
    setFormData(prev => {
      let currentIds = prev.warehouse_ids || [];
      let currentNames = prev.warehouse_names || [];
      
      if (prev.warehouse_id && !currentIds.includes(prev.warehouse_id)) {
        currentIds = [...currentIds, prev.warehouse_id];
        currentNames = [...currentNames, prev.warehouse_name];
      }

      if (currentIds.includes(warehouseId)) {
        currentIds = currentIds.filter(id => id !== warehouseId);
        currentNames = currentNames.filter(name => name !== warehouseName);
      } else {
        currentIds = [...currentIds, warehouseId];
        currentNames = [...currentNames, warehouseName];
      }

      return {
        ...prev,
        warehouse_ids: currentIds,
        warehouse_names: currentNames,
        warehouse_id: currentIds.length > 0 ? currentIds[0] : "",
        warehouse_name: currentNames.length > 0 ? currentNames[0] : ""
      };
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('edit_item')}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('item_name')} *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catalog_number">{t('catalog_number')}</Label>
            <Input
              id="catalog_number"
              value={formData.catalog_number || ''}
              onChange={(e) => handleChange('catalog_number', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier_id">{t('supplier')} *</Label>
            <Select
              value={formData.supplier_id || ''}
              onValueChange={(value) => {
                const supplier = suppliers?.find(s => s.id === value);
                handleChange('supplier_id', value);
                if (supplier) handleChange('supplier_name', supplier.name);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('select_supplier')} />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse_ids">{t('warehouse')}</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal overflow-hidden">
                  <span className="truncate">
                    {((formData.warehouse_names && formData.warehouse_names.length > 0) || formData.warehouse_name)
                      ? (formData.warehouse_names && formData.warehouse_names.length > 0 
                          ? formData.warehouse_names.join(", ") 
                          : formData.warehouse_name)
                      : t('select_warehouse')}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {warehouses?.map(warehouse => {
                  const isSelected = (formData.warehouse_ids && formData.warehouse_ids.includes(warehouse.id)) || formData.warehouse_id === warehouse.id;
                  return (
                    <DropdownMenuCheckboxItem
                      key={warehouse.id}
                      checked={isSelected}
                      onCheckedChange={() => handleWarehouseToggle(warehouse.id, warehouse.name)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {warehouse.name}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">{t('unit_of_measure')} *</Label>
              <Select
                value={formData.unit || 'unit'}
                onValueChange={(value) => handleChange('unit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">{t('unit_kg')}</SelectItem>
                  <SelectItem value="gram">{t('unit_g')}</SelectItem>
                  <SelectItem value="liter">{t('unit_liter')}</SelectItem>
                  <SelectItem value="ml">{t('unit_ml')}</SelectItem>
                  <SelectItem value="unit">{t('unit_piece')}</SelectItem>
                  <SelectItem value="case">{t('unit_case') || 'ארגז'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="units_per_package">{t('units_per_package')}</Label>
              <Input
                id="units_per_package"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.units_per_package || ''}
                onChange={(e) => handleChange('units_per_package', parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">{t('price')}</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price || 0}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">{t('discount')} %</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.discount || 0}
                onChange={(e) => handleChange('discount', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">{t('final_price') || 'Final Price'}:</span>
              <span className="text-lg font-bold text-green-700">
                {(formData.price && formData.discount 
                  ? (formData.price / (1 + (formData.discount / 100))).toFixed(2)
                  : (formData.price || 0).toFixed(2)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-green-200/50 pt-1">
              <span className="text-sm text-green-700">
                {t('price_per_unit') || 'Price per '}{(() => {
                  if (formData.unit === 'kg') return t('unit_kg') || 'Kg';
                  if (formData.unit === 'gram') return t('unit_g') || 'Gram';
                  if (formData.unit === 'liter') return t('unit_liter') || 'Liter';
                  if (formData.unit === 'ml') return t('unit_ml') || 'Ml';
                  if (formData.unit === 'case') return t('unit_piece') || 'Unit';
                  return t('unit_piece') || 'Unit';
                })()}:
              </span>
              <span className="text-md font-bold text-green-700">
                {((formData.price ? (formData.price / (1 + ((formData.discount || 0) / 100))) : 0) / (formData.units_per_package || 1)).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <Label htmlFor="minimum_stock" className="text-orange-800 font-semibold">
              {t('minimum_stock') || 'מלאי מינימום'} 📦
            </Label>
            <Input
              id="minimum_stock"
              type="number"
              step="0.01"
              min="0"
              value={formData.minimum_stock || 0}
              onChange={(e) => handleChange('minimum_stock', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-orange-600">
              {t('minimum_stock_help') || 'השאר 0 אם לא רלוונטי. כשמוגדר - בהזמנה תקבל הצעה חכמה כמה להזמין'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-[#d4a373] hover:bg-[#b88c60]">
              {t('save')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('cancel')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}