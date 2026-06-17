import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChefHat, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function RecipeListView({ recipes, onEdit, onDelete }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig(direction ? { key, direction } : { key: null, direction: null });
  };

  const sortedRecipes = [...recipes].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    if (sortConfig.key === 'cost_percentage') {
      const getCostPercentage = (r) => (r.type === 'sale_item' && r.sale_price > 0) ? ((r.total_cost / (r.sale_price / 1.18)) * 100) : -1;
      aValue = getCostPercentage(a);
      bValue = getCostPercentage(b);
    } else {
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
    }
    
    if (typeof aValue === 'string') {
      const comp = aValue.localeCompare(bValue || '', language === 'he' ? 'he' : 'en');
      return sortConfig.direction === 'asc' ? comp : -comp;
    }
    
    if (aValue == null) aValue = -999999999;
    if (bValue == null) bValue = -999999999;
    
    return sortConfig.direction === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
  });

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key || !sortConfig.direction) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 text-gray-700" /> : <ArrowDown className="w-4 h-4 text-gray-700" />;
  };

  const getSortHeaderClass = () => {
    return `cursor-pointer hover:bg-gray-50 transition-colors select-none ${isRTL ? "text-right" : "text-left"}`;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Table wrapperClassName="max-h-[calc(100vh-250px)]">
        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
          <TableRow>
            <TableHead className={getSortHeaderClass()} onClick={() => handleSort('name')}>
              <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : ""}`}>
                {language === 'he' ? 'שם המתכון' : 'Recipe Name'}
                {renderSortIcon('name')}
              </div>
            </TableHead>
            <TableHead className={getSortHeaderClass()} onClick={() => handleSort('type')}>
              <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : ""}`}>
                {language === 'he' ? 'סוג' : 'Type'}
                {renderSortIcon('type')}
              </div>
            </TableHead>
            <TableHead className={getSortHeaderClass()} onClick={() => handleSort('total_cost')}>
              <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : ""}`}>
                {language === 'he' ? 'עלות כוללת' : 'Total Cost'}
                {renderSortIcon('total_cost')}
              </div>
            </TableHead>
            <TableHead className={getSortHeaderClass()} onClick={() => handleSort('sale_price')}>
              <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : ""}`}>
                {language === 'he' ? 'מחיר מכירה' : 'Sale Price'}
                {renderSortIcon('sale_price')}
              </div>
            </TableHead>
            <TableHead className={getSortHeaderClass()} onClick={() => handleSort('cost_percentage')}>
              <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : ""}`}>
                {language === 'he' ? 'אחוז עלות' : 'Cost %'}
                {renderSortIcon('cost_percentage')}
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
                    : (language === 'he' ? 'מתכון הכנה' : 'Prep Recipe')}
                </span>
              </TableCell>
              <TableCell className="text-red-600 font-bold">{Number(recipe.total_cost || 0).toFixed(2)}</TableCell>
              <TableCell className="text-green-600 font-bold">
                {recipe.type === 'sale_item' ? `${Number(recipe.sale_price || 0).toFixed(2)}` : '-'}
              </TableCell>
              <TableCell>
                {recipe.type === 'sale_item' && recipe.sale_price > 0 
                  ? `${((recipe.total_cost / (recipe.sale_price / 1.18)) * 100).toFixed(1)}%` 
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
                return totalSale > 0 ? `${((totalCost / (totalSale / 1.18)) * 100).toFixed(1)}%` : '-';
              })()}
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}