import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Search, ArrowUpDown } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { base44 } from "@/api/base44Client";

export default function CogsReportForm({ report, onSave, onCancel }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  
  const [formData, setFormData] = useState(report || {
    name: "",
    report_date: new Date().toISOString().split('T')[0],
    report_type: "planned",
    total_sales: 0,
    total_cogs: 0,
    gross_profit: 0,
    cogs_percentage: 0,
    items: []
  });
  
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    base44.entities.Recipe.filter({ type: 'sale_item' }).then(setRecipes);
  }, []);

  const recalculateTotals = (items) => {
    let totalSales = 0;
    let totalCogs = 0;

    items.forEach(item => {
      totalSales += Number(item.total_sales || 0);
      totalCogs += Number(item.quantity_sold || 0) * Number(item.unit_cost || 0);
    });

    const grossProfit = totalSales - totalCogs;
    const cogsPercentage = totalSales > 0 ? (totalCogs / totalSales) * 100 : 0;

    return { totalSales, totalCogs, grossProfit, cogsPercentage };
  };

  const handleAddRecipe = (recipe) => {
    const newItem = {
      recipe_id: recipe.id,
      item_name: recipe.name,
      quantity_sold: 1,
      unit_cost: recipe.total_cost || 0,
      unit_price: recipe.sale_price || 0,
      total_sales: recipe.sale_price || 0,
      cost_percentage: recipe.sale_price > 0 ? ((recipe.total_cost || 0) / recipe.sale_price) * 100 : 0
    };

    const newItems = [...formData.items, newItem];
    const totals = recalculateTotals(newItems);

    setFormData({
      ...formData,
      items: newItems,
      total_sales: totals.totalSales,
      total_cogs: totals.totalCogs,
      gross_profit: totals.grossProfit,
      cogs_percentage: totals.cogsPercentage
    });
    setSearchTerm("");
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...formData.items];
    
    if (value === '') {
      newItems[index][field] = '';
    } else {
      newItems[index][field] = Number(value) || 0;
    }
    
    if (field === 'quantity_sold') {
      newItems[index].total_sales = (Number(newItems[index].quantity_sold) || 0) * (Number(newItems[index].unit_price) || 0);
    }

    const qty = Number(newItems[index].quantity_sold) || 0;
    const cost = Number(newItems[index].unit_cost) || 0;
    const sales = Number(newItems[index].total_sales) || 0;
    
    if (sales > 0) {
      newItems[index].cost_percentage = ((qty * cost) / sales) * 100;
    } else {
      newItems[index].cost_percentage = 0;
    }

    const totals = recalculateTotals(newItems);

    setFormData({
      ...formData,
      items: newItems,
      total_sales: totals.totalSales,
      total_cogs: totals.totalCogs,
      gross_profit: totals.grossProfit,
      cogs_percentage: totals.cogsPercentage
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const totals = recalculateTotals(newItems);

    setFormData({
      ...formData,
      items: newItems,
      total_sales: totals.totalSales,
      total_cogs: totals.totalCogs,
      gross_profit: totals.grossProfit,
      cogs_percentage: totals.cogsPercentage
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (report?.id) {
        await base44.entities.CogsReport.update(report.id, formData);
      } else {
        await base44.entities.CogsReport.create(formData);
      }
      onSave();
    } catch (error) {
      console.error(error);
      alert("Error saving report");
    }
    setLoading(false);
  };

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = [...formData.items].map((item, index) => ({ ...item, originalIndex: index }));
  if (sortConfig.key) {
    sortedItems.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{report ? (language === 'he' ? 'עריכת דוח COGS' : 'Edit COGS Report') : (language === 'he' ? 'דוח COGS חדש' : 'New COGS Report')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'he' ? 'שם הדוח' : 'Report Name'}</label>
              <Input 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'he' ? 'תאריך' : 'Date'}</label>
              <Input 
                type="date"
                required 
                value={formData.report_date} 
                onChange={e => setFormData({...formData, report_date: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'he' ? 'סוג' : 'Type'}</label>
              <select
                value={formData.report_type}
                onChange={e => setFormData({...formData, report_type: e.target.value})}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="planned">{language === 'he' ? 'תכנון' : 'Planned'}</option>
                <option value="actual">{language === 'he' ? 'בפועל' : 'Actual'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border">
            <div className="text-center">
              <div className="text-xs text-gray-500">{language === 'he' ? 'סה"כ מכירות' : 'Total Sales'}</div>
              <div className="font-bold text-green-600 text-lg">₪{formData.total_sales.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">{language === 'he' ? 'סה"כ COGS' : 'Total COGS'}</div>
              <div className="font-bold text-red-600 text-lg">₪{formData.total_cogs.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">{language === 'he' ? 'רווח גולמי' : 'Gross Profit'}</div>
              <div className="font-bold text-blue-600 text-lg">₪{formData.gross_profit.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">{language === 'he' ? 'אחוז COGS' : 'COGS %'}</div>
              <div className="font-bold text-orange-600 text-lg">{formData.cogs_percentage.toFixed(2)}%</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold mb-4">{language === 'he' ? 'פריטים נמכרים' : 'Sold Items'}</h3>
            
            <div className="relative mb-4">
              <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} text-gray-400 w-4 h-4`} />
              <Input
                placeholder={language === 'he' ? 'חפש מתכון להוספה לדוח...' : 'Search recipe to add...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isRTL ? 'pr-9' : 'pl-9'}
              />
              {searchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                  {filteredRecipes.length > 0 ? (
                    filteredRecipes.map(recipe => (
                      <div 
                        key={recipe.id} 
                        className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                        onClick={() => handleAddRecipe(recipe)}
                      >
                        <span>{recipe.name}</span>
                        <span className="text-sm text-gray-500">
                          {language === 'he' ? 'עלות:' : 'Cost:'} ₪{recipe.total_cost} | {language === 'he' ? 'מכירה:' : 'Sale:'} ₪{recipe.sale_price}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-gray-500 text-center">{language === 'he' ? 'לא נמצאו מתכונים' : 'No recipes found'}</div>
                  )}
                </div>
              )}
            </div>

            <div className="relative border rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm text-left rtl:text-right">
                  <thead className="bg-[#d4a373] text-white sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3 font-bold cursor-pointer hover:bg-white/10 transition-colors select-none" onClick={() => handleSort('item_name')}>
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'פריט' : 'Item'} {sortConfig.key === 'item_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </div>
                      </th>
                      <th className="p-3 font-bold text-center cursor-pointer hover:bg-white/10 transition-colors select-none" onClick={() => handleSort('quantity_sold')}>
                        <div className="flex items-center justify-center gap-1">
                          {language === 'he' ? 'כמות נמכרת' : 'Qty Sold'} {sortConfig.key === 'quantity_sold' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </div>
                      </th>
                      <th className="p-3 font-bold text-center cursor-pointer hover:bg-white/10 transition-colors select-none" onClick={() => handleSort('unit_cost')}>
                        <div className="flex items-center justify-center gap-1">
                          {language === 'he' ? 'עלות יח\'' : 'Unit Cost'} {sortConfig.key === 'unit_cost' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </div>
                      </th>
                      <th className="p-3 font-bold text-center cursor-pointer hover:bg-white/10 transition-colors select-none" onClick={() => handleSort('cost_percentage')}>
                        <div className="flex items-center justify-center gap-1">
                          {language === 'he' ? 'אחוז עלות' : 'Cost %'} {sortConfig.key === 'cost_percentage' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </div>
                      </th>
                      <th className="p-3 font-bold text-center cursor-pointer hover:bg-white/10 transition-colors select-none" onClick={() => handleSort('total_sales')}>
                        <div className="flex items-center justify-center gap-1">
                          {language === 'he' ? 'סה"כ מכירות' : 'Total Sales'} {sortConfig.key === 'total_sales' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </div>
                      </th>
                      <th className="p-3 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5dfd3]">
                    {sortedItems.map((item) => {
                      const idx = item.originalIndex;
                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="p-2 font-medium text-gray-800 align-middle">
                            {item.item_name}
                          </td>
                          <td className="p-2 align-middle">
                            <Input 
                              type="number" 
                              className="w-20 h-8 mx-auto text-center" 
                              value={item.quantity_sold}
                              onChange={(e) => handleUpdateItem(idx, 'quantity_sold', e.target.value)}
                            />
                          </td>
                          <td className="p-2 align-middle">
                            <Input 
                              type="number" 
                              step="0.01"
                              className="w-20 h-8 mx-auto font-bold text-red-600 text-center" 
                              value={item.unit_cost === undefined ? '' : item.unit_cost}
                              onChange={(e) => handleUpdateItem(idx, 'unit_cost', e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-center align-middle">
                            <div className="flex flex-col items-center justify-center">
                              <div className="font-bold text-green-600" title="Cost %">
                                {Number(item.cost_percentage).toFixed(1)}%
                              </div>
                              {item.recipe_id ? (
                                <span className="text-[10px] bg-green-100 text-green-800 px-1 rounded mt-0.5">{language === 'he' ? 'אוטומטי' : 'Auto'}</span>
                              ) : (
                                <span className="text-[10px] bg-orange-100 text-orange-800 px-1 rounded mt-0.5">{language === 'he' ? 'ידני' : 'Manual'}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 align-middle">
                            <Input 
                              type="number" 
                              className="w-24 h-8 mx-auto font-bold text-[#d4a373] text-center" 
                              value={item.total_sales}
                              onChange={(e) => handleUpdateItem(idx, 'total_sales', e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-center align-middle">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 mx-auto" onClick={() => handleRemoveItem(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {formData.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {language === 'he' ? 'לא נוספו פריטים לדוח' : 'No items added to report'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>{language === 'he' ? 'ביטול' : 'Cancel'}</Button>
            <Button type="submit" disabled={loading} className="bg-[#107c41] hover:bg-[#0c5e31]">
              {language === 'he' ? 'שמור דוח' : 'Save Report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}