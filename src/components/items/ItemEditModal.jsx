import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { useLanguage } from "../LanguageProvider";
import { X, ChevronDown, Loader, ChefHat } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";

export default function ItemEditModal({ item, suppliers, warehouses, isOpen, onClose, onSave }) {
  const [formData, setFormData] = React.useState(item || {});
  const { t, language } = useLanguage();

  React.useEffect(() => {
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

      setFormData({
        ...item,
        warehouse_ids: filteredIds,
        warehouse_names: filteredNames,
        warehouse_id: filteredIds[0] || "",
        warehouse_name: filteredNames[0] || ""
      });
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
      let currentIds = (prev.warehouse_ids || []).filter(id => id && typeof id === 'string' && id.trim() !== "");
      let currentNames = (prev.warehouse_names || []).filter(name => name && typeof name === 'string' && name.trim() !== "");
      
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

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">{language === 'he' ? 'פרטי פריט' : 'Item Details'}</TabsTrigger>
            <TabsTrigger value="recipes">{language === 'he' ? 'מתכונים מקושרים' : 'Linked Recipes'}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="nickname">{language === 'he' ? 'כינוי (בשפה שלך, יופיע לך בלבד)' : 'Nickname (in your language)'}</Label>
            <Input
              id="nickname"
              value={formData.nickname || ''}
              onChange={(e) => handleChange('nickname', e.target.value)}
              placeholder={language === 'he' ? 'למשל: עגבניה (כשהשם הוא Tomato)' : 'e.g. Tomato'}
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
            <DropdownMenu dir={language === 'he' ? 'rtl' : 'ltr'}>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between font-normal overflow-hidden">
                  <span className="truncate flex-1 min-w-0 text-left rtl:text-right">
                    {((formData.warehouse_names && formData.warehouse_names.length > 0) || formData.warehouse_name)
                      ? (formData.warehouse_names && formData.warehouse_names.length > 0 
                          ? formData.warehouse_names.join(", ") 
                          : formData.warehouse_name)
                      : t('select_warehouse')}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2 rtl:mr-2 rtl:ml-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]" style={{ zIndex: 99999 }}>
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
              <Label htmlFor="content_unit">{language === 'he' ? 'יחידת מידה לתכולה' : 'Content unit'}</Label>
              <Select 
                value={formData.content_unit || "unit"}
                onValueChange={(value) => handleChange("content_unit", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('unit_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">{t('unit_kg') || "ק״ג"}</SelectItem>
                  <SelectItem value="gram">{t('unit_g') || "גרם"}</SelectItem>
                  <SelectItem value="liter">{t('unit_liter') || "ליטר"}</SelectItem>
                  <SelectItem value="ml">{t('unit_ml') || "מ״ל"}</SelectItem>
                  <SelectItem value="unit">{t('unit_piece') || "יחידה"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_per_unit">{language === 'he' ? 'תכולה ליחידה' : 'Content per unit'}</Label>
              <Input
                id="content_per_unit"
                type="number"
                value={formData.content_per_unit || ''}
                onChange={(e) => handleChange('content_per_unit', parseFloat(e.target.value) || 1)}
                min="0.01"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">{language === 'he' ? 'כמה יש ביחידה אחת (למשל 330 לפחית)' : 'Amount per single unit'}</p>
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
                  ? (formData.price * (1 - (formData.discount / 100))).toFixed(2)
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
                {((formData.price ? (formData.price * (1 - ((formData.discount || 0) / 100))) : 0) / (formData.units_per_package || 1)).toFixed(2)}
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
          </TabsContent>
          
          <TabsContent value="recipes" className="pt-2">
            <LinkedRecipesTab itemId={item?.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function LinkedRecipesTab({ itemId }) {
  const [recipes, setRecipes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const { language } = useLanguage();

  React.useEffect(() => {
    if (!itemId) {
      setLoading(false);
      return;
    }
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        const allRecipes = await base44.entities.Recipe.filter({});
        const linked = allRecipes.filter(r => 
          r.ingredients?.some(ing => ing.item_id === itemId)
        );
        setRecipes(linked);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, [itemId]);

  if (loading) return <div className="py-8 text-center"><Loader className="w-6 h-6 animate-spin mx-auto text-gray-500" /></div>;

  if (recipes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>{language === 'he' ? 'פריט זה אינו משוייך לאף מתכון.' : 'This item is not linked to any recipes.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <p className="text-sm text-gray-500 mb-4">
        {language === 'he' ? `פריט זה מופיע ב-${recipes.length} מתכונים:` : `This item appears in ${recipes.length} recipes:`}
      </p>
      {recipes.map(r => {
        const ingredient = r.ingredients.find(ing => ing.item_id === itemId);
        return (
          <div key={r.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center">
            <div>
              <div className="font-semibold text-gray-800">{r.name}</div>
              <div className="text-xs text-gray-500">{language === 'he' ? 'סוג: ' : 'Type: '} {r.type === 'prep_recipe' ? (language === 'he' ? 'הכנה' : 'Prep') : (language === 'he' ? 'מנה למכירה' : 'Sale Item')}</div>
            </div>
            {ingredient && (
              <div className="text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded border" dir="ltr">
                {ingredient.quantity} {ingredient.unit}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}