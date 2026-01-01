import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Save, WifiOff, Upload } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { base44 } from "@/api/base44Client";
import { Item } from "@/entities/Item";

const LOCAL_STORAGE_KEY = 'offline_count_draft';

export default function CountForm({ count, warehouses, items, onSubmit, onCancel, onWarehouseCatalogSaved }) {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState(count || {
    warehouse_id: "",
    warehouse_name: "",
    count_date: new Date().toISOString().split('T')[0],
    count_type: "monthly",
    items: [],
    total_inventory_value: 0,
    name: "",
    notes: "",
    status: "in_progress"
  });

  const [selectedItemId, setSelectedItemId] = useState("");
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [filteredAvailableItems, setFilteredAvailableItems] = useState([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [warehouseOptions, setWarehouseOptions] = useState(warehouses || []);
  const [availableSearch, setAvailableSearch] = useState("");

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for existing draft on load
  useEffect(() => {
    const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (draft) {
      setHasDraft(true);
    }
  }, []);

  // Keep local warehouse options in sync with props
  useEffect(() => {
    setWarehouseOptions(warehouses || []);
  }, [warehouses]);

  const saveToLocalStorage = () => {
    const dataToSave = {
      ...formData,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    setHasDraft(true);
    alert(language === 'he' ? '✓ הנתונים נשמרו מקומית בהצלחה!' : '✓ Data saved locally!');
  };

  const loadFromLocalStorage = () => {
    const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (draft) {
      const parsed = JSON.parse(draft);
      const { savedAt, ...draftData } = parsed;
      setFormData(draftData);
      alert(language === 'he' ? `✓ נטען טיוטה מ-${new Date(savedAt).toLocaleString('he-IL')}` : `✓ Loaded draft from ${new Date(savedAt).toLocaleString()}`);
    }
  };

  const clearLocalStorage = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setHasDraft(false);
  };

  // Recalculate total whenever items change
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    setFormData(prev => ({ ...prev, total_inventory_value: total }));
  }, [formData.items]);

  // Effect to populate filteredAvailableItems for the "Add Item" dropdown
  useEffect(() => {
    const term = (availableSearch || '').trim().toLowerCase();
    const newFilteredItems = items.filter(item => {
      const isNotInCount = !formData.items.some(countItem => countItem.item_id === item.id);
      const belongsToScope = !formData.warehouse_id ? true : (!item.warehouse_id || item.warehouse_id === formData.warehouse_id);
      const matches = !term || (item.name || '').toLowerCase().includes(term);
      return isNotInCount && belongsToScope && matches;
    });
    setFilteredAvailableItems(newFilteredItems);
  }, [items, formData.items, formData.warehouse_id, availableSearch]);

  // Effect to auto-populate items from warehouse catalog on initial load for new counts
  useEffect(() => {
    // Only for new counts, and if a warehouse is selected, and items array is initially empty
    if (!count && formData.warehouse_id && formData.items.length === 0) {
      const warehouse = warehouseOptions.find(w => w.id === formData.warehouse_id);
      if (warehouse && warehouse.catalog_items && warehouse.catalog_items.length > 0) {
        const catalogItems = items.filter(item => warehouse.catalog_items.includes(item.id));
        if (catalogItems.length > 0) {
          const autoItems = catalogItems.map(item => ({
            item_id: item.id,
            item_name: item.name,
            counted_quantity: 0,
            unit: item.unit,
            price_per_unit: item.price || 0,
            total_cost: 0,
            notes: ""
          }));
          setFormData(prev => ({ ...prev, items: autoItems }));
        }
      }
    }
  }, [formData.warehouse_id, warehouseOptions, items, count, formData.items.length]);

  const handleWarehouseChange = (warehouseId) => {
    const warehouse = warehouseOptions.find(w => w.id === warehouseId);
    let newItems = [];

    if (!count && warehouse && warehouse.catalog_items && warehouse.catalog_items.length > 0) {
      const catalogItems = items.filter(item => warehouse.catalog_items.includes(item.id));
      newItems = catalogItems.map(item => ({
        item_id: item.id,
        item_name: item.name,
        counted_quantity: 0,
        unit: item.unit,
        price_per_unit: item.price || 0,
        total_cost: 0,
        notes: ""
      }));
    }

    setFormData(prev => ({
      ...prev,
      warehouse_id: warehouseId || "",
      warehouse_name: warehouse?.name || "",
      items: count ? prev.items : newItems
    }));
    setSelectedItemId("");
  };

  const handleCreateWarehouse = async () => {
    const name = prompt(t('warehouse_name') || 'Warehouse name');
    if (!name) return;
    const created = await base44.entities.Warehouse.create({ name, catalog_items: [] });
    setWarehouseOptions(prev => [...prev, created]);
    if (typeof onWarehouseCatalogSaved === 'function') {
      onWarehouseCatalogSaved();
    }
    setFormData(prev => ({ ...prev, warehouse_id: created.id, warehouse_name: created.name }));
  };

   const handleSaveToWarehouseCatalog = async () => {
    if (!formData.warehouse_id || formData.items.length === 0) {
      alert(t('warehouse_required') + ' ' + t('and') + ' ' + t('items'));
      return;
    }

    if (!confirm(`${t('save')} ${formData.items.length} ${t('items')} ${t('to_warehouse')} "${formData.warehouse_name}"?`)) {
      return;
    }

    try {
      setSavingCatalog(true);
      
      const itemUpdates = formData.items.map(async (countItem) => {
        const itemToUpdate = items.find(i => i.id === countItem.item_id);
        if (itemToUpdate) {
          const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...cleanData } = itemToUpdate;
          await Item.update(countItem.item_id, {
            ...cleanData,
            warehouse_id: formData.warehouse_id,
            warehouse_name: formData.warehouse_name
          });
        }
      });
      await Promise.all(itemUpdates);

      alert(`${t('items_saved_to_warehouse_catalog_success', { count: formData.items.length, warehouseName: formData.warehouse_name })}`);
      
      if (onWarehouseCatalogSaved) {
        onWarehouseCatalogSaved();
      }
    } catch (error) {
      console.error("Error saving to warehouse catalog:", error);
      alert(t('error_saving'));
    } finally {
      setSavingCatalog(false);
    }
  };

  const addItem = () => {
    if (!selectedItemId) return;
    
    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    if (formData.items.some(countItem => countItem.item_id === item.id)) {
      alert(t('item_already_added'));
      return;
    }

    const newItem = {
      item_id: item.id,
      item_name: item.name,
      counted_quantity: 0,
      unit: item.unit,
      price_per_unit: item.price || 0,
      total_cost: 0,
      notes: ""
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setSelectedItemId("");
  };

  const updateItemQuantity = (index, quantity) => {
    const newItems = [...formData.items];
    const qty = parseFloat(quantity) || 0;
    newItems[index] = { 
      ...newItems[index], 
      counted_quantity: qty,
      total_cost: qty * (newItems[index].price_per_unit || 0)
    };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const updateItemPrice = (index, price) => {
    const newItems = [...formData.items];
    const priceValue = parseFloat(price) || 0;
    newItems[index] = { 
      ...newItems[index], 
      price_per_unit: priceValue,
      total_cost: (newItems[index].counted_quantity || 0) * priceValue
    };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const updateItemNotes = (index, notes) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], notes };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Clear local storage after successful submit
    clearLocalStorage();
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8"
    >
      <Card className="shadow-lg border-0">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-bold">
            {count ? t('edit_count') : t('new_count')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isOffline && (
              <span className="flex items-center gap-1 text-orange-600 text-sm font-medium animate-pulse">
                <WifiOff className="w-4 h-4" />
                {language === 'he' ? 'אופליין' : 'Offline'}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse">{t('warehouse')} *</Label>
                <Select 
                                   value={formData.warehouse_id} 
                                   onValueChange={(val) => { if (val === "__create__") { handleCreateWarehouse(); return; } handleWarehouseChange(val); }}
                                 >
                  <SelectTrigger id="warehouse">
                    <SelectValue placeholder={t('select_warehouse')} />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="__create__">+ {t('new_warehouse') || 'New Warehouse'}</SelectItem>
                     {warehouseOptions.map(warehouse => (
                       <SelectItem key={warehouse.id} value={warehouse.id}>
                        <div className="flex items-center">
                          <span>{warehouse.name}</span>
                          {warehouse.catalog_items && warehouse.catalog_items.length > 0 && (
                            <Badge variant="outline" className="ml-2">
                              {warehouse.catalog_items.length} {t('items')}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="count_date">{t('count_date')}</Label>
                <Input
                  id="count_date"
                  type="date"
                  value={formData.count_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, count_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="count_type">{t('count_type')}</Label>
                <Select
                  id="count_type"
                  value={formData.count_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, count_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('daily')}</SelectItem>
                    <SelectItem value="weekly">{t('weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('monthly')}</SelectItem>
                    <SelectItem value="quarterly">{t('quarterly')}</SelectItem>
                    <SelectItem value="annual">{t('annual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('status')}</Label>
                <Select
                  id="status"
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">{t('status_in_progress')}</SelectItem>
                    <SelectItem value="completed">{t('status_completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{language === 'he' ? 'שם ספירה' : 'Count Name'}</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={language === 'he' ? 'למשל: ספירת סוף חודש דצמבר' : 'e.g., December month-end'}
                />
              </div>
            </div>

            {(formData.warehouse_id || formData.items.length > 0) && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row items-end gap-2">
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={language === 'he' ? 'חפש פריט...' : 'Search item...'}
                        value={availableSearch}
                        onChange={(e) => setAvailableSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                        className="w-full"
                      />
                    </div>
                    <Label htmlFor="add_item_select">{t('add_item')}</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger id="add_item_select">
                        <SelectValue placeholder={
                          filteredAvailableItems.length === 0 ? (availableSearch ? (language === 'he' ? 'לא נמצאו פריטים' : 'No results') : t('no_available_items')) : t('select_item')
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAvailableItems.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.unit}) {item.price > 0 ? `- ${item.price}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    onClick={addItem}
                    disabled={!selectedItemId}
                    className="bg-green-600 hover:bg-green-700 w-full md:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t('add_item')}
                  </Button>
                </div>

                {formData.items.length > 0 && (
                  <>
                    {!count && (
                      <div className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-cyan-900">{t('save_items_to_warehouse_catalog_title')}</p>
                            <p className="text-sm text-cyan-700">
                              {t('save_items_to_warehouse_catalog_description', { count: formData.items.length, warehouseName: formData.warehouse_name })}
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={handleSaveToWarehouseCatalog}
                            disabled={savingCatalog}
                            className="bg-cyan-600 hover:bg-cyan-700 w-full md:w-auto"
                          >
                            {savingCatalog ? (
                              <>
                                <Save className="w-4 h-4 mr-2 animate-spin" />
                                {t('saving')}
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                {t('save_to_warehouse_catalog')}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('item_name')}</TableHead>
                            <TableHead>{t('counted_quantity')}</TableHead>
                            <TableHead>{t('unit')}</TableHead>
                            <TableHead>{t('price_per_unit')}</TableHead>
                            <TableHead>{t('total_cost')}</TableHead>
                            <TableHead>{t('notes')}</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.item_name}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001" 
                                  value={item.counted_quantity === 0 ? '' : item.counted_quantity}
                                  onChange={(e) => updateItemQuantity(index, e.target.value)}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.price_per_unit}
                                  onChange={(e) => updateItemPrice(index, e.target.value)}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell className="font-bold text-green-600">
                                {item.total_cost?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.notes || ''}
                                  onChange={(e) => updateItemNotes(index, e.target.value)}
                                  placeholder={t('notes')}
                                  className="w-full min-w-[150px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-blue-900">
                          {t('total_inventory_value')}:
                        </span>
                        <span className="text-2xl font-bold text-blue-600">
                          ₪{formData.total_inventory_value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">{language === 'he' ? 'תיאור' : 'Description'}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={language === 'he' ? 'תיאור' : 'Description'}
                className="h-20"
              />
            </div>

            {/* Offline save banner */}
            {(isOffline || hasDraft) && (
              <div className={`${isOffline ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-300'} border-2 rounded-lg p-4 mb-4`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isOffline ? (
                      <>
                        <WifiOff className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="font-semibold text-orange-800">
                            {language === 'he' ? 'אין חיבור לאינטרנט' : 'No Internet Connection'}
                          </p>
                          <p className="text-sm text-orange-700">
                            {language === 'he' ? 'שמור את הספירה מקומית עד שהחיבור יחזור' : 'Save your count locally until connection is restored'}
                          </p>
                        </div>
                      </>
                    ) : hasDraft && (
                      <>
                        <Save className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800">
                            {language === 'he' ? 'יש טיוטה שמורה' : 'Draft Available'}
                          </p>
                          <p className="text-sm text-green-700">
                            {language === 'he' ? 'ניתן לטעון את הטיוטה או למחוק אותה' : 'You can load the draft or delete it'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    {hasDraft && !isOffline && (
                      <>
                        <Button
                          type="button"
                          onClick={loadFromLocalStorage}
                          className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          {language === 'he' ? 'טען טיוטה' : 'Load Draft'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={clearLocalStorage}
                          className="border-red-300 text-red-600 hover:bg-red-50 flex-1 md:flex-none"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {language === 'he' ? 'מחק' : 'Delete'}
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      onClick={saveToLocalStorage}
                      className={`${isOffline ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-600 hover:bg-gray-700'} flex-1 md:flex-none`}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {language === 'he' ? 'שמור מקומית' : 'Save Locally'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onCancel} className="w-full md:w-auto">
                {t('cancel')}
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto" disabled={isOffline}>
                {count ? t('update_count') : t('save_count')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}