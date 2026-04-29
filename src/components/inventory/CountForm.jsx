import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Save, WifiOff, Upload, FileSpreadsheet, Loader, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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


  const [savingCatalog, setSavingCatalog] = useState(false);
  const [filteredAvailableItems, setFilteredAvailableItems] = useState([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [warehouseOptions, setWarehouseOptions] = useState(warehouses || []);
  const [availableSearch, setAvailableSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportingSheets, setExportingSheets] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleExportToSheets = async () => {
    try {
      setExportingSheets(true);
      
      const title = formData.name || formData.warehouse_name || 'Inventory Count';
      const itemsToExport = formData.items;
      
      const { data } = await base44.functions.invoke('exportSingleCountToSheets', {
        title,
        items: itemsToExport,
        total_value: formData.total_inventory_value
      });
      
      if (data?.success && data?.spreadsheetUrl) {
        window.open(data.spreadsheetUrl, '_blank');
      } else {
        alert(t('error_saving') || 'Export failed');
      }
    } catch (e) {
      console.error('Export error:', e);
      alert((t('error_saving') || 'Error') + ': ' + (e?.message || ''));
    } finally {
      setExportingSheets(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    
    const sortedItems = [...formData.items].sort((a, b) => {
      if (key === 'total_cost') {
        const costA = Number(a.total_cost) || 0;
        const costB = Number(b.total_cost) || 0;
        return direction === 'asc' ? (costA - costB) : (costB - costA);
      }
      return 0;
    });
    
    setFormData(prev => ({ ...prev, items: sortedItems }));
  };

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

  // Auto-save draft to local storage
  useEffect(() => {
    if (!formData.warehouse_id && formData.items.length === 0) return;
    
    const timer = setTimeout(() => {
      const dataToSave = {
        ...formData,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
      setHasDraft(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData]);

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
            counted_quantity: "",
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
        counted_quantity: "",
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

      alert(language === 'he' 
        ? `נשמרו בהצלחה ${formData.items.length} פריטים לקטלוג המחסן "${formData.warehouse_name}"`
        : `Successfully saved ${formData.items.length} items to "${formData.warehouse_name}" catalog`);
      
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



  const updateItemQuantity = (index, quantity) => {
    const newItems = [...formData.items];
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(newItems[index].price_per_unit) || 0;
    newItems[index] = { 
      ...newItems[index], 
      counted_quantity: quantity,
      total_cost: qty * price
    };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const updateItemPrice = (index, price) => {
    const newItems = [...formData.items];
    const priceValue = parseFloat(price) || 0;
    const qty = parseFloat(newItems[index].counted_quantity) || 0;
    newItems[index] = { 
      ...newItems[index], 
      price_per_unit: price,
      total_cost: qty * priceValue
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
    
    // Clean up empty fields to avoid backend validation errors
    const cleanedData = {
      ...formData,
      items: formData.items.map(item => ({
        ...item,
        counted_quantity: item.counted_quantity === "" || item.counted_quantity == null ? 0 : Number(item.counted_quantity),
        price_per_unit: item.price_per_unit === "" || item.price_per_unit == null ? 0 : Number(item.price_per_unit),
        total_cost: Number(item.total_cost) || 0
      }))
    };

    onSubmit(cleanedData);
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
            <Button type="button" variant="outline" size="sm" onClick={handleExportToSheets} disabled={exportingSheets || formData.items.length === 0} className="hidden md:flex border-green-600 text-green-600 hover:bg-green-50">
              {exportingSheets ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              {language === 'he' ? 'ייצא פירוט ל-Sheets' : 'Export items to Sheets'}
            </Button>
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
                    <Label htmlFor="add_item_select" className="text-base font-bold text-gray-900 mb-2">{t('add_item')}</Label>
                    <div className="relative mt-2">
                      <div className="relative">
                        <Input
                          id="add_item_select"
                          placeholder={language === 'he' ? 'הקלד פריט לחיפוש ולהוספה...' : 'Type to search item...'}
                          value={availableSearch}
                          onChange={(e) => {
                            setAvailableSearch(e.target.value);
                          }}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => {
                            // Short delay to allow clicking on dropdown items before closing
                            setTimeout(() => setIsSearchFocused(false), 200);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (filteredAvailableItems.length > 0) {
                                // Auto add the first result on enter
                                const item = items.find(i => i.id === filteredAvailableItems[0].id);
                                if (item && !formData.items.some(ci => ci.item_id === item.id)) {
                                   setFormData(prev => ({
                                    ...prev,
                                    items: [{
                                      item_id: item.id,
                                      item_name: item.name,
                                      counted_quantity: "",
                                      unit: item.unit,
                                      price_per_unit: item.price || 0,
                                      total_cost: 0,
                                      notes: ""
                                    }, ...prev.items]
                                  }));
                                  setAvailableSearch('');
                                  setIsSearchFocused(false);
                                }
                              }
                            }
                          }}
                          className="w-full h-12 text-base font-normal bg-white pr-10 rtl:pl-10 rtl:pr-3"
                          autoComplete="off"
                        />
                        <ArrowUpDown className="absolute top-1/2 -translate-y-1/2 right-3 rtl:left-3 rtl:right-auto h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                      </div>
                      
                      {isSearchFocused && (
                        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-[300px] overflow-y-auto p-1">
                          {filteredAvailableItems.map(item => (
                            <div
                              key={item.id}
                              className={`flex items-center w-full justify-between p-3 cursor-pointer hover:bg-gray-100 rounded-md transition-colors`}
                              onClick={() => {
                                if (!formData.items.some(ci => ci.item_id === item.id)) {
                                  setFormData(prev => ({
                                    ...prev,
                                    items: [{
                                      item_id: item.id,
                                      item_name: item.name,
                                      counted_quantity: "",
                                      unit: item.unit,
                                      price_per_unit: item.price || 0,
                                      total_cost: 0,
                                      notes: ""
                                    }, ...prev.items]
                                  }));
                                }
                                setAvailableSearch("");
                                setIsSearchFocused(false);
                              }}
                            >
                              <span className="text-gray-900">{item.name}</span>
                              <span className="text-gray-500 text-sm mx-2">({item.unit})</span>
                              {item.price > 0 && <span className="text-gray-400 text-sm ml-auto rtl:mr-auto rtl:ml-0">- ₪{item.price}</span>}
                            </div>
                          ))}
                          {filteredAvailableItems.length === 0 && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              {availableSearch ? (language === 'he' ? 'לא נמצאו פריטים' : 'No results') : t('no_available_items')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      if (filteredAvailableItems.length > 0) {
                         const item = items.find(i => i.id === filteredAvailableItems[0].id);
                         if (item && !formData.items.some(ci => ci.item_id === item.id)) {
                           setFormData(prev => ({
                            ...prev,
                            items: [{
                              item_id: item.id,
                              item_name: item.name,
                              counted_quantity: "",
                              unit: item.unit,
                              price_per_unit: item.price || 0,
                              total_cost: 0,
                              notes: ""
                            }, ...prev.items]
                          }));
                          setAvailableSearch('');
                         }
                      }
                    }}
                    disabled={filteredAvailableItems.length === 0}
                    className="bg-green-600 hover:bg-green-700 w-full md:w-auto h-12 text-base"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('add_item')}
                  </Button>
                </div>

                {formData.items.length > 0 && (
                  <>
                    {!count && (
                      <div className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-cyan-900">
                              {language === 'he' ? 'שמור פריטים לקטלוג המחסן' : 'Save items to warehouse catalog'}
                            </p>
                            <p className="text-sm text-cyan-700">
                              {language === 'he' 
                                ? `שמור את ${formData.items.length} הפריטים כקטלוג הקבוע של "${formData.warehouse_name}"`
                                : `Save ${formData.items.length} items as the default catalog for "${formData.warehouse_name}"`}
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
                                {language === 'he' ? 'שמור לקטלוג מחסן' : 'Save to Warehouse Catalog'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg overflow-x-auto overflow-y-auto max-h-[60vh]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b">
                          <TableRow>
                            <TableHead>{t('item_name')}</TableHead>
                            <TableHead>{t('counted_quantity')}</TableHead>
                            <TableHead>{t('unit')}</TableHead>
                            <TableHead>{t('price_per_unit')}</TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 transition-colors select-none group" 
                              onClick={() => handleSort('total_cost')}
                            >
                              <div className="flex items-center gap-1">
                                {t('total_cost')}
                                {sortConfig.key === 'total_cost' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                                ) : (
                                  <ArrowUpDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                )}
                              </div>
                            </TableHead>
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
                                  step="any" 
                                  value={item.counted_quantity === 0 && typeof item.counted_quantity === 'number' ? '' : item.counted_quantity}
                                  onChange={(e) => updateItemQuantity(index, e.target.value)}
                                  className="w-24 hide-arrows"
                                />
                              </TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.price_per_unit}
                                  onChange={(e) => updateItemPrice(index, e.target.value)}
                                  className="w-24 hide-arrows"
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
                    {hasDraft && (
                      <div className="flex items-center text-xs text-gray-500 whitespace-nowrap self-center hidden md:flex">
                        {language === 'he' ? '(נשמר אוטומטית)' : '(Auto-saved)'}
                      </div>
                    )}
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