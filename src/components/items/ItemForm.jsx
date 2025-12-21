import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { Warehouse } from "@/entities/Warehouse";

export default function ItemForm({ item, suppliers, warehouses, onSubmit, onCancel, onWarehouseCreated, defaultSupplierId }) {
  const { t } = useLanguage();

  const UNITS = [
    { value: "kg", label: t('unit_kg') },
    { value: "liter", label: t('unit_liter') },
    { value: "unit", label: t('unit_piece') },
    { value: "case", label: t('unit_box') }
  ];

  const [currentItem, setCurrentItem] = React.useState(item || {
    name: "",
    supplier_id: (defaultSupplierId) ? defaultSupplierId : (suppliers && suppliers.length === 1 ? suppliers[0].id : ""),
    supplier_name: (defaultSupplierId ? (suppliers.find(s => s.id === defaultSupplierId)?.name || "") : (suppliers && suppliers.length === 1 ? suppliers[0].name : "")),
    catalog_number: "",
    warehouse_id: "",
    warehouse_name: "",
    unit: "unit",
    units_per_package: 1,
    price: 0,
    discount: 0,
    minimum_stock: 0
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

  const handleWarehouseChange = (warehouseId) => {
    const selectedWarehouse = warehouses.find(w => w.id === warehouseId);
    setCurrentItem(prev => ({
        ...prev,
        warehouse_id: warehouseId,
        warehouse_name: selectedWarehouse?.name || ""
    }));
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
      
      setCurrentItem(prev => ({
        ...prev,
        warehouse_id: newWarehouse.id,
        warehouse_name: newWarehouse.name
      }));
      
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
    return price / (1 + (discount / 100));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentItem.name || !currentItem.supplier_id) {
      alert(t('item_name_supplier_required'));
      return;
    }
    
    const selectedSupplier = suppliers.find(s => s.id === currentItem.supplier_id);
    const selectedWarehouse = warehouses.find(w => w.id === currentItem.warehouse_id);
    const price = currentItem.price || 0;
    const discount = currentItem.discount || 0;
    
    const completeData = {
      ...currentItem,
      supplier_name: selectedSupplier?.name || "",
      warehouse_name: selectedWarehouse?.name || "",
      units_per_package: currentItem.units_per_package || 1,
      price: price,
      discount: discount,
      price_after_discount: calculatePriceAfterDiscount(price, discount),
      minimum_stock: currentItem.minimum_stock || 0
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
          
          {suppliers && suppliers.length > 1 && ( // Conditional rendering for supplier select
            <div className="space-y-2">
              <Label htmlFor="supplier_id">{t('supplier')} *</Label>
              <Select 
                value={currentItem.supplier_id}
                onValueChange={handleSupplierChange}
                required
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
            <Label htmlFor="warehouse_id">{t('warehouse')}</Label>
            {!showWarehouseForm ? (
              <div className="flex gap-2">
                <Select 
                  value={currentItem.warehouse_id}
                  onValueChange={handleWarehouseChange}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('select_warehouse')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>{t('no_warehouse')}</SelectItem>
                    {warehouses.map(warehouse => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  className="bg-green-600 hover:bg-green-700"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-green-700">{t('final_price') || 'מחיר סופי'}:</span>
              <span className="text-lg font-bold text-green-700">
                ₪{(currentItem.price && currentItem.discount 
                  ? (currentItem.price / (1 + (currentItem.discount / 100))).toFixed(2)
                  : (currentItem.price || 0).toFixed(2)
                )}
              </span>
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
          <Button type="submit" className="bg-green-600 hover:bg-green-700">
            {item ? t('update_item') : t('save_item')}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}