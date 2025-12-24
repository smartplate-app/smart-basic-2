import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse } from "@/entities/Warehouse";
import { Item } from "@/entities/Item";
import { X, Plus, Edit, Trash2, Package } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function WarehouseManagement({ warehouses, onClose }) {
  const { t } = useLanguage();
  const [localWarehouses, setLocalWarehouses] = useState(warehouses);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [showItemSelection, setShowItemSelection] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    is_active: true,
    catalog_items: []
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const items = await Item.list();
      setAllItems(items);
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
      if (editingWarehouse) {
        await Warehouse.update(editingWarehouse.id, formData);
      } else {
        await Warehouse.create(formData);
      }
      
      const updatedWarehouses = await Warehouse.list();
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
      catalog_items: warehouse.catalog_items || []
    });
    setShowForm(true);
  };

  const handleManageItems = (warehouse) => {
    setShowItemSelection(warehouse);
    setFormData({
      ...warehouse,
      catalog_items: warehouse.catalog_items || []
    });
  };

  const toggleItemInCatalog = (itemId) => {
    setFormData(prev => {
      const catalog = prev.catalog_items || [];
      const exists = catalog.includes(itemId);
      
      return {
        ...prev,
        catalog_items: exists 
          ? catalog.filter(id => id !== itemId)
          : [...catalog, itemId]
      };
    });
  };

  const saveCatalogItems = async () => {
    try {
      await Warehouse.update(showItemSelection.id, {
        ...showItemSelection,
        catalog_items: formData.catalog_items
      });
      
      const updatedWarehouses = await Warehouse.list();
      setLocalWarehouses(updatedWarehouses);
      setShowItemSelection(null);
      alert(t('save') + ' ' + t('items') + ' ✓');
    } catch (error) {
      console.error("Error saving catalog items:", error);
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
                              <Badge variant="outline" className="mt-2">
                                <Package className="w-3 h-3 mr-1" />
                                {warehouse.catalog_items.length} {t('items')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageItems(warehouse)}
                            >
                              <Package className="w-4 h-4 ml-1" />
                              {t('items')}
                            </Button>
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
                                  await Warehouse.delete(warehouse.id);
                                  const updated = await Warehouse.list();
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
            </form>
          )}

          {showItemSelection && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">
                  {t('items')} - {showItemSelection.name}
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
                  {t('select')} {t('items')} {t('for')} {t('warehouse')}. {t('when')} {t('new_count')}, {t('these')} {t('items')} {t('will')} {t('be')} {t('automatically')} {t('loaded')}.
                </p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
                {allItems.length === 0 ? (
                  <p className="text-gray-500">{t('no_items_to_display')}</p>
                ) : (
                  allItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        checked={(formData.catalog_items || []).includes(item.id)}
                        onCheckedChange={() => toggleItemInCatalog(item.id)}
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

              <div className="flex gap-3 justify-end pt-4 border-t">
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
                  {t('save')} {t('items')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}