import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { X, Plus, ChevronDown } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { Warehouse } from "@/entities/Warehouse";

export default function ItemForm({ item, suppliers, warehouses, onSubmit, onCancel, onWarehouseCreated, defaultSupplierId }) {
  const { t, language } = useLanguage();

  const UNITS = [
    { value: "kg", label: t('unit_kg') || "ק״ג" },
    { value: "gram", label: t('unit_g') || "גרם" },
    { value: "liter", label: t('unit_liter') || "ליטר" },
    { value: "ml", label: t('unit_ml') || "מ״ל" },
    { value: "unit", label: t('unit_piece') || "יחידה" },
    { value: "case", label: t('unit_case') || "ארגז" }
  ];

  const [currentItem, setCurrentItem] = React.useState(() => {
    if (item) {
      const badIds = ["multi", "all_summary", ""];
      const badNames = ["ספירה מרובת מחסנים", "Multi-Warehouse Count", ""];
      let wIds = item.warehouse_ids || (item.warehouse_id ? [item.warehouse_id] : []);
      let wNames = item.warehouse_names || (item.warehouse_name ? [item.warehouse_name] : []);
      
      const filteredIds = [];
      const filteredNames = [];
      wIds.forEach((id, idx) => {
        const name = wNames[idx] || "";
        if (id && typeof id === 'string' && id.trim() !== "" && !badIds.includes(id) && !badNames.includes(name)) {
          filteredIds.push(id);
          filteredNames.push(name);
        }
      });
      return {
        ...item,
        warehouse_ids: filteredIds,
        warehouse_names: filteredNames,
        warehouse_id: filteredIds[0] || "",
        warehouse_name: filteredNames[0] || ""
      };
    }
    return {
      name: "",
      nickname: "",
      supplier_id: (defaultSupplierId) ? defaultSupplierId : (suppliers && suppliers.length === 1 ? suppliers[0].id : ""),
      supplier_name: (defaultSupplierId ? (suppliers.find(s => s.id === defaultSupplierId)?.name || "") : (suppliers && suppliers.length === 1 ? suppliers[0].name : "")),
      catalog_number: "",
      warehouse_id: "",
      warehouse_name: "",
      warehouse_ids: [],
      warehouse_names: [],
      unit: "unit",
      units_per_package: 1,
      content_per_unit: 1,
      content_unit: "unit",
      price: 0,
      discount: 0,
      minimum_stock: 0
    };
  });

  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState("");
  const [creatingWarehouse, setCreatingWarehouse] = useState(false);

  // Auto-select supplier when provided via URL/defaultSupplierId once suppliers are loaded
  React.useEffect(() => {
    if (!item && defaultSupplierId && !currentItem.supplier_id && suppliers && suppliers.length > 0) {
      const selectedSupplier = suppliers.find(s => s.id === defaultSupplierId);
      if (selectedSupplier) {
        setCurrentItem(prev => ({
          ...prev,
          supplier_id: defaultSupplierId,
          supplier_name: selectedSupplier.name
        }));
      }
    }
  }, [defaultSupplierId, suppliers]);

  // If suppliers load later and none selected yet, auto-select the only supplier
  React.useEffect(() => {
    if (!item && !currentItem.supplier_id && suppliers && suppliers.length === 1) {
      setCurrentItem(prev => ({
        ...prev,
        supplier_id: suppliers[0].id,
        supplier_name: suppliers[0].name
      }));
    }
  }, [suppliers, currentItem.supplier_id, item]);
  
  const handleChange = (field, value) => {
    setCurrentItem(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSupplierChange = (supplierId) => {
    const selectedSupplier = suppliers.find(s => s.id === supplierId);
    setCurrentItem(prev => ({
        ...prev,
        supplier_id: supplierId,
        supplier_name: selectedSupplier?.name || ""
    }));
  };

  const handleWarehouseToggle = (warehouseId, warehouseName) => {
    setCurrentItem(prev => {
      let currentIds = (prev.warehouse_ids || []).filter(id => id && typeof id === 'string' && id.trim() !== "");
      let currentNames = (prev.warehouse_names || []).filter(name => name && typeof name === 'string' && name.trim() !== "");
      
      // Migration from old single select to array
      if (prev.warehouse_id && typeof prev.warehouse_id === 'string' && prev.warehouse_id.trim() !== "" && !currentIds.includes(prev.warehouse_id)) {
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
        // Sync single fields for backwards compatibility
        warehouse_id: currentIds.length > 0 ? currentIds[0] : "",
        warehouse_name: currentNames.length > 0 ? currentNames[0] : ""
      };
    });
  };

  const handleCreateWarehouse = async () => {
    if (!newWarehouseName.trim()) {
      alert(t('warehouse_name') + ' ' + t('required_fields'));
      return;
    }

    try {
      setCreatingWarehouse(true);
      const { base44 } = await import('@/api/base44Client');
      const user = await base44.auth.me();
      const ownerEmail = user.store_user_owner_email || user.email;
      
      const newWarehouse = await base44.entities.Warehouse.create({
        name: newWarehouseName,
        is_active: true,
        created_by: ownerEmail
      });
      
      setCurrentItem(prev => {
        const currentIds = prev.warehouse_ids || [];
        const currentNames = prev.warehouse_names || [];
        const updatedIds = [...currentIds, newWarehouse.id];
        const updatedNames = [...currentNames, newWarehouse.name];
        return {
          ...prev,
          warehouse_ids: updatedIds,
          warehouse_names: updatedNames,
          warehouse_id: updatedIds[0],
          warehouse_name: updatedNames[0]
        };
      });
      
      setShowWarehouseForm(false);
      setNewWarehouseName("");
      
      if (onWarehouseCreated) {
        onWarehouseCreated();
      }
    } catch (error) {
      console.error("Error creating warehouse:", error);
      alert(t('error_saving'));
    } finally {
      setCreatingWarehouse(false);
    }
  };

  const calculatePriceAfterDiscount = (price, discount) => {
    if (!price || !discount) return price || 0;
    return price * (1 - (discount / 100));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentItem.name || !currentItem.supplier_id) {
      alert(t('item_name_supplier_required'));
      return;
    }
    
    const selectedSupplier = suppliers.find(s => s.id === currentItem.supplier_id);
    const price = currentItem.price || 0;
    const discount = currentItem.discount || 0;
    
    // Ensure arrays are initialized
    const finalWarehouseIds = (currentItem.warehouse_ids || []).filter(id => id && typeof id === 'string' && id.trim() !== "");
    const finalWarehouseNames = (currentItem.warehouse_names || []).filter(name => name && typeof name === 'string' && name.trim() !== "");

    // Fallback migration logic
    if (currentItem.warehouse_id && typeof currentItem.warehouse_id === 'string' && currentItem.warehouse_id.trim() !== "" && finalWarehouseIds.length === 0) {
      finalWarehouseIds.push(currentItem.warehouse_id);
      finalWarehouseNames.push(currentItem.warehouse_name || "");
    }
    
    const completeData = {
      ...currentItem,
      supplier_name: selectedSupplier?.name || "",
      warehouse_ids: finalWarehouseIds,
      warehouse_names: finalWarehouseNames,
      warehouse_id: finalWarehouseIds[0] || "",
      warehouse_name: finalWarehouseNames[0] || "",
      units_per_package: currentItem.units_per_package || 1,
      price: price,
      discount: discount,
      price_after_discount: calculatePriceAfterDiscount(price, discount),
      minimum_stock: currentItem.minimum_stock || 0,
      is_pending_completion: false,
      status: "active"
    };
    
    onSubmit(completeData);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl p-6" // Updated classname as per outline
    >
      {/* Re-introducing the header content that was in CardHeader, now as a plain div */}
      <div className="flex flex-row items-center justify-between pb-4">
        <h2 className="text-xl font-bold">
          {item ? t('edit_item') : t('add_new_item')}
        </h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('item_name')} *</Label>
            <Input
              id="name"
              value={currentItem.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={t('item_name')}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nickname">{language === 'he' ? 'כינוי (בשפה שלך, יופיע לך בלבד)' : 'Nickname (in your language)'}</Label>
            <Input
              id="nickname"
              value={currentItem.nickname || ""}
              onChange={(e) => handleChange("nickname", e.target.value)}
              placeholder={language === 'he' ? 'למשל: עגבניה (כשהשם הוא Tomato)' : 'e.g. Tomato'}
            />
          </div>
          
          {((suppliers && suppliers.length !== 1) || !currentItem.supplier_id) && ( // Show when none or multiple suppliers, or when not preselected
            <div className="space-y-2">
              <Label htmlFor="supplier_id">{t('supplier')} *</Label>
              <Select 
                value={currentItem.supplier_id}
                onValueChange={handleSupplierChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_supplier')} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="catalog_number">{t('catalog_number')}</Label>
            <Input
              id="catalog_number"
              value={currentItem.catalog_number}
              onChange={(e) => handleChange("catalog_number", e.target.value)}
              placeholder={t('catalog_number')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse_ids">{t('warehouse')}</Label>
            {!showWarehouseForm ? (
              <div className="flex gap-2">
                <DropdownMenu dir={language === 'he' ? 'rtl' : 'ltr'}>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="flex-1 justify-between font-normal overflow-hidden">
                      <span className="truncate flex-1 min-w-0 text-left rtl:text-right text-gray-900 dark:text-gray-100">
                        {((currentItem.warehouse_names && currentItem.warehouse_names.length > 0) || currentItem.warehouse_name)
                          ? (currentItem.warehouse_names && currentItem.warehouse_names.length > 0 
                              ? currentItem.warehouse_names.join(", ") 
                              : currentItem.warehouse_name)
                          : t('select_warehouse')}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2 rtl:mr-2 rtl:ml-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]" style={{ zIndex: 999999 }}>
                    {warehouses.map(warehouse => {
                      const isSelected = (currentItem.warehouse_ids && currentItem.warehouse_ids.includes(warehouse.id)) || currentItem.warehouse_id === warehouse.id;
                      return (
                        <DropdownMenuCheckboxItem
                          key={warehouse.id}
                          checked={isSelected}
                          onCheckedChange={() => handleWarehouseToggle(warehouse.id, warehouse.name)}
                          onSelect={(e) => e.preventDefault()} // Keep menu open when selecting multiple items
                        >
                          {warehouse.name}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowWarehouseForm(true)}
                  title={t('add_warehouse')}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={newWarehouseName}
                  onChange={(e) => setNewWarehouseName(e.target.value)}
                  placeholder={t('warehouse_name')}
                  disabled={creatingWarehouse}
                />
                <Button
                  type="button"
                  onClick={handleCreateWarehouse}
                  disabled={creatingWarehouse || !newWarehouseName.trim()}
                  className="bg-[#d4a373] hover:bg-[#b88c60]"
                >
                  {creatingWarehouse ? '...' : t('add')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowWarehouseForm(false);
                    setNewWarehouseName("");
                  }}
                  disabled={creatingWarehouse}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">{t('unit_type')}</Label>
            <Select 
              value={currentItem.unit}
              onValueChange={(value) => handleChange("unit", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('unit_type')} />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map(unit => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="units_per_package">{t('units_per_package')}</Label>
            <Input
              id="units_per_package"
              type="number"
              value={currentItem.units_per_package || ''}
              onChange={(e) => setCurrentItem({...currentItem, units_per_package: parseFloat(e.target.value) || 1})}
              min="0.01"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">{t('units_per_package_help')}</p>
          </div>

          <div>
            <Label htmlFor="content_per_unit">{language === 'he' ? 'תכולה ליחידה' : 'Content per unit'}</Label>
            <Input
              id="content_per_unit"
              type="number"
              value={currentItem.content_per_unit || ''}
              onChange={(e) => setCurrentItem({...currentItem, content_per_unit: parseFloat(e.target.value) || 1})}
              min="0.01"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">{language === 'he' ? 'כמה יש ביחידה אחת (למשל 330 לפחית)' : 'Amount per single unit'}</p>
          </div>

          <div>
            <Label htmlFor="content_unit">{language === 'he' ? 'יחידת מידה לתכולה' : 'Content unit'}</Label>
            <Select 
              value={currentItem.content_unit || "unit"}
              onValueChange={(value) => handleChange("content_unit", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('unit_type')} />
              </SelectTrigger>
              <SelectContent>
                {UNITS.filter(u => u.value !== 'case').map(unit => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">{t('price_per_product')}</Label>
            <Input
              id="price"
              type="number"
              value={currentItem.price || ''}
              onChange={(e) => setCurrentItem({...currentItem, price: parseFloat(e.target.value) || 0})}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discount">{t('discount')} (%)</Label>
            <Input
              id="discount"
              type="number"
              value={currentItem.discount || ''}
              onChange={(e) => setCurrentItem({...currentItem, discount: parseFloat(e.target.value) || 0})}
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div>
            <Label>{t('price_after_discount') || 'מחיר אחרי הנחה'}</Label>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">{t('final_price') || 'מחיר סופי'}:</span>
                <span className="text-lg font-bold text-green-700">
                  {(currentItem.price && currentItem.discount 
                    ? (currentItem.price * (1 - (currentItem.discount / 100))).toFixed(2)
                    : (currentItem.price || 0).toFixed(2)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-green-200/50 pt-1">
                <span className="text-sm text-green-700">
                  {t('price_per_unit') || 'מחיר ל-'}{(() => {
                    if (currentItem.unit === 'kg') return t('unit_kg') || 'ק״ג';
                    if (currentItem.unit === 'gram') return t('unit_g') || 'גרם';
                    if (currentItem.unit === 'liter') return t('unit_liter') || 'ליטר';
                    if (currentItem.unit === 'ml') return t('unit_ml') || 'מ״ל';
                    if (currentItem.unit === 'case') return t('unit_piece') || 'יחידה';
                    return t('unit_piece') || 'יחידה';
                  })()}:
                </span>
                <span className="text-md font-bold text-green-700">
                  {((currentItem.price ? (currentItem.price * (1 - ((currentItem.discount || 0) / 100))) : 0) / (currentItem.units_per_package || 1)).toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('price_after_discount_help') || 'המחיר שישמש לכל החישובים'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="minimum_stock">{t('minimum_stock') || 'מלאי מינימום'}</Label>
            <Input
              id="minimum_stock"
              type="number"
              value={currentItem.minimum_stock || ''}
              onChange={(e) => setCurrentItem({...currentItem, minimum_stock: parseFloat(e.target.value) || 0})}
              min="0"
              step="0.01"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('minimum_stock_help') || 'כמות מינימלית שחייבת להיות במלאי - תעזור להזמנות חכמות'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button type="submit" className="bg-[#d4a373] hover:bg-[#b88c60]">
            {item ? t('update_item') : t('save_item')}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}