import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse } from "@/entities/Warehouse";
import { Item } from "@/entities/Item";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { X, Plus, Edit, Trash2, Package, Bell } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function WarehouseManagement({ warehouses, onClose }) {
  const { t } = useLanguage();
  const [localWarehouses, setLocalWarehouses] = useState(warehouses);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [showItemSelection, setShowItemSelection] = useState(null);
  const [itemSelectionMode, setItemSelectionMode] = useState('daily'); // 'daily' | 'catalog'
  const [allItems, setAllItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    is_active: true,
    catalog_items: [],
    daily_count_enabled: false,
    daily_count_time: "16:00",
    daily_count_items: []
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const user = await base44.auth.me();
      let workingEmail = user.acting_as_store_email || user.store_user_owner_email || user.email;
      if (user.role === 'admin' && user.acting_as_user_email) {
          workingEmail = user.acting_as_user_email;
      }
      const fetchedItems = await Item.filter({ $or: [{ created_by: workingEmail }, { store_owner_email: workingEmail }] }, "name", 10000);
      setAllItems(fetchedItems || []);
    } catch (error) {
      console.error("Error loading items:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert(t('warehouse_name') + ' ' + t('required_fields'));
      return;
    }

    try {
      const user = await base44.auth.me();
      let workingEmail = user.acting_as_store_email || user.store_user_owner_email || user.email;
      if (user.role === 'admin' && user.acting_as_user_email) {
          workingEmail = user.acting_as_user_email;
      }

      if (editingWarehouse) {
        await Warehouse.update(editingWarehouse.id, formData);
      } else {
        await Warehouse.create({
            ...formData,
            created_by: workingEmail,
            store_owner_email: workingEmail
        });
      }
      
      const updatedWarehouses = await Warehouse.filter({ $or: [{ created_by: workingEmail }, { store_owner_email: workingEmail }] }, "name", 10000);
      setLocalWarehouses(updatedWarehouses);
      setShowForm(false);
      setEditingWarehouse(null);
      setFormData({ name: "", location: "", description: "", is_active: true, catalog_items: [] });
    } catch (error) {
      console.error("Error saving warehouse:", error);
      alert(t('error_saving'));
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location || "",
      description: warehouse.description || "",
      is_active: warehouse.is_active !== false,
      catalog_items: warehouse.catalog_items || [],
      daily_count_enabled: warehouse.daily_count_enabled || false,
      daily_count_time: warehouse.daily_count_time || "16:00",
      daily_count_items: warehouse.daily_count_items || []
    });
    setShowForm(true);
  };

  const handleManageItems = (warehouse) => {
    setItemSelectionMode('catalog');
    setShowItemSelection(warehouse);
    setFormData({
      ...warehouse,
      catalog_items: warehouse.catalog_items || [],
      daily_count_items: warehouse.daily_count_items || []
    });
  };

  const handleManageDailyItems = (warehouse) => {
    setItemSelectionMode('daily');
    setShowItemSelection(warehouse);
    setFormData({
      ...warehouse,
      catalog_items: warehouse.catalog_items || [],
      daily_count_items: warehouse.daily_count_items || []
    });
  };

  const toggleItemInSelection = (itemId) => {
    setFormData(prev => {
      const key = itemSelectionMode === 'daily' ? 'daily_count_items' : 'catalog_items';
      const list = prev[key] || [];
      const exists = list.includes(itemId);
      return {
        ...prev,
        [key]: exists ? list.filter(id => id !== itemId) : [...list, itemId]
      };
    });
  };

  const saveCatalogItems = async () => {
    try {
      const user = await base44.auth.me();
      let workingEmail = user.acting_as_store_email || user.store_user_owner_email || user.email;
      if (user.role === 'admin' && user.acting_as_user_email) {
          workingEmail = user.acting_as_user_email;
      }

      const payload = { ...showItemSelection };
      if (itemSelectionMode === 'daily') {
        payload.daily_count_items = formData.daily_count_items;
      } else {
        payload.catalog_items = formData.catalog_items;
      }
      await Warehouse.update(showItemSelection.id, payload);
      const updatedWarehouses = await Warehouse.filter({ $or: [{ created_by: workingEmail }, { store_owner_email: workingEmail }] }, "name", 10000);
      setLocalWarehouses(updatedWarehouses);
      setShowItemSelection(null);
      alert('Saved ✓');
    } catch (error) {
      console.error("Error saving items:", error);
      alert(t('error_saving'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <CardTitle>{t('warehouse_management')}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {!showForm && !showItemSelection && (
            <>
              <Button
                onClick={() => setShowForm(true)}
                className="mb-6 bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 ml-2" />
                {t('add_warehouse')}
              </Button>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('existing_warehouses')}</h3>
                {localWarehouses.length === 0 ? (
                  <p className="text-gray-500">{t('no_warehouses_yet')}</p>
                ) : (
                  localWarehouses.map(warehouse => (
                    <Card key={warehouse.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-lg">{warehouse.name}</h4>
                            {warehouse.location && (
                              <p className="text-sm text-gray-600">{warehouse.location}</p>
                            )}
                            {warehouse.description && (
                              <p className="text-sm text-gray-500 mt-1">{warehouse.description}</p>
                            )}
                            {warehouse.catalog_items && warehouse.catalog_items.length > 0 && (
                              <Badge variant="outline" className="mt-2 mr-2">
                                <Package className="w-3 h-3 mr-1" />
                                {warehouse.catalog_items.length} {t('items')}
                              </Badge>
                            )}
                            {warehouse.daily_count_items && warehouse.daily_count_items.length > 0 && (
                              <Badge variant="outline" className="mt-2">
                                <Bell className="w-3 h-3 mr-1" />
                                {warehouse.daily_count_items.length} Daily
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleManageDailyItems(warehouse)}
                             >
                               <Bell className="w-4 h-4 ml-1" />
                               Daily Items
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleManageItems(warehouse)}
                             >
                               <Package className="w-4 h-4 ml-1" />
                               {t('items')}
                             </Button>
                             {warehouse.daily_count_enabled && (warehouse.daily_count_items?.length || 0) > 0 && (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={async () => {
                                   try {
                                     const itemsMap = new Map(allItems.map(i => [i.id, i]));
                                     const selected = (warehouse.daily_count_items || []).map(id => itemsMap.get(id)).filter(Boolean);
                                     const today = new Date();
                                     const dateStr = today.toISOString().slice(0,10);
                                     const payload = {
                                       warehouse_id: warehouse.id,
                                       warehouse_name: warehouse.name,
                                       count_date: dateStr,
                                       count_type: 'daily',
                                       items: selected.map(it => ({
                                         item_id: it.id,
                                         item_name: it.name,
                                         supplier_name: it.supplier_name,
                                         counted_quantity: 0,
                                         unit: it.unit,
                                         price_per_unit: it.price || 0,
                                         total_cost: 0
                                       }))
                                     };
                                     const created = await base44.entities.InventoryCount.create(payload);
                                     window.location.href = createPageUrl('MonthlyCount');
                                   } catch (e) {
                                     alert('Failed to start daily count');
                                   }
                                 }}
                               >
                                 Start Daily Count
                               </Button>
                             )}
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => handleEdit(warehouse)}
                             >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (!confirm(`Delete warehouse "${warehouse.name}"?`)) return;
                                try {
                                  const user = await base44.auth.me();
                                  let workingEmail = user.acting_as_store_email || user.store_user_owner_email || user.email;
                                  if (user.role === 'admin' && user.acting_as_user_email) {
                                      workingEmail = user.acting_as_user_email;
                                  }

                                  const { data } = await base44.functions.invoke('deleteWarehouse', { warehouseId: warehouse.id });
                                  if (!data?.success) throw new Error(data?.error || 'Failed to delete warehouse');
                                  const updated = await Warehouse.filter({ $or: [{ created_by: workingEmail }, { store_owner_email: workingEmail }] }, "name", 10000);
                                  setLocalWarehouses(updated);
                                  if (showItemSelection?.id === warehouse.id) setShowItemSelection(null);
                                  if (editingWarehouse?.id === warehouse.id) { setEditingWarehouse(null); setShowForm(false); }
                                } catch (e) {
                                  alert((t('error_saving') || 'Error') + ': ' + (e.message || 'Failed to delete warehouse'));
                                }
                              }}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('warehouse_name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('warehouse_name')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t('location')}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder={t('location')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('description')}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="daily_enabled"
                    checked={formData.daily_count_enabled}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, daily_count_enabled: !!v }))}
                  />
                  <Label htmlFor="daily_enabled">Enable Daily Count & Reminders</Label>
                </div>
                {formData.daily_count_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="daily_time">Reminder Time (HH:mm)</Label>
                    <Input
                      id="daily_time"
                      type="time"
                      value={formData.daily_count_time || "16:00"}
                      onChange={(e) => setFormData(prev => ({ ...prev, daily_count_time: e.target.value }))}
                    />
                  </div>
                )}

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingWarehouse(null);
                    setFormData({ name: "", location: "", description: "", is_active: true, catalog_items: [] });
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  {editingWarehouse ? t('update') : t('save')}
                </Button>
              </div>
            </div>
            </form>
          )}

          {showItemSelection && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">
                  {itemSelectionMode === 'daily' ? 'Daily Count Items' : t('items')} - {showItemSelection.name}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowItemSelection(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  {itemSelectionMode === 'daily' ? 'Select items to always include in the Daily Count for this warehouse.' : 'Select catalog items for this warehouse.'}
                </p>
              </div>

              <div className="mb-4">
                <Input
                  placeholder={t('search') || 'Search items...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
                {allItems.length === 0 ? (
                  <p className="text-gray-500">{t('no_items_to_display')}</p>
                ) : (
                  allItems.filter(item => !searchTerm || (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.nickname || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                       checked={(itemSelectionMode === 'daily' ? (formData.daily_count_items || []) : (formData.catalog_items || [])).includes(item.id)}
                       onCheckedChange={() => toggleItemInSelection(item.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          {item.supplier_name} • {item.unit}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-3 justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Mode:
                  <Button variant={itemSelectionMode==='daily' ? 'default' : 'outline'} size="sm" className="ml-2" onClick={() => setItemSelectionMode('daily')}>Daily</Button>
                  <Button variant={itemSelectionMode==='catalog' ? 'default' : 'outline'} size="sm" className="ml-2" onClick={() => setItemSelectionMode('catalog')}>{t('items')}</Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowItemSelection(null)}
                >
                  {t('cancel')}
                </Button>
                <Button
                 onClick={saveCatalogItems}
                 className="bg-indigo-600 hover:bg-indigo-700"
                >
                 {t('save')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}