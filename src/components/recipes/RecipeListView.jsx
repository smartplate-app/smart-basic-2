import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChefHat, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function RecipeListView({ recipes, onEdit, onDelete }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const getCostPct = (recipe) => {
    if (recipe.type !== 'sale_item') return 0;
    const sales = recipe.sale_price || 0;
    return sales > 0 ? ((recipe.total_cost || 0) / sales) * 100 : 0;
  };

  const sortedRecipes = [...recipes].sort((a, b) => {
    let valA, valB;
    if (sortCol === 'name') {
      valA = a.name || '';
      valB = b.name || '';
    } else if (sortCol === 'type') {
      valA = a.type || '';
      valB = b.type || '';
    } else if (sortCol === 'total_cost') {
      const yieldA = a.type === 'prep_recipe' && a.yield_quantity > 0 ? a.yield_quantity : 1;
      const yieldB = b.type === 'prep_recipe' && b.yield_quantity > 0 ? b.yield_quantity : 1;
      valA = (a.total_cost || 0) / yieldA;
      valB = (b.total_cost || 0) / yieldB;
    } else if (sortCol === 'sale_price') {
      valA = a.sale_price || 0;
      valB = b.sale_price || 0;
    } else if (sortCol === 'cost_pct') {
      valA = getCostPct(a);
      valB = getCostPct(b);
    }

    if (valA === valB) return 0;
    
    if (typeof valA === 'string' && typeof valB === 'string') {
      const cmp = valA.localeCompare(valB, language === 'he' ? 'he' : 'en');
      return sortDir === 'asc' ? cmp : -cmp;
    }

    // Number comparison
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Table wrapperClassName="max-h-[calc(100vh-250px)]">
        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
          <TableRow>
            <TableHead 
              className={`cursor-pointer hover:bg-gray-50 transition-colors ${isRTL ? "text-right" : "text-left"}`}
              onClick={() => toggleSort('name')}
            >
              <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : ""}`}>
                {language === 'he' ? 'שם המתכון' : 'Recipe Name'}
                {sortCol === 'name' ? (sortDir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 text-gray-400" />}
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer hover:bg-gray-50 transition-colors ${isRTL ? "text-right" : "text-left"}`}
              onClick={() => toggleSort('type')}
            >
              <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : ""}`}>
                {language === 'he' ? 'סוג' : 'Type'}
                {sortCol === 'type' ? (sortDir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 text-gray-400" />}
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer hover:bg-gray-50 transition-colors ${isRTL ? "text-right" : "text-left"}`}
              onClick={() => toggleSort('total_cost')}
            >
              <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : ""}`}>
                {language === 'he' ? 'עלות כוללת' : 'Total Cost'}
                {sortCol === 'total_cost' ? (sortDir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 text-gray-400" />}
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer hover:bg-gray-50 transition-colors ${isRTL ? "text-right" : "text-left"}`}
              onClick={() => toggleSort('sale_price')}
            >
              <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : ""}`}>
                {language === 'he' ? 'מחיר מכירה' : 'Sale Price'}
                {sortCol === 'sale_price' ? (sortDir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 text-gray-400" />}
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer hover:bg-gray-50 transition-colors ${isRTL ? "text-right" : "text-left"}`}
              onClick={() => toggleSort('cost_pct')}
            >
              <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : ""}`}>
                {language === 'he' ? 'אחוז עלות' : 'Cost %'}
                {sortCol === 'cost_pct' ? (sortDir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 text-gray-400" />}
              </div>
            </TableHead>
            <TableHead className={isRTL ? "text-right" : "text-left"}>{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRecipes.map((recipe) => (
            <TableRow key={recipe.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit(recipe)}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-orange-500" />
                  {recipe.name}
                </div>
              </TableCell>
              <TableCell>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${recipe.type === 'sale_item' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                  {recipe.type === 'sale_item' 
                    ? (language === 'he' ? 'פריט למכירה' : 'Sale Item') 
                    : (language === 'he' ? 'פריט הכנה' : 'Prep Item')}
                </span>
              </TableCell>
              <TableCell className="text-red-600 font-bold">{Number(recipe.total_cost || 0).toFixed(2)}</TableCell>
              <TableCell className="text-green-600 font-bold">
                {recipe.type === 'sale_item' ? `${Number(recipe.sale_price || 0).toFixed(2)}` : '-'}
              </TableCell>
              <TableCell>
                {recipe.type === 'sale_item' && recipe.sale_price > 0 
                  ? `${((recipe.total_cost / recipe.sale_price) * 100).toFixed(1)}%` 
                  : '-'}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(recipe); }} className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-gray-100 dark:bg-gray-800">
          <TableRow>
            <TableCell colSpan={2} className={`font-bold text-lg ${isRTL ? 'text-left' : 'text-right'}`}>
              {language === 'he' ? 'סה״כ:' : 'Total:'}
            </TableCell>
            <TableCell className="font-bold text-red-600 text-lg">
              {recipes.reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0).toFixed(2)}
            </TableCell>
            <TableCell className="font-bold text-green-600 text-lg">
              {recipes.filter(r => r.type === 'sale_item').reduce((sum, r) => sum + (Number(r.sale_price) || 0), 0).toFixed(2)}
            </TableCell>
            <TableCell className="font-bold text-lg">
              {(() => {
                const totalCost = recipes.filter(r => r.type === 'sale_item').reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0);
                const totalSale = recipes.filter(r => r.type === 'sale_item').reduce((sum, r) => sum + (Number(r.sale_price) || 0), 0);
                return totalSale > 0 ? `${((totalCost / totalSale) * 100).toFixed(1)}%` : '-';
              })()}
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}