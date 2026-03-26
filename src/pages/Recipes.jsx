import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "../components/LanguageProvider";
import { Plus, Search, Edit, Trash2, ChefHat, Lock, Package, FileSpreadsheet, LayoutGrid, List, Wand2, FileText, Loader2 } from "lucide-react";
import RecipeForm from "../components/recipes/RecipeForm";
import ImportIngredientsModal from "../components/recipes/ImportIngredientsModal";
import RecipeListView from "../components/recipes/RecipeListView";
import MenuScanModal from "../components/recipes/MenuScanModal";
import MenuImageUploadModal from "../components/recipes/MenuImageUploadModal";

export default function RecipesPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("cards");
  
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  
  const [scanningMenu, setScanningMenu] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [missingRecipes, setMissingRecipes] = useState([]);

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
      const data = await base44.entities.Recipe.filter({}, "-created_date");
      setRecipes(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadRecipes();
    }
  }, [isAuthenticated]);

  const handleDelete = async (id) => {
    if (window.confirm(language === 'he' ? 'האם אתה בטוח שברצונך למחוק מתכון זה?' : 'Are you sure you want to delete this recipe?')) {
      await base44.entities.Recipe.delete(id);
      loadRecipes();
    }
  };

  const handleMenuUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setScanningMenu(true);
    try {
      // 1. Upload files
      const fileUrls = [];
      for (let i = 0; i < files.length; i++) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: files[i] });
        fileUrls.push(file_url);
      }
      
      // 2. Scan via backend
      const { data } = await base44.functions.invoke('scanMenuPdf', { fileUrls });
      
      if (data?.success) {
        if (data.totalFound === 0) {
          alert(language === 'he' ? 'לא הצלחנו לזהות מנות בתמונה. אנא נסה תמונה ברורה יותר.' : 'Could not detect any dishes in the image. Please try a clearer image.');
          setScanningMenu(false);
          return;
        }
        setMissingRecipes(data.missingRecipes || []);
        setShowImageUploadModal(false);
        setShowScanModal(true);
      } else {
        throw new Error(data?.error || 'Failed to scan menu');
      }
    } catch (err) {
      alert((language === 'he' ? 'שגיאה בסריקת התפריט: ' : 'Error scanning menu: ') + err.message);
    } finally {
      setScanningMenu(false);
    }
  };

  const handleGenerateSheet = () => {
    setShowImportModal(true);
  };

  const handleFindDuplicates = async () => {
    if (window.confirm(language === 'he' ? 'האם אתה בטוח שברצונך למחוק מתכונים כפולים? הפעולה אינה ניתנת לביטול.' : 'Are you sure you want to delete duplicate recipes? This cannot be undone.')) {
      setCleaning(true);
      try {
        const { data } = await base44.functions.invoke('findAndRemoveDuplicates', { type: 'recipes' });
        if (data?.success) {
          alert((language === 'he' ? 'נמחקו מתכונים כפולים: ' : 'Deleted duplicate recipes: ') + data.deletedCount);
          loadRecipes();
        } else {
          alert(data?.error || 'Error');
        }
      } catch (e) {
        alert(e.message || 'Error');
      }
      setCleaning(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-6 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {language === 'he' ? 'אזור מוגן' : 'Protected Area'}
            </h2>
            <p className="text-gray-500">
              {language === 'he' ? 'הזן קוד גישה כדי לצפות במתכונים' : 'Enter access code to view recipes'}
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

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#f3f2f1] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#d4a373] p-6 rounded-xl text-white shadow-md">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ChefHat className="w-8 h-8" />
              {language === 'he' ? 'ניהול מתכונים' : 'Recipe Management'}
            </h1>
            <p className="mt-1 opacity-90">
              {language === 'he' ? 'שלום, נהל את המתכונים והמחירים שלך' : 'Hello, manage your recipes and prices'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <div className="flex bg-white/20 rounded-full p-1 mr-2 rtl:ml-2 rtl:mr-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('cards')}
                className={`rounded-full h-8 w-8 ${viewMode === 'cards' ? 'bg-white text-[#d4a373]' : 'text-white hover:bg-white/20'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={`rounded-full h-8 w-8 ${viewMode === 'list' ? 'bg-white text-[#d4a373]' : 'text-white hover:bg-white/20'}`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            
            <Button 
              onClick={handleFindDuplicates}
              disabled={cleaning}
              className="bg-white/20 hover:bg-white/30 text-white border-none rounded-full px-4"
            >
              <Wand2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'נקה כפולים' : 'Clean Doubles'}
            </Button>
            
            <Button 
              onClick={() => setShowImageUploadModal(true)}
              disabled={scanningMenu}
              className="bg-white/20 hover:bg-white/30 text-white border-none rounded-full px-4"
            >
              {scanningMenu ? <Loader2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" /> : <FileText className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />}
              {language === 'he' ? 'סרוק תפריט (תמונות)' : 'Scan Menu (Images)'}
            </Button>

            <Button 
              onClick={handleGenerateSheet}
              className="bg-white text-[#d4a373] hover:bg-gray-50 border-none rounded-full px-6 font-bold"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'ייבא מרכיבים' : 'Import Ingredients'}
            </Button>
            <Button 
              onClick={() => { setEditingRecipe(null); setShowForm(true); }}
              className="bg-pink-500 hover:bg-pink-600 text-white border-none rounded-full px-6"
            >
              <Plus className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'מתכון חדש' : 'New Recipe'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} text-gray-400 w-5 h-5`} />
            <Input
              placeholder={language === 'he' ? 'חיפוש מתכונים...' : 'Search recipes...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`bg-white rounded-full ${isRTL ? 'pr-10' : 'pl-10'}`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-full border border-input bg-white px-4 py-2 text-sm focus-visible:outline-none"
          >
            <option value="all">{language === 'he' ? 'כל הסוגים' : 'All Types'}</option>
            <option value="sale_item">{language === 'he' ? 'פריט למכירה' : 'Sale Item'}</option>
            <option value="prep_recipe">{language === 'he' ? 'מתכון הכנה' : 'Prep Recipe'}</option>
          </select>
        </div>

        {viewMode === 'list' ? (
          <RecipeListView 
            recipes={filteredRecipes} 
            onEdit={(recipe) => { setEditingRecipe(recipe); setShowForm(true); }}
            onDelete={handleDelete}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map(recipe => (
              <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-[#fdfbf7] border-[#e5dfd3] rounded-2xl">
                <CardContent className="p-0">
                  <div className="p-5 border-b border-[#e5dfd3] flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-xl text-red-500 flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-orange-500" />
                        {recipe.name}
                      </h3>
                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full mt-2 font-medium">
                        {recipe.type === 'sale_item' 
                          ? (language === 'he' ? 'פריט למכירה' : 'Sale Item') 
                          : (language === 'he' ? 'מתכון הכנה' : 'Prep Recipe')}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingRecipe(recipe); setShowForm(true); }} className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(recipe.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-4 bg-white">
                    {recipe.type === 'sale_item' && (
                      <div className="bg-green-50 p-3 rounded-xl text-center border border-green-100">
                        <div className="text-xs text-gray-500 mb-1">{language === 'he' ? 'מחיר מכירה' : 'Sale Price'}</div>
                        <div className="font-bold text-green-600 text-xl">₪{Number(recipe.sale_price || 0).toFixed(2)}</div>
                        {recipe.sale_price > 0 && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            {language === 'he' ? 'אחוז עלות: ' : 'Cost %: '}
                            {((recipe.total_cost / recipe.sale_price) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    )}
                    <div className="bg-red-50 p-3 rounded-xl text-center border border-red-100">
                      <div className="text-xs text-gray-500 mb-1">{language === 'he' ? 'עלות כוללת' : 'Total Cost'}</div>
                      <div className="font-bold text-red-500 text-xl">₪{Number(recipe.total_cost || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-[#fdfbf7] flex justify-between items-center text-xs text-gray-500 font-medium">
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4 text-orange-400" />
                      {language === 'he' ? 'מרכיבים:' : 'Ingredients:'} {recipe.ingredients?.length || 0}
                    </div>
                    <div>
                      {language === 'he' ? 'נוצר ב:' : 'Created:'} {new Date(recipe.created_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showForm && (
          <RecipeForm
            recipe={editingRecipe}
            onSave={() => {
              setShowForm(false);
              loadRecipes();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        <ImportIngredientsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            // The import adds ingredients (Items), not Recipes directly.
            // But we can reload recipes if needed, or just show success.
          }}
        />

        <MenuScanModal 
          isOpen={showScanModal}
          onClose={() => setShowScanModal(false)}
          missingRecipes={missingRecipes}
        />

        <MenuImageUploadModal
          isOpen={showImageUploadModal}
          onClose={() => setShowImageUploadModal(false)}
          onUpload={handleMenuUpload}
          scanningMenu={scanningMenu}
        />
      </div>
    </div>
  );
}