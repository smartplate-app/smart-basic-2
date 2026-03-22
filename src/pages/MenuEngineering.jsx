import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "../components/LanguageProvider";
import { Lock, Plus, Trash2, HelpCircle, LayoutGrid, List, Edit, Percent, TrendingUp, DollarSign, Clock, Star, Tractor, Puzzle, Dog, Filter, RefreshCw } from "lucide-react";

export default function MenuEngineeringPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [viewMode, setViewMode] = useState("grid");
  const [activeTab, setActiveTab] = useState("all");

  const handleAuth = (e) => {
    e.preventDefault();
    if (passcode === "2233") {
      setIsAuthenticated(true);
      loadRecipes();
    } else {
      alert(language === 'he' ? 'קוד שגוי' : 'Invalid code');
    }
  };

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Recipe.filter({ type: 'sale_item' }, "-created_date");
      setRecipes(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleQuantityChange = (id, value) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Number(value) || 0
    }));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-6 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {language === 'he' ? 'אזור מוגן' : 'Protected Area'}
            </h2>
            <p className="text-gray-500">
              {language === 'he' ? 'הזן קוד גישה כדי לצפות בניתוח הנדסת תפריט' : 'Enter access code to view Menu Engineering Analysis'}
            </p>
            <form onSubmit={handleAuth} className="space-y-4 mt-4">
              <Input
                type="password"
                placeholder={language === 'he' ? 'קוד גישה' : 'Access code'}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
              <Button type="submit" className="w-full bg-[#107c41] hover:bg-[#0c5e31]">
                {language === 'he' ? 'כניסה' : 'Enter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate Menu Engineering Metrics
  let totalVolume = 0;
  let totalRevenue = 0;
  let totalFoodCost = 0;
  let totalProfit = 0;
  let validItemsCount = 0;

  const itemsData = recipes.map(recipe => {
    const qty = quantities[recipe.id] || 0;
    const salePrice = Number(recipe.sale_price) || 0;
    const cost = Number(recipe.total_cost) || 0;
    const itemProfit = salePrice - cost;
    const totalItemProfit = itemProfit * qty;
    const totalItemRevenue = salePrice * qty;
    const totalItemCost = cost * qty;

    if (qty > 0) {
      totalVolume += qty;
      totalRevenue += totalItemRevenue;
      totalFoodCost += totalItemCost;
      totalProfit += totalItemProfit;
      validItemsCount++;
    }

    return {
      ...recipe,
      qty,
      itemProfit,
      totalItemProfit,
      salePrice,
      cost
    };
  });

  const avgVolume = validItemsCount > 0 ? totalVolume / validItemsCount : 0;
  const avgProfit = totalVolume > 0 ? totalProfit / totalVolume : 0;
  const overallFoodCostPercent = totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0;
  const avgMix = validItemsCount > 0 ? 100 / validItemsCount : 0;

  const categorizedItems = itemsData.map(item => {
    let category = "";
    let color = "";
    const mixPercent = totalVolume > 0 ? (item.qty / totalVolume) * 100 : 0;
    const isHighMix = mixPercent >= avgMix;
    const isHighProfit = item.itemProfit >= avgProfit;

    if (item.qty === 0) {
      category = language === 'he' ? 'אין מכירות' : 'No Sales';
      color = "bg-gray-100 text-gray-600 border-gray-200";
    } else if (isHighMix && isHighProfit) {
      category = language === 'he' ? 'כוכב' : 'Star';
      color = "bg-green-50 text-green-700 border-green-200";
    } else if (isHighMix && !isHighProfit) {
      category = language === 'he' ? 'סוס עבודה' : 'Plowhorse';
      color = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (!isHighMix && isHighProfit) {
      category = language === 'he' ? 'חידה' : 'Puzzle';
      color = "bg-yellow-50 text-yellow-700 border-yellow-200";
    } else {
      category = language === 'he' ? 'כלב' : 'Dog';
      color = "bg-red-50 text-red-700 border-red-200";
    }

    return { ...item, category, color, mixPercent, isHighMix, isHighProfit };
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-3 items-center w-full md:w-auto">
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'נקה הכל' : 'Clear All'}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'הוסף פריט' : 'Add Item'}
            </Button>
            <div className="relative flex-1 md:w-48">
              <select className="w-full h-10 pl-3 pr-8 text-sm border rounded-md appearance-none bg-white">
                <option>{language === 'he' ? 'הכל' : 'All'}</option>
              </select>
              <Filter className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <Button variant="outline" className="text-gray-600">
              <HelpCircle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'מדריך מושגים' : 'Concepts Guide'}
            </Button>
          </div>
          <div className={`text-${isRTL ? 'left' : 'right'}`}>
            <h1 className="text-3xl font-bold text-blue-700">
              {language === 'he' ? 'ניתוח הנדסת תפריט' : 'Menu Engineering Analysis'}
            </h1>
            <p className="text-gray-500 mt-1">
              {language === 'he' ? 'נתח את ביצועי התפריט שלך עם תובנות מבוססות נתונים' : 'Analyze your menu performance with data-driven insights'}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-0">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{language === 'he' ? '% עלות מזון' : 'Food Cost %'}</p>
                <h3 className="text-2xl font-bold">{overallFoodCostPercent.toFixed(2)}%</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                <Percent className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-0">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{language === 'he' ? 'סה"כ תרומה' : 'Total Contribution'}</p>
                <h3 className="text-2xl font-bold">₪{totalProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-500">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-0">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{language === 'he' ? 'סה"כ הכנסות' : 'Total Revenue'}</p>
                <h3 className="text-2xl font-bold">₪{totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-500">
                <DollarSign className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-0">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{language === 'he' ? 'סה"כ נמכר' : 'Total Sold'}</p>
                <h3 className="text-2xl font-bold">{totalVolume.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and View Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2">
            <Button 
              variant={activeTab === 'all' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('all')}
              className={activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm border' : 'bg-transparent border-0 text-gray-500'}
            >
              <RefreshCw className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'כל הפריטים' : 'All Items'} ({recipes.length})
            </Button>
            <Button 
              variant={activeTab === 'matrix' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('matrix')}
              className={activeTab === 'matrix' ? 'bg-white text-gray-900 shadow-sm border' : 'bg-transparent border-0 text-gray-500'}
            >
              <LayoutGrid className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'תצוגת מטריצה' : 'Matrix View'}
            </Button>
          </div>
          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              {language === 'he' ? 'כרטיסיות' : 'Grid'}
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${viewMode === 'list' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-4 h-4" />
              {language === 'he' ? 'רשימה' : 'List'}
            </button>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categorizedItems.map(item => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-white border border-gray-200 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md mt-2 font-medium border border-gray-200">
                        {language === 'he' ? 'כללי' : 'General'}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-bold border ${item.color}`}>
                      {item.category}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm mb-5">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'מספר שנמכר' : 'Sold Count'}</div>
                      <Input
                        type="number"
                        min="0"
                        value={item.qty || ''}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className="w-24 h-8 px-2 py-1 text-sm font-bold bg-gray-50 border-gray-200"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'תמהיל תפריט %' : 'Menu Mix %'}</div>
                      <div className="font-bold text-gray-900 h-8 flex items-center">{item.mixPercent.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'עלות מזון' : 'Food Cost'}</div>
                      <div className="font-bold text-gray-900">₪{item.cost.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'מחיר תפריט' : 'Menu Price'}</div>
                      <div className="font-bold text-gray-900">₪{item.salePrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'תרומה לפריט' : 'Item Contribution'}</div>
                      <div className="font-bold text-green-600">₪{item.itemProfit.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'תרומה לתפריט' : 'Total Contribution'}</div>
                      <div className="font-bold text-green-600">₪{item.totalItemProfit.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex gap-3 text-xs font-medium">
                      <span className={item.isHighMix ? 'text-green-600' : 'text-red-500'}>
                        {language === 'he' ? 'תמהיל: ' : 'Mix: '}
                        {item.isHighMix ? (language === 'he' ? 'גבוה' : 'High') : (language === 'he' ? 'נמוך' : 'Low')}
                      </span>
                      <span className={item.isHighProfit ? 'text-green-600' : 'text-red-500'}>
                        {language === 'he' ? 'תרומה: ' : 'Contribution: '}
                        {item.isHighProfit ? (language === 'he' ? 'גבוהה' : 'High') : (language === 'he' ? 'נמוכה' : 'Low')}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {categorizedItems.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center text-gray-500">
                {language === 'he' ? 'לא נמצאו מנות למכירה' : 'No sale items found'}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50 border-b text-gray-500">
                  <tr>
                    <th className={`px-6 py-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'שם הפריט' : 'Item Name'}</th>
                    <th className={`px-6 py-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'קטגוריה' : 'Category'}</th>
                    <th className={`px-6 py-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'נמכר' : 'Sold'}</th>
                    <th className={`px-6 py-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'עלות מזון' : 'Food Cost'}</th>
                    <th className={`px-6 py-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'מחיר תפריט' : 'Menu Price'}</th>
                    <th className={`px-6 py-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'תרומה' : 'Contribution'}</th>
                    <th className={`px-6 py-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? '% תמהיל' : 'Mix %'}</th>
                    <th className={`px-6 py-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'סיווג' : 'Classification'}</th>
                    <th className={`px-6 py-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'פעולות' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {categorizedItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          {language === 'he' ? 'כללי' : 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          type="number"
                          min="0"
                          value={item.qty || ''}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          className="w-20 h-8 text-center bg-transparent border-gray-200"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 text-gray-600">₪{item.cost.toFixed(2)}</td>
                      <td className="px-6 py-4 font-medium text-green-600">₪{item.salePrice.toFixed(2)}</td>
                      <td className="px-6 py-4 text-gray-600">{item.itemProfit > 0 ? `${((item.itemProfit / item.salePrice) * 100).toFixed(1)}%` : '0.0%'}</td>
                      <td className="px-6 py-4 text-gray-600">{item.mixPercent.toFixed(1)}%</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${item.color}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categorizedItems.length === 0 && !loading && (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                        {language === 'he' ? 'לא נמצאו מנות למכירה' : 'No sale items found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}