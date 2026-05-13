import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Search } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ItemEditModal from "../items/ItemEditModal";

export default function RecipeForm({ recipe, onSave, onCancel }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [formData, setFormData] = useState(recipe || {
    name: "",
    type: "sale_item",
    sale_price: 0,
    total_cost: 0,
    target_sfc_percent: 30,
    ingredients: [],
    yield_quantity: 1,
    yield_unit: 'unit'
  });
  const [items, setItems] = useState([]);
  const [prepRecipes, setPrepRecipes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      let currentUser;
      try { currentUser = await base44.auth.me(); } catch(e){}
      
      if (!currentUser) {
        base44.entities.Item.filter({}, "name", 10000).then(setItems);
        base44.entities.Recipe.filter({ type: "prep_recipe" }, "name", 10000).then(setPrepRecipes);
        base44.entities.Supplier.filter({}, "name", 10000).then(setSuppliers);
        base44.entities.Warehouse.filter({}, "name", 10000).then(setWarehouses);
        return;
      }

      let targetEmail = currentUser.acting_as_store_email || currentUser.store_user_owner_email || currentUser.email;
      if (!currentUser.store_user_owner_email) {
        try {
          const recs = await base44.entities.StoreUser.filter({ user_email: currentUser.email, is_active: true });
          if (recs.length > 0) targetEmail = recs[0].owner_email;
        } catch(e){}
      }

      const fetchWithFallback = async (entity, field, extraQuery = {}) => {
         let data = await base44.entities[entity].filter({ created_by: targetEmail, ...extraQuery }, field, 10000);
         let storeData = await base44.entities[entity].filter({ store_owner_email: targetEmail, ...extraQuery }, field, 10000);
         data = [...data, ...storeData].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
         
         if (targetEmail !== currentUser.email) {
           const myData = await base44.entities[entity].filter({ created_by: currentUser.email, ...extraQuery }, field, 10000);
           const myStoreData = await base44.entities[entity].filter({ store_owner_email: currentUser.email, ...extraQuery }, field, 10000);
           data = [...data, ...myData, ...myStoreData].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
         }
         if (currentUser.chain_id && !currentUser.is_chain_head) {
           try {
             const chain = await base44.entities.Chain.filter({ id: currentUser.chain_id });
             if (chain.length > 0) {
               const headEmail = chain[0].head_store_user_email;
               const headData = await base44.entities[entity].filter({ created_by: headEmail, ...extraQuery }, field, 10000);
               data = [...headData, ...data].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
             }
           } catch(e){}
         }
         return data;
      };

      const fetchedItems = await fetchWithFallback('Item', 'name');
      const fetchedPrep = await fetchWithFallback('Recipe', 'name', { type: 'prep_recipe' });
      
      setItems(fetchedItems);
      setSuppliers(await fetchWithFallback('Supplier', 'name'));
      setWarehouses(await fetchWithFallback('Warehouse', 'name'));
      setPrepRecipes(fetchedPrep);

      // Recalculate costs based on latest item prices
      if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
        let changed = false;
        const updatedIngredients = recipe.ingredients.map(ing => {
          const qty = Number(ing.quantity) || 0;
          const item = fetchedItems.find(i => i.id === ing.item_id || (ing.item_name && i.name && i.name.toLowerCase() === ing.item_name.toLowerCase()));
          const prep = fetchedPrep.find(r => r.id === ing.item_id || (ing.item_name && r.name && r.name.toLowerCase() === ing.item_name.toLowerCase()));
          
          let newCost = ing.cost !== undefined && ing.cost !== null ? ing.cost : 0;
          let newUnitPrice = ing.unit_price !== undefined && ing.unit_price !== null ? ing.unit_price : 0;
          
          if (ing.cost === null || ing.cost === undefined || ing.unit_price === null || ing.unit_price === undefined) {
            changed = true;
          }

          if (item) {
            // Ensure item_id and item_name are updated if matched by name
            ing.item_id = item.id;
            ing.item_name = item.name;
            
            const price = item.price_after_discount || item.price || 0;
            const unitsPerPackage = item.units_per_package || 1;
            const contentPerUnit = item.content_per_unit || 1;
            const purchaseUnit = item.unit || 'unit';
            const contentUnit = item.content_unit || 'unit';
            
            let calculatedCost = qty * (price / unitsPerPackage);
            if (ing.unit === purchaseUnit) {
              calculatedCost = (qty / unitsPerPackage) * price;
            } else if (ing.unit === 'unit' && purchaseUnit === 'case') {
              calculatedCost = qty * (price / unitsPerPackage);
            } else {
              let factor = null;
              if (ing.unit === contentUnit) factor = 1;
              else if (ing.unit === 'kg' && contentUnit === 'gram') factor = 1000;
              else if (ing.unit === 'gram' && contentUnit === 'kg') factor = 0.001;
              else if (ing.unit === 'liter' && contentUnit === 'ml') factor = 1000;
              else if (ing.unit === 'ml' && contentUnit === 'liter') factor = 0.001;
              
              if (factor !== null) {
                const totalContent = unitsPerPackage * contentPerUnit;
                const costPerContentUnit = price / totalContent;
                calculatedCost = qty * factor * costPerContentUnit;
              } else {
                let factor2 = null;
                if (ing.unit === purchaseUnit) factor2 = 1;
                else if (ing.unit === 'kg' && purchaseUnit === 'gram') factor2 = 1000;
                else if (ing.unit === 'gram' && purchaseUnit === 'kg') factor2 = 0.001;
                else if (ing.unit === 'liter' && purchaseUnit === 'ml') factor2 = 1000;
                else if (ing.unit === 'ml' && purchaseUnit === 'liter') factor2 = 0.001;
                
                if (factor2 !== null) {
                  const costPerPurchaseUnit = price / unitsPerPackage;
                  calculatedCost = qty * factor2 * costPerPurchaseUnit;
                }
              }
            }
            
            if (calculatedCost !== ing.cost) {
              newCost = calculatedCost;
              newUnitPrice = qty > 0 ? calculatedCost / qty : newUnitPrice;
              changed = true;
            }
          } else if (prep || ing.is_prep_recipe) {
            if (prep) {
              ing.item_id = prep.id;
              ing.item_name = prep.name;

              const costPerUnit = prep.yield_quantity > 0 ? (prep.total_cost || 0) / prep.yield_quantity : (prep.total_cost || 0);
              const calculatedCost = costPerUnit * qty;
              if (calculatedCost !== ing.cost) {
                newCost = calculatedCost;
                newUnitPrice = costPerUnit;
                changed = true;
              }
            }
          }
          
          return { ...ing, cost: newCost, unit_price: newUnitPrice, original_item: item };
        });

        if (changed) {
          setFormData(prev => ({
            ...prev,
            ingredients: updatedIngredients,
            total_cost: updatedIngredients.reduce((sum, ing) => sum + (Number(ing.cost) || 0), 0)
          }));
        }
      }
    };
    loadData();
  }, [recipe]);

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
      unit_price: initialCost,
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
    const ing = { ...newIngredients[index] };
    newIngredients[index] = ing;
    
    if (ing.unit_price === undefined) {
      const oldQty = Number(ing.quantity) || 1;
      const oldCost = Number(ing.cost) || 0;
      ing.unit_price = oldQty > 0 ? oldCost / oldQty : 0;
    }
    
    ing[field] = value;
    
    if (field === 'quantity' || field === 'unit') {
      const qty = Number(ing.quantity) || 0;
      const item = ing.original_item || items.find(i => i.id === ing.item_id);
      const prep = prepRecipes.find(r => r.id === ing.item_id);
      
      if (item) {
        ing.cost = getIngredientCost(item, qty, ing.unit);
        ing.unit_price = qty > 0 ? ing.cost / qty : ing.unit_price;
      } else if (prep || ing.is_prep_recipe) {
        if (prep) {
          const costPerUnit = prep.yield_quantity > 0 ? (prep.total_cost || 0) / prep.yield_quantity : (prep.total_cost || 0);
          ing.cost = costPerUnit * qty;
          ing.unit_price = costPerUnit;
        } else {
          ing.cost = (ing.unit_price || 0) * qty;
        }
      } else {
        ing.cost = (ing.unit_price || 0) * qty;
      }
    } else if (field === 'cost') {
      ing.cost = value === '' ? '' : Number(value);
      const parsedCost = Number(value) || 0;
      const qty = Number(ing.quantity) || 1;
      ing.unit_price = qty > 0 ? Number((parsedCost / qty).toFixed(4)) : 0;
    } else if (field === 'unit_price') {
      ing.unit_price = value === '' ? '' : Number(value);
      const parsedUnitPrice = Number(value) || 0;
      const qty = Number(ing.quantity) || 0;
      ing.cost = Number((parsedUnitPrice * qty).toFixed(4));
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

  const filteredPrepRecipes = prepRecipes.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!recipe || r.id !== recipe.id) // prevent self-reference
  );

  const handleItemSave = async (updatedItem) => {
    try {
      await base44.entities.Item.update(updatedItem.id, updatedItem);
      
      // Update local items state
      setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
      
      // Recalculate cost for the ingredient in the recipe form
      const newIngredients = formData.ingredients.map(ing => {
        if (ing.item_id === updatedItem.id) {
          return {
            ...ing,
            item_name: updatedItem.name,
            original_item: updatedItem,
            cost: getIngredientCost(updatedItem, ing.quantity, ing.unit)
          };
        }
        return ing;
      });
      
      setFormData({
        ...formData,
        ingredients: newIngredients,
        total_cost: calculateTotalCost(newIngredients)
      });
      
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
      alert(language === 'he' ? 'שגיאה בשמירת הפריט' : 'Error saving item');
    }
  };

  const handleAddPrepRecipe = (prep) => {
    const costPerUnit = prep.yield_quantity > 0 ? (prep.total_cost || 0) / prep.yield_quantity : (prep.total_cost || 0);
    const newIngredients = [...formData.ingredients, {
      item_id: prep.id,
      item_name: prep.name,
      quantity: 1,
      unit: prep.yield_unit || 'unit',
      cost: costPerUnit,
      unit_price: costPerUnit,
      is_prep_recipe: true
    }];
    setFormData({
      ...formData,
      ingredients: newIngredients,
      total_cost: calculateTotalCost(newIngredients)
    });
    setSearchTerm("");
  };

  return (
    <Dialog open={true} onOpenChange={(open) => {
      // Don't close if editing item modal is open
      if (!open && !editingItem) onCancel();
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => {
        if (editingItem) e.preventDefault();
      }}>
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

            {formData.type === 'prep_recipe' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">{language === 'he' ? 'כמות מתקבלת (Yield)' : 'Yield Quantity'}</label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    step="0.01"
                    value={formData.yield_quantity || 1} 
                    onChange={e => setFormData({...formData, yield_quantity: parseFloat(e.target.value) || 1})} 
                    className="w-1/2"
                  />
                  <select
                    value={formData.yield_unit || 'unit'}
                    onChange={e => setFormData({...formData, yield_unit: e.target.value})}
                    className="w-1/2 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    {UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const totalCost = formData.total_cost || 0;
                  const yieldQty = formData.yield_quantity || 1;
                  const yieldUnit = formData.yield_unit || 'unit';
                  const costPerUnit = yieldQty > 0 ? totalCost / yieldQty : 0;
                  
                  let extraText = '';
                  if (yieldUnit === 'kg') {
                    extraText = `₪${(costPerUnit / 1000).toFixed(4)} / ${language === 'he' ? 'גרם' : 'gram'}`;
                  } else if (yieldUnit === 'liter') {
                    extraText = `₪${(costPerUnit / 1000).toFixed(4)} / ${language === 'he' ? 'מ״ל' : 'ml'}`;
                  } else if (yieldUnit === 'gram') {
                    extraText = `₪${(costPerUnit * 1000).toFixed(2)} / ${language === 'he' ? 'ק״ג' : 'kg'}`;
                  } else if (yieldUnit === 'ml') {
                    extraText = `₪${(costPerUnit * 1000).toFixed(2)} / ${language === 'he' ? 'ליטר' : 'liter'}`;
                  }

                  return (
                    <div className="mt-2 text-sm bg-blue-50 p-2 rounded-md border border-blue-100">
                      <span className="font-bold text-blue-800">₪{costPerUnit.toFixed(2)}</span> <span className="text-blue-700">/ {UNITS.find(u => u.value === yieldUnit)?.label || yieldUnit}</span>
                      {extraText && <div className="text-gray-500 text-xs mt-1">{extraText}</div>}
                    </div>
                  );
                })()}
              </div>
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
                  {filteredItems.length === 0 && filteredPrepRecipes.length === 0 ? (
                    <div className="p-2 text-gray-500 text-center">{language === 'he' ? 'לא נמצאו פריטים' : 'No items found'}</div>
                  ) : (
                    <>
                      {filteredPrepRecipes.map(prep => (
                        <div
                          key={`prep-${prep.id}`}
                          className="p-2 hover:bg-purple-50 cursor-pointer flex justify-between items-center"
                          onClick={() => {
                            handleAddPrepRecipe(prep);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                              {language === 'he' ? 'הכנה' : 'PREP'}
                            </span>
                            <span>{prep.name}</span>
                          </div>
                          <span className="text-sm text-gray-500">₪{Number(prep.total_cost || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      {filteredItems.map(item => (
                        <div
                          key={`item-${item.id}`}
                          className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                          onClick={() => {
                            handleAddIngredient(item);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {item.supplier_name && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shrink-0">
                                {item.supplier_name}
                              </span>
                            )}
                            <span>{item.name}</span>
                          </div>
                          <span className="text-sm text-gray-500">₪{Number(item.price_after_discount || item.price || 0).toFixed(2)} / {language === 'he' ? 'אריזה' : 'pkg'}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {formData.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md border">
                  <div 
                    className={`flex-1 font-medium text-sm flex items-center gap-1.5 ${!ing.is_prep_recipe ? 'cursor-pointer hover:text-[#d4a373] transition-colors' : ''}`}
                    onClick={(e) => {
                      if (!ing.is_prep_recipe) {
                        e.stopPropagation();
                        const itemToEdit = ing.original_item || items.find(i => i.id === ing.item_id);
                        if (itemToEdit) setEditingItem(itemToEdit);
                      }
                    }}
                    title={!ing.is_prep_recipe ? (language === 'he' ? 'לחץ לעריכת פריט' : 'Click to edit item') : ''}
                  >
                    {!ing.is_prep_recipe && (ing.original_item?.supplier_name || items.find(i => i.id === ing.item_id)?.supplier_name) && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shrink-0">
                        {ing.original_item?.supplier_name || items.find(i => i.id === ing.item_id)?.supplier_name}
                      </span>
                    )}
                    {ing.is_prep_recipe && (
                      <span className="text-xs font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded shrink-0">{language === 'he' ? 'הכנה' : 'PREP'}</span>
                    )}
                    <span className={!ing.is_prep_recipe ? 'underline decoration-dotted underline-offset-2' : ''}>{ing.item_name}</span>
                  </div>
                  <Input 
                    type="number" 
                    step="0.01" 
                    className="w-20 h-8" 
                    value={ing.quantity}
                    onChange={(e) => handleUpdateIngredient(idx, 'quantity', e.target.value)}
                  />
                  {ing.is_prep_recipe ? (
                    <div className="w-24 h-8 flex items-center justify-center text-xs text-gray-400">{language === 'he' ? 'יחידה' : 'unit'}</div>
                  ) : (
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
                  )}
                  <div className="flex items-center gap-1" title={language === 'he' ? 'מחיר ליחידה' : 'Unit Price'}>
                    <span className="text-[10px] text-gray-500 hidden md:inline whitespace-nowrap">{language === 'he' ? 'יחידה:' : 'Unit:'}</span>
                    <Input 
                      type="number" 
                      step="0.01" 
                      className="w-16 h-8 px-1 text-sm text-center" 
                      value={ing.unit_price !== undefined && ing.unit_price !== null ? ing.unit_price : ""}
                      onChange={(e) => handleUpdateIngredient(idx, 'unit_price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-center gap-1" title={language === 'he' ? 'סה״כ לשורה' : 'Total Cost'}>
                    <span className="text-[10px] text-gray-500 hidden md:inline whitespace-nowrap">{language === 'he' ? 'סה״כ:' : 'Total:'}</span>
                    <Input 
                      type="number" 
                      step="0.01" 
                      className="w-16 h-8 px-1 text-sm font-bold text-center" 
                      value={ing.cost !== undefined && ing.cost !== null ? ing.cost : ""}
                      onChange={(e) => handleUpdateIngredient(idx, 'cost', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => handleRemoveIngredient(idx)}>
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
            <Button type="submit" disabled={loading} className="bg-[#d4a373] hover:bg-[#b88c60]">
              {language === 'he' ? 'שמור מתכון' : 'Save Recipe'}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {editingItem && (
        <ItemEditModal
          item={editingItem}
          suppliers={suppliers}
          warehouses={warehouses}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleItemSave}
        />
      )}
    </Dialog>
  );
}