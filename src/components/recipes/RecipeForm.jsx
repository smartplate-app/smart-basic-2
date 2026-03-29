import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Search } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RecipeForm({ recipe, onSave, onCancel }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [formData, setFormData] = useState(recipe || {
    name: "",
    type: "sale_item",
    sale_price: 0,
    total_cost: 0,
    target_sfc_percent: 30,
    ingredients: []
  });
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.entities.Item.filter({}, "name").then(setItems);
  }, []);

  const UNITS = [
    { value: "kg", label: language === 'he' ? "ק״ג" : "kg" },
    { value: "gram", label: language === 'he' ? "גרם" : "gram" },
    { value: "liter", label: language === 'he' ? "ליטר" : "liter" },
    { value: "ml", label: language === 'he' ? "מ״ל" : "ml" },
    { value: "unit", label: language === 'he' ? "יחידה" : "unit" }
  ];

  const getConversionFactor = (fromUnit, toUnit) => {
    if (fromUnit === toUnit) return 1;
    if (fromUnit === 'kg' && toUnit === 'gram') return 1000;
    if (fromUnit === 'gram' && toUnit === 'kg') return 0.001;
    if (fromUnit === 'liter' && toUnit === 'ml') return 1000;
    if (fromUnit === 'ml' && toUnit === 'liter') return 0.001;
    return null;
  };

  const getIngredientCost = (item, quantity, recipeUnit) => {
    const price = item.price_after_discount || item.price || 0;
    const unitsPerPackage = item.units_per_package || 1;
    const contentPerUnit = item.content_per_unit || 1;
    const purchaseUnit = item.unit || 'unit';
    const contentUnit = item.content_unit || 'unit';

    if (recipeUnit === purchaseUnit) {
      return (quantity / unitsPerPackage) * price;
    }

    if (recipeUnit === 'unit' && purchaseUnit === 'case') {
      return quantity * (price / unitsPerPackage);
    }

    let factor = getConversionFactor(recipeUnit, contentUnit);
    if (factor !== null) {
      const totalContent = unitsPerPackage * contentPerUnit;
      const costPerContentUnit = price / totalContent;
      return quantity * factor * costPerContentUnit;
    }

    let factor2 = getConversionFactor(recipeUnit, purchaseUnit);
    if (factor2 !== null) {
      const costPerPurchaseUnit = price / unitsPerPackage;
      return quantity * factor2 * costPerPurchaseUnit;
    }

    return quantity * (price / unitsPerPackage);
  };

  const calculateTotalCost = (ingredients) => {
    return ingredients.reduce((sum, ing) => sum + (Number(ing.cost) || 0), 0);
  };

  const handleAddIngredient = (item) => {
    // Default recipe unit is the purchase unit, unless it's a case, then default to unit
    const defaultRecipeUnit = item.unit === 'case' ? 'unit' : (item.unit || 'unit');
    const initialQuantity = 1;
    const initialCost = getIngredientCost(item, initialQuantity, defaultRecipeUnit);
    
    const newIngredients = [...formData.ingredients, {
      item_id: item.id,
      item_name: item.name,
      quantity: initialQuantity,
      unit: defaultRecipeUnit,
      cost: initialCost,
      original_item: item // Store the original item to recalculate cost when unit changes
    }];
    setFormData({
      ...formData,
      ingredients: newIngredients,
      total_cost: calculateTotalCost(newIngredients)
    });
    setSearchTerm("");
  };

  const handleUpdateIngredient = (index, field, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index][field] = value;
    
    if (field === 'quantity' || field === 'unit') {
      const item = newIngredients[index].original_item || items.find(i => i.id === newIngredients[index].item_id);
      if (item) {
        newIngredients[index].cost = getIngredientCost(item, Number(newIngredients[index].quantity), newIngredients[index].unit);
      }
    }

    setFormData({
      ...formData,
      ingredients: newIngredients,
      total_cost: calculateTotalCost(newIngredients)
    });
  };

  const handleRemoveIngredient = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      ingredients: newIngredients,
      total_cost: calculateTotalCost(newIngredients)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (recipe?.id) {
        await base44.entities.Recipe.update(recipe.id, formData);
      } else {
        await base44.entities.Recipe.create(formData);
      }
      onSave();
    } catch (error) {
      console.error(error);
      alert("Error saving recipe");
    }
    setLoading(false);
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? (language === 'he' ? 'עריכת מתכון' : 'Edit Recipe') : (language === 'he' ? 'מתכון חדש' : 'New Recipe')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'he' ? 'שם המתכון' : 'Recipe Name'}</label>
              <Input 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'he' ? 'סוג' : 'Type'}</label>
              <select
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="sale_item">{language === 'he' ? 'פריט למכירה' : 'Sale Item'}</option>
                <option value="prep_recipe">{language === 'he' ? 'מתכון הכנה' : 'Prep Recipe'}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'he' ? 'עלות כוללת' : 'Total Cost'}</label>
              <Input 
                type="number" 
                step="0.01"
                value={formData.total_cost} 
                onChange={e => setFormData({...formData, total_cost: parseFloat(e.target.value) || 0})} 
                className="bg-gray-50 font-bold text-red-600"
              />
            </div>

            {formData.type === 'sale_item' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'he' ? 'אחוז עלות מתוקצב (SFC %)' : 'Budgeted Food Cost %'}</label>
                  <Input 
                    type="number" 
                    step="1"
                    value={formData.target_sfc_percent || 30} 
                    onChange={e => setFormData({...formData, target_sfc_percent: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'he' ? 'מחיר מכירה מוצע (כולל מע"מ)' : 'Suggested Selling Price (incl. VAT)'}</label>
                  <div className="h-9 flex items-center px-3 bg-green-50 text-green-700 font-bold rounded-md border border-green-200">
                    {formData.total_cost && (formData.target_sfc_percent || 30) ? 
                      Math.round((100 / ((formData.target_sfc_percent || 30) + 5)) * formData.total_cost * 1.18) 
                      : '0'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {language === 'he' 
                      ? `אחוז עלות מזון (${formData.target_sfc_percent || 30}%) + 5% פחת + מע"מ` 
                      : `food cost % (${formData.target_sfc_percent || 30}%) + 5% Q factor + vat`}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'he' ? 'מחיר בתפריט' : 'Price on Menu'}</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    required 
                    value={formData.sale_price} 
                    onChange={e => setFormData({...formData, sale_price: parseFloat(e.target.value) || 0})} 
                  />
                  {(() => {
                    const actualExclVat = (formData.sale_price || 0) / 1.18;
                    const costPct = actualExclVat > 0 ? (formData.total_cost / actualExclVat) * 100 : 0;
                    return (
                      <div className="mt-1 text-xs text-gray-500">
                        {language === 'he' ? 'אחוז עלות: ' : 'Cost %: '}
                        <span className="font-bold text-orange-600">{costPct.toFixed(1)}%</span>
                        {language === 'he' ? ' (עלות / מחיר ללא מע"מ)' : ' (cost / price excl. VAT)'}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold mb-4">{language === 'he' ? 'מרכיבים' : 'Ingredients'}</h3>
            
            <div className="relative mb-4">
              <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} text-gray-400 w-4 h-4`} />
              <Input
                placeholder={language === 'he' ? 'חפש פריט מהמלאי להוספה...' : 'Search inventory item to add...'}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className={isRTL ? 'pr-9' : 'pl-9'}
              />
              {isDropdownOpen && (
                <div 
                  className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <div 
                        key={item.id} 
                        className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                        onClick={() => {
                          handleAddIngredient(item);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <span>{item.name}</span>
                        <span className="text-sm text-gray-500">{item.price_after_discount || item.price} / {item.unit}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-gray-500 text-center">{language === 'he' ? 'לא נמצאו פריטים' : 'No items found'}</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {formData.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md border">
                  <div className="flex-1 font-medium text-sm">{ing.item_name}</div>
                  <Input 
                    type="number" 
                    step="0.01" 
                    className="w-20 h-8" 
                    value={ing.quantity}
                    onChange={(e) => handleUpdateIngredient(idx, 'quantity', e.target.value)}
                  />
                  <Select 
                    value={ing.unit} 
                    onValueChange={(value) => handleUpdateIngredient(idx, 'unit', value)}
                  >
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => (
                        <SelectItem key={u.value} value={u.value} className="text-xs">
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-sm font-bold w-16 text-left">{Number(ing.cost).toFixed(2)}</div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveIngredient(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {formData.ingredients.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm border border-dashed rounded-md">
                  {language === 'he' ? 'לא נוספו מרכיבים' : 'No ingredients added'}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>{language === 'he' ? 'ביטול' : 'Cancel'}</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {language === 'he' ? 'שמור מתכון' : 'Save Recipe'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}