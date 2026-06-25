import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "../components/LanguageProvider";
import { Lock, Plus, Trash2, HelpCircle, LayoutGrid, List, Edit, Percent, TrendingUp, DollarSign, Clock, Star, Tractor, Puzzle, Dog, Filter, RefreshCw, Tag, ArrowUpDown, Settings, FileSpreadsheet, Loader2 } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

export default function MenuEngineeringPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('menu_eng_auth') === 'true');
  const [passcode, setPasscode] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [activeTab, setActiveTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const defaultColumns = {
    category: true,
    soldCount: true,
    foodCost: true,
    menuPrice: true,
    theoreticalRevenue: true,
    sfc: true,
    cogs: true,
    itemContribution: true,
    totalContribution: true,
    contributionPercent: true,
    mixPercent: true,
    classification: true,
  };
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('menuEngColumns');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaultColumns to ensure new columns are visible by default
        return { ...defaultColumns, ...parsed };
      }
    } catch(e) {}
    return defaultColumns;
  });

  useEffect(() => {
    localStorage.setItem('menuEngColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRecipes();
    }
  }, [isAuthenticated]);

  const handleAuth = (e) => {
    e.preventDefault();
    if (passcode === "2233") {
      sessionStorage.setItem('menu_eng_auth', 'true');
      setIsAuthenticated(true);
    } else {
      alert(language === 'he' ? 'קוד שגוי' : 'Invalid code');
    }
  };

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const workingEmail = user?.acting_as_store_email || user?.acting_as_user_email || user?.store_user_owner_email || user?.email;
      const isAdminControlling = !!(user?.admin_original_email && user?.acting_as_user_email);
      let data = [];
      
      if (isAdminControlling) {
          const dataCreated = await base44.entities.Recipe.filter({ type: 'sale_item', created_by: workingEmail }, "-created_date", 10000);
          const dataOwned = await base44.entities.Recipe.filter({ type: 'sale_item', store_owner_email: workingEmail }, "-created_date", 10000);
          data = [...dataCreated, ...dataOwned].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      } else {
          const dataCreated = await base44.entities.Recipe.filter({ type: 'sale_item', created_by: workingEmail }, "-created_date", 10000);
          const dataOwned = await base44.entities.Recipe.filter({ type: 'sale_item', store_owner_email: workingEmail }, "-created_date", 10000);
          data = [...dataCreated, ...dataOwned].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      }
      setRecipes(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const user = await base44.auth.me();
    const workingEmail = user?.acting_as_store_email || user?.acting_as_user_email || user?.store_user_owner_email || user?.email;

    const data = {
      name: formData.get('name'),
      menu_category: formData.get('menu_category'),
      sold_count: Number(formData.get('sold_count')),
      sale_price: Number(formData.get('sale_price')),
      total_cost: Number(formData.get('total_cost')),
      manual_cost: Number(formData.get('total_cost')),
      use_manual_cost: true,
      type: 'sale_item',
      store_owner_email: workingEmail
    };

    try {
      if (editingItem?.id) {
        await base44.entities.Recipe.update(editingItem.id, data);
      } else {
        await base44.entities.Recipe.create(data);
      }
      setShowItemModal(false);
      loadRecipes();
    } catch (err) {
      console.error(err);
      alert('Error saving item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm(language === 'he' ? 'האם אתה בטוח שברצונך למחוק פריט זה?' : 'Are you sure you want to delete this item?')) return;
    try {
      await base44.entities.Recipe.delete(id);
      loadRecipes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInlineSoldCountUpdate = async (id, newValue) => {
    const val = Number(newValue) || 0;
    const item = recipes.find(r => r.id === id);
    if (item && Number(item.sold_count) === val) return;

    try {
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, sold_count: val } : r));
      await base44.entities.Recipe.update(id, { sold_count: val });
    } catch (e) {
      console.error(e);
      loadRecipes();
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(language === 'he' ? 'האם אתה בטוח שברצונך לאפס את כל נתוני המכירות?' : 'Are you sure you want to reset all sales data?')) return;
    
    try {
      setLoading(true);
      const updates = recipes.map(r => base44.entities.Recipe.update(r.id, { sold_count: 0 }));
      await Promise.all(updates);
      await loadRecipes();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToSheets = async () => {
    try {
      setIsExporting(true);
      const res = await base44.functions.invoke('exportMenuEngineeringToSheets', {
        itemsData: sortedItems
      });
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        alert(language === 'he' ? 'שגיאה ביצוא הנתונים' : 'Error exporting data');
      }
    } catch (err) {
      console.error("Export error", err);
      alert(language === 'he' ? 'שגיאה ביצוא הנתונים' : 'Error exporting data');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-6 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 text-[#d4a373] rounded-full flex items-center justify-center mb-4">
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

  const categoryLabels = {
    general: language === 'he' ? 'כללי' : 'General',
    morning: language === 'he' ? 'בוקר' : 'Morning',
    noon: language === 'he' ? 'צהריים' : 'Noon',
    evening: language === 'he' ? 'ערב' : 'Evening'
  };

  const filteredRecipes = categoryFilter === 'all' 
    ? recipes 
    : recipes.filter(r => r.menu_category === categoryFilter);

  // Calculate Menu Engineering Metrics
  let totalVolume = 0;
  let totalRevenue = 0;
  let totalFoodCost = 0;
  let totalProfit = 0;
  let validItemsCount = 0;
  let totalSFC = 0;
  let sfcItemsCount = 0;

  const itemsData = filteredRecipes.map(recipe => {
    const qty = Number(recipe.sold_count) || 0;
    const salePrice = Number(recipe.sale_price) || 0;
    const cost = Number(recipe.use_manual_cost ? recipe.manual_cost : recipe.total_cost) || 0;
    
    let salePriceExVat = salePrice;
    let sfc = 0;
    if (salePrice > 0) {
      salePriceExVat = salePrice / 1.18;
      sfc = (cost / salePriceExVat) * 100;
    }

    const itemProfit = salePriceExVat - cost;
    const totalItemProfit = itemProfit * qty;
    const totalItemRevenue = salePrice * qty;
    const totalItemCost = cost * qty;

    if (sfc > 0) {
      totalSFC += sfc;
      sfcItemsCount++;
    }

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
      salePriceExVat,
      cost,
      sfc,
      totalItemCost,
      totalItemRevenue
    };
  });

  const avgProfit = totalVolume > 0 ? totalProfit / totalVolume : 0;
  const overallFoodCostPercent = totalRevenue > 0 ? (totalFoodCost / (totalRevenue / 1.18)) * 100 : 0; // COGS %
  const avgSFC = sfcItemsCount > 0 ? totalSFC / sfcItemsCount : 0; // Avg SFC % (1 from each)
  const avgMixBenchmark = validItemsCount > 0 ? (100 / validItemsCount) * 0.7 : 0; // Kasavana/Smith 70% rule

  const categorizedItems = itemsData.map(item => {
    let category = "";
    let categoryEn = "";
    let color = "";
    const mixPercent = totalVolume > 0 ? (item.qty / totalVolume) * 100 : 0;
    const isHighMix = mixPercent >= avgMixBenchmark;
    const isHighProfit = item.itemProfit >= avgProfit;

    if (item.qty === 0) {
      category = language === 'he' ? 'אין מכירות' : 'No Sales';
      categoryEn = 'No Sales';
      color = "bg-gray-100 text-gray-600 border-gray-200";
    } else if (isHighMix && isHighProfit) {
      category = language === 'he' ? 'כוכב' : 'Star';
      categoryEn = 'Star';
      color = "bg-green-50 text-green-700 border-green-200";
    } else if (isHighMix && !isHighProfit) {
      category = language === 'he' ? 'סוס עבודה' : 'Plowhorse';
      categoryEn = 'Plowhorse';
      color = "bg-blue-50 text-[#b88c60] border-blue-200";
    } else if (!isHighMix && isHighProfit) {
      category = language === 'he' ? 'חידה' : 'Puzzle';
      categoryEn = 'Puzzle';
      color = "bg-yellow-50 text-yellow-700 border-yellow-200";
    } else {
      category = language === 'he' ? 'כלב' : 'Dog';
      categoryEn = 'Dog';
      color = "bg-red-50 text-red-700 border-red-200";
    }

    return { ...item, category, categoryEn, color, mixPercent, isHighMix, isHighProfit };
  });

  const sortedItems = [...categorizedItems].sort((a, b) => {
    if (sortConfig.key) {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (sortConfig.key === 'contributionPercent') {
         aVal = a.itemProfit > 0 ? (a.itemProfit / a.salePriceExVat) : 0;
         bVal = b.itemProfit > 0 ? (b.itemProfit / b.salePriceExVat) : 0;
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getCategoryIcon = (categoryEn) => {
    switch(categoryEn) {
      case 'Star': return <Star className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />;
      case 'Plowhorse': return <Tractor className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />;
      case 'Puzzle': return <Puzzle className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />;
      case 'Dog': return <Dog className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />;
      default: return null;
    }
  };

  const renderMatrixView = () => {
    const data = categorizedItems.filter(item => item.qty > 0).map(item => ({
      name: item.name,
      x: item.mixPercent,
      y: item.itemProfit,
      category: item.category,
      color: item.color.includes('green') ? '#15803d' : 
             item.color.includes('blue') ? '#1d4ed8' : 
             item.color.includes('yellow') ? '#a16207' : '#b91c1c'
    }));

    return (
      <Card className="shadow-sm border-0 mt-6 bg-white rounded-2xl">
        <CardHeader>
          <CardTitle>{language === 'he' ? 'מטריצת הנדסת תפריט' : 'Menu Engineering Matrix'}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="h-[400px] w-full flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
              <LayoutGrid className="w-12 h-12 mb-4 text-gray-300" />
              <p>{language === 'he' ? 'אין מספיק נתוני מכירות להצגת המטריצה.' : 'Not enough sales data to display the matrix.'}</p>
              <p className="text-sm mt-1">{language === 'he' ? 'אנא עדכן כמויות שנמכרו עבור הפריטים.' : 'Please update sold quantities for the items.'}</p>
            </div>
          ) : (
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis type="number" dataKey="x" name="Mix %" unit="%" tick={{fontSize: 12}} />
                <YAxis type="number" dataKey="y" name="Profit" unit="₪" tick={{fontSize: 12}} />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border shadow-lg rounded-lg">
                        <p className="font-bold">{data.name}</p>
                        <p className="text-sm text-gray-600">{language === 'he' ? 'תמהיל:' : 'Mix:'} {data.x.toFixed(1)}%</p>
                        <p className="text-sm text-gray-600">{language === 'he' ? 'תרומה:' : 'Profit:'} ₪{data.y.toFixed(2)}</p>
                        <p className={`text-sm font-bold mt-1`} style={{color: data.color}}>{data.category}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Scatter name="Items" data={data}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Scatter>
                <ReferenceLine x={avgMixBenchmark} stroke="#64748b" strokeDasharray="3 3" label={{ position: 'top', value: language === 'he' ? 'רף תמהיל' : 'Mix Benchmark', fill: '#64748b', fontSize: 12 }} />
                <ReferenceLine y={avgProfit} stroke="#64748b" strokeDasharray="3 3" label={{ position: 'right', value: language === 'he' ? 'ממוצע תרומה' : 'Avg Profit', fill: '#64748b', fontSize: 12 }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            <Button variant="outline" onClick={handleClearAll} className="text-gray-700 border-gray-300 hover:bg-gray-100">
              <Trash2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'נקה הכל' : 'Clear All'}
            </Button>
            <Button onClick={() => { setEditingItem(null); setShowItemModal(true); }} className="bg-[#d4a373] hover:bg-[#b88c60] text-white">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'הוסף פריט' : 'Add Item'}
            </Button>
            <Button variant="outline" onClick={handleExportToSheets} disabled={isExporting} className="text-gray-700 bg-white border-green-200 hover:bg-green-50 hover:text-green-700">
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 text-green-600" />}
              {language === 'he' ? 'ייצוא ל-Sheets' : 'Export to Sheets'}
            </Button>
            <div className="relative flex-1 md:w-48">
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-10 pl-3 pr-8 text-sm border rounded-md appearance-none bg-white"
              >
                <option value="all">{language === 'he' ? 'הכל' : 'All'}</option>
                <option value="general">{language === 'he' ? 'כללי' : 'General'}</option>
                <option value="morning">{language === 'he' ? 'בוקר' : 'Morning'}</option>
                <option value="noon">{language === 'he' ? 'צהריים' : 'Noon'}</option>
                <option value="evening">{language === 'he' ? 'ערב' : 'Evening'}</option>
              </select>
              <Filter className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <Button variant="outline" onClick={() => setShowGuideModal(true)} className="text-gray-600 bg-white">
              <HelpCircle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'מדריך מונחים' : 'Concepts Guide'}
            </Button>
            <Button variant="outline" onClick={() => setShowSettingsModal(true)} className="text-gray-600 bg-white">
              <Settings className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'תצוגה' : 'Display'}
            </Button>
          </div>
          <div className={`text-${isRTL ? 'left' : 'right'}`}>
            <h1 className="text-3xl font-bold text-[#b88c60]">
              {language === 'he' ? 'ניתוח הנדסת תפריט' : 'Menu Engineering Analysis'}
            </h1>
            <p className="text-gray-500 mt-1">
              {language === 'he' ? 'נתח את ביצועי התפריט שלך עם תובנות מבוססות נתונים' : 'Analyze your menu performance with data-driven insights'}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-0 rounded-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{language === 'he' ? 'COGS מצטבר %' : 'Total COGS %'}</p>
                <h3 className="text-2xl font-bold">{overallFoodCostPercent.toFixed(2)}%</h3>
                <p className="text-xs text-gray-400 mt-1 font-medium">₪{totalFoodCost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                <Percent className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-0 rounded-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{language === 'he' ? 'ממוצע SFC תיאורטי' : 'Avg Theoretical SFC'}</p>
                <h3 className="text-2xl font-bold">{avgSFC.toFixed(2)}%</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500">
                <Percent className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-0 rounded-2xl">
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
          <Card className="shadow-sm border-0 rounded-2xl">
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
        </div>

        {/* Tabs and View Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 bg-white p-1 rounded-full shadow-sm border border-gray-100">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <RefreshCw className="w-4 h-4" />
              {language === 'he' ? 'כל הפריטים' : 'All Items'} ({filteredRecipes.length})
            </button>
            <button 
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'matrix' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              {language === 'he' ? 'תצוגת מטריצה' : 'Matrix View'}
            </button>
          </div>
          {activeTab === 'all' && (
            <div className="flex bg-white p-1 rounded-lg shadow-sm border border-gray-100">
              <button 
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'he' ? 'כרטיסים' : 'Grid'} <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'he' ? 'רשימה' : 'List'} <List className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        {activeTab === 'matrix' ? renderMatrixView() : (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categorizedItems.map(item => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-white border border-gray-200 rounded-2xl flex flex-col">
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                        <span className="inline-flex items-center px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md mt-2 font-medium border border-gray-200">
                          <Tag className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                          {categoryLabels[item.menu_category || 'general']}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-xs font-bold border flex items-center ${item.color}`}>
                        {getCategoryIcon(item.categoryEn)}
                        {item.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm mb-5 flex-1">
                      {visibleColumns.soldCount && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'מספר שנמכר' : 'Sold Count'}</div>
                        <Input 
                          type="number" 
                          defaultValue={item.qty}
                          onBlur={(e) => handleInlineSoldCountUpdate(item.id, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                          className="w-20 h-8 font-bold text-gray-900 px-2 py-1"
                        />
                      </div>
                      )}
                      {visibleColumns.mixPercent && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'תמהיל תפריט %' : 'Menu Mix %'}</div>
                        <div className="font-bold text-gray-900 text-lg">{item.mixPercent.toFixed(1)}%</div>
                      </div>
                      )}
                      {visibleColumns.foodCost && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'עלות מזון' : 'Food Cost'}</div>
                        <div className="font-bold text-gray-900">₪{item.cost.toFixed(2)}</div>
                      </div>
                      )}
                      {visibleColumns.menuPrice && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'מחיר תפריט' : 'Menu Price'}</div>
                        <div className="font-bold text-gray-900">₪{item.salePrice.toFixed(2)}</div>
                      </div>
                      )}
                      {visibleColumns.theoreticalRevenue && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'הכנסות תיאורטיות' : 'Theoretical Revenue'}</div>
                        <div className="font-bold text-gray-900">₪{item.totalItemRevenue.toFixed(2)}</div>
                      </div>
                      )}
                      {visibleColumns.sfc && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'SFC תיאורטי' : 'Theoretical SFC'}</div>
                        <div className="font-bold text-blue-600">{item.sfc.toFixed(1)}%</div>
                      </div>
                      )}
                      {visibleColumns.cogs && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'סה"כ עלות (COGS)' : 'Total Cost (COGS)'}</div>
                        <div className="font-bold text-gray-900">₪{item.totalItemCost.toFixed(2)}</div>
                      </div>
                      )}
                      {visibleColumns.itemContribution && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'תרומה לפריט' : 'Item Contribution'}</div>
                        <div className="font-bold text-green-600">₪{item.itemProfit.toFixed(2)}</div>
                      </div>
                      )}
                      {visibleColumns.totalContribution && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{language === 'he' ? 'תרומה לתפריט' : 'Total Contribution'}</div>
                        <div className="font-bold text-green-600">₪{item.totalItemProfit.toFixed(2)}</div>
                      </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
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
                        <button onClick={() => { setEditingItem(item); setShowItemModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-sm relative">
                  <thead className="bg-gray-50 border-b text-gray-500 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} onClick={() => requestSort('name')}>
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'שם הפריט' : 'Item Name'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      {visibleColumns.category && (
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} onClick={() => requestSort('menu_category')}>
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'קטגוריה' : 'Category'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      )}
                      {visibleColumns.soldCount && (
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} onClick={() => requestSort('qty')}>
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'נמכר' : 'Sold'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      )}
                      {visibleColumns.foodCost && (
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} onClick={() => requestSort('cost')}>
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'עלות מזון' : 'Food Cost'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      )}
                      {visibleColumns.menuPrice && (
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} onClick={() => requestSort('salePrice')}>
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'מחיר תפריט' : 'Menu Price'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      )}
                      {visibleColumns.theoreticalRevenue && (
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} onClick={() => requestSort('totalItemRevenue')}>
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'הכנסות תיאורטיות' : 'Theoretical Revenue'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      )}
                      {visibleColumns.sfc && (
                      <th 
                        className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} 
                        onClick={() => requestSort('sfc')}
                        title={language === 'he' ? 'אחוז עלות המזון (Food Cost) ליחידה אחת (ללא מע"מ)' : 'Theoretical Food Cost Percentage'}
                      >
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'SFC תיאורטי' : 'Theoretical SFC'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      )}
                      {visibleColumns.cogs && (
                      <th 
                        className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} 
                        onClick={() => requestSort('totalItemCost')}
                        title={language === 'he' ? 'סה"כ עלות המכר (עלות יחידה כפול כמות)' : 'Total Cost of Goods Sold'}
                      >
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'סה"כ עלות (COGS)' : 'Total Cost (COGS)'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      )}
                      {visibleColumns.contributionPercent && (
                      <th 
                        className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} 
                        onClick={() => requestSort('contributionPercent')}
                        title={language === 'he' ? 'אחוז הרווח (Gross Margin %) מתוך מחיר המנה' : 'Contribution Margin Percentage'}
                      >
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'תרומה' : 'Contribution'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      )}
                      {visibleColumns.mixPercent && (
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} onClick={() => requestSort('mixPercent')}>
                        <div className="flex items-center gap-1">
                          {language === 'he' ? '% תמהיל' : 'Mix %'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      )}
                      {visibleColumns.classification && (
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} onClick={() => requestSort('category')}>
                        <div className="flex items-center gap-1">
                          {language === 'he' ? 'סיווג' : 'Classification'}
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      )}
                      <th className={`px-6 py-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'פעולות' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                        {visibleColumns.category && (
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-md text-xs font-medium border border-gray-200">
                            {categoryLabels[item.menu_category || 'general']}
                          </span>
                        </td>
                        )}
                        {visibleColumns.soldCount && (
                        <td className="px-6 py-4 font-bold">
                          <Input 
                            type="number" 
                            defaultValue={item.qty}
                            onBlur={(e) => handleInlineSoldCountUpdate(item.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            className="w-20 h-8 font-bold px-2 py-1 text-center"
                          />
                        </td>
                        )}
                        {visibleColumns.foodCost && (
                        <td className="px-6 py-4 text-gray-600">₪{item.cost.toFixed(2)}</td>
                        )}
                        {visibleColumns.menuPrice && (
                        <td className="px-6 py-4 font-medium text-green-600">₪{item.salePrice.toFixed(2)}</td>
                        )}
                        {visibleColumns.theoreticalRevenue && (
                        <td className="px-6 py-4 text-gray-900">₪{item.totalItemRevenue.toFixed(2)}</td>
                        )}
                        {visibleColumns.sfc && (
                        <td className="px-6 py-4 font-medium text-blue-600">{item.sfc.toFixed(1)}%</td>
                        )}
                        {visibleColumns.cogs && (
                        <td className="px-6 py-4 text-gray-600">₪{item.totalItemCost.toFixed(2)}</td>
                        )}
                        {visibleColumns.contributionPercent && (
                        <td className="px-6 py-4 text-gray-600">{item.itemProfit > 0 ? `${((item.itemProfit / item.salePriceExVat) * 100).toFixed(1)}%` : '0.0%'}</td>
                        )}
                        {visibleColumns.mixPercent && (
                        <td className="px-6 py-4 text-gray-600">{item.mixPercent.toFixed(1)}%</td>
                        )}
                        {visibleColumns.classification && (
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center w-max ${item.color}`}>
                            {getCategoryIcon(item.categoryEn)}
                            {item.category}
                          </span>
                        </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setEditingItem(item); setShowItemModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categorizedItems.length === 0 && !loading && (
                      <tr>
                        <td colSpan="11" className="px-6 py-12 text-center text-gray-500">
                          {language === 'he' ? 'לא נמצאו מנות למכירה' : 'No sale items found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* Add/Edit Item Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? (language === 'he' ? 'ערוך פריט' : 'Edit Item') : (language === 'he' ? 'הוסף פריט' : 'Add Item')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{language === 'he' ? 'שם הפריט' : 'Item Name'}</label>
              <Input name="name" defaultValue={editingItem?.name} required />
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'he' ? 'קטגוריה' : 'Category'}</label>
              <select name="menu_category" defaultValue={editingItem?.menu_category || 'general'} className="w-full h-10 px-3 border rounded-md bg-white">
                <option value="general">{language === 'he' ? 'כללי' : 'General'}</option>
                <option value="morning">{language === 'he' ? 'בוקר' : 'Morning'}</option>
                <option value="noon">{language === 'he' ? 'צהריים' : 'Noon'}</option>
                <option value="evening">{language === 'he' ? 'ערב' : 'Evening'}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{language === 'he' ? 'מספר שנמכר' : 'Sold Count'}</label>
                <Input type="number" name="sold_count" defaultValue={editingItem?.sold_count || 0} min="0" required />
              </div>
              <div>
                <label className="text-sm font-medium">{language === 'he' ? 'עלות מזון' : 'Food Cost'}</label>
                <Input type="number" step="0.01" name="total_cost" defaultValue={editingItem ? (editingItem.use_manual_cost ? editingItem.manual_cost : editingItem.total_cost) : 0} min="0" required />
              </div>
              <div>
                <label className="text-sm font-medium">{language === 'he' ? 'מחיר תפריט' : 'Menu Price'}</label>
                <Input type="number" step="0.01" name="sale_price" defaultValue={editingItem?.sale_price || 0} min="0" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowItemModal(false)}>{language === 'he' ? 'ביטול' : 'Cancel'}</Button>
              <Button type="submit" className="bg-[#d4a373] hover:bg-[#b88c60] text-white">{language === 'he' ? 'שמור' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'he' ? 'הגדרות תצוגה' : 'Display Settings'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {language === 'he' ? 'בחר אילו נתונים להציג בטבלה ובכרטיסיות:' : 'Select which data to display in the table and cards:'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(defaultColumns).map(key => {
                const labels = {
                  category: language === 'he' ? 'קטגוריה' : 'Category',
                  soldCount: language === 'he' ? 'מספר שנמכר' : 'Sold Count',
                  foodCost: language === 'he' ? 'עלות מזון' : 'Food Cost',
                  menuPrice: language === 'he' ? 'מחיר תפריט' : 'Menu Price',
                  theoreticalRevenue: language === 'he' ? 'הכנסות תיאורטיות' : 'Theoretical Revenue',
                  sfc: language === 'he' ? 'SFC תיאורטי' : 'Theoretical SFC',
                  cogs: language === 'he' ? 'סה"כ עלות (COGS)' : 'Total COGS',
                  itemContribution: language === 'he' ? 'תרומה לפריט' : 'Item Contribution',
                  totalContribution: language === 'he' ? 'תרומה לתפריט' : 'Total Contribution',
                  contributionPercent: language === 'he' ? 'תרומה (%)' : 'Contribution (%)',
                  mixPercent: language === 'he' ? '% תמהיל' : 'Mix %',
                  classification: language === 'he' ? 'סיווג' : 'Classification',
                };
                return (
                  <label key={key} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-md border border-transparent hover:border-gray-100 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-[#d4a373] rounded border-gray-300 focus:ring-[#d4a373]"
                      checked={visibleColumns[key]} 
                      onChange={(e) => setVisibleColumns(prev => ({...prev, [key]: e.target.checked}))} 
                    />
                    <span className="text-sm font-medium text-gray-700">{labels[key]}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100">
               <Button onClick={() => setShowSettingsModal(false)} className="bg-[#d4a373] hover:bg-[#b88c60] text-white">
                 {language === 'he' ? 'סגור' : 'Close'}
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Concepts Guide Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{language === 'he' ? 'מדריך מושגים - הנדסת תפריט' : 'Menu Engineering Concepts Guide'}</DialogTitle>
          </DialogHeader>
          <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-bold text-green-800 flex items-center gap-2"><Star className="w-4 h-4"/> {language === 'he' ? 'כוכב (Star)' : 'Star'}</h4>
                <p className="text-sm text-green-700 mt-1">{language === 'he' ? 'פופולריות גבוהה, רווחיות גבוהה. אלו המנות המנצחות שלך. קדם אותן והבלט אותן בתפריט.' : 'High popularity, high profitability. These are your winning dishes. Promote and highlight them on the menu.'}</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-bold text-blue-800 flex items-center gap-2"><Tractor className="w-4 h-4"/> {language === 'he' ? 'סוס עבודה (Plowhorse)' : 'Plowhorse'}</h4>
                <p className="text-sm text-[#b88c60] mt-1">{language === 'he' ? 'פופולריות גבוהה, רווחיות נמוכה. מנות אהובות אך לא רווחיות מספיק. שקול להעלות מחיר מעט או להקטין מנות.' : 'High popularity, low profitability. Beloved dishes but not profitable enough. Consider slightly raising the price or reducing portion size.'}</p>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-bold text-yellow-800 flex items-center gap-2"><Puzzle className="w-4 h-4"/> {language === 'he' ? 'חידה (Puzzle)' : 'Puzzle'}</h4>
                <p className="text-sm text-yellow-700 mt-1">{language === 'he' ? 'פופולריות נמוכה, רווחיות גבוהה. מנות רווחיות שלא נמכרות מספיק. נסה לשפר את התיאור, המיקום בתפריט או לקדם אותן דרך המלצרים.' : 'Low popularity, high profitability. Profitable dishes that don\'t sell enough. Try improving the description, placement, or promote via staff.'}</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-bold text-red-800 flex items-center gap-2"><Dog className="w-4 h-4"/> {language === 'he' ? 'כלב (Dog)' : 'Dog'}</h4>
                <p className="text-sm text-red-700 mt-1">{language === 'he' ? 'פופולריות נמוכה, רווחיות נמוכה. שקול להסיר מנות אלו מהתפריט או לשנות אותן לחלוטין.' : 'Low popularity, low profitability. Consider removing these dishes from the menu or completely revamping them.'}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}