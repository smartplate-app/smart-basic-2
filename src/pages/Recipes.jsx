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
import CleanDuplicateRecipesModal from "../components/recipes/CleanDuplicateRecipesModal";
import { getCache, setCache, isStale } from "../components/utils/cache";

export default function RecipesPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState('prep_recipe');
  
  const [scanningMenu, setScanningMenu] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [missingRecipes, setMissingRecipes] = useState([]);

  const loadRecipes = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      let currentUser;
      try { currentUser = await base44.auth.me(); } catch(e){}
      
      if (!currentUser) {
        const data = await base44.entities.Recipe.filter({}, "-created_date", 10000);
        setRecipes(data || []);
        setCache('recipes_v3', { recipes: data || [] });
        setLoading(false);
        return;
      }

      const ownerEmail = currentUser.acting_as_store_email || currentUser.store_user_owner_email || null;
      const isManager = !!ownerEmail && currentUser.role !== 'admin';
      const isAdminControlling = currentUser?.role === 'admin' && (currentUser.acting_as_user_email || currentUser.acting_as_store_email);
      const targetEmail = currentUser.acting_as_store_email || currentUser.acting_as_user_email || currentUser.store_user_owner_email || currentUser.email;

      let data = [];
      if (isManager) {
        // Manager: use service-role function to bypass RLS
        const { data: mgData } = await base44.functions.invoke('getManagerData', { ownerEmail, entities: ['recipes'] });
        data = mgData?.data?.recipes || [];
      } else {
        let data1 = await base44.entities.Recipe.filter({ created_by: targetEmail }, "-created_date", 10000);
        let data2 = await base44.entities.Recipe.filter({ store_owner_email: targetEmail }, "-created_date", 10000);
        data = [...data1, ...data2];

        if (currentUser.chain_id && !currentUser.is_chain_head) {
          try {
            const chain = await base44.entities.Chain.filter({ id: currentUser.chain_id });
            if (chain.length > 0) {
              const headEmail = chain[0].head_store_user_email;
              const headData1 = await base44.entities.Recipe.filter({ created_by: headEmail }, "-created_date", 10000);
              const headData2 = await base44.entities.Recipe.filter({ store_owner_email: headEmail }, "-created_date", 10000);
              data = [...headData1, ...headData2, ...data].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
            }
          } catch(e){}
        }
      }

      // Deduplicate to prevent UI issues if the same entity was fetched multiple times
      if (data) {
        data = data.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      }
      
      // Reverted admin filter

      setRecipes(data || []);
      setCache('recipes_v3', { recipes: data || [] });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Force cache bust to v3 to clear any stale recipe data
    const c = getCache('recipes_v3');
    if (c?.data) {
      setRecipes(c.data.recipes || []);
    }
    const load = async () => {
      let currentUser;
      try { currentUser = await base44.auth.me(); } catch(e){}
      const stale = isStale(c, 180000);
      const isImpersonating = currentUser?.acting_as_user_email || currentUser?.acting_as_store_email || currentUser?.store_user_owner_email;
      if (stale || isImpersonating) {
        loadRecipes(!!c?.data);
      }
    };
    load();
  }, []);

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
        loadRecipes(); // Reload the list to show the newly added POS items
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

  const [showCleanModal, setShowCleanModal] = useState(false);
  const [exportingSheet, setExportingSheet] = useState(false);

  const handleExportPrepInventory = async () => {
    try {
      setExportingSheet(true);
      // If type is not 'sale_item', we treat it as a prep recipe, matching the UI display logic
      const preps = recipes.filter(r => r.type !== 'sale_item');
      if (preps.length === 0) {
        alert(language === 'he' ? 'אין פריט הכנה לייצוא' : 'No פריט הכנה to export');
        return;
      }
      
      const { data } = await base44.functions.invoke('exportPrepInventoryToSheets', {
        itemsData: preps
      });
      
      if (data?.success && data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error(data?.error || 'Failed to export');
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('not connected') || err.message.toLowerCase().includes('not authorized')) {
         alert(language === 'he' ? 'אנא חבר את Google Sheets בהגדרות/משרד אחורי' : 'Please connect Google Sheets in Settings/Back Office');
      } else {
         alert((language === 'he' ? 'שגיאה בייצוא: ' : 'Export error: ') + err.message);
      }
    } finally {
      setExportingSheet(false);
    }
  };

  const handleFindDuplicates = () => {
    setShowCleanModal(true);
  };

  const handleCleanDuplicates = async (idsToDelete, mappingToKeep) => {
    try {
      const { data } = await base44.functions.invoke('replaceAndDeleteRecipes', { 
        idsToDelete, 
        mappingToKeep 
      });
      if (data?.success) {
        loadRecipes();
      } else {
        throw new Error(data?.error || 'Unknown error during cleanup');
      }
    } catch (e) {
      throw e; // rethrow to be caught by the modal
    }
  };

  const filteredRecipes = recipes.filter(r => {
    const searchStr = String(searchTerm || '').toLowerCase();
    const nameStr = String(r.name || '').toLowerCase();
    const matchesSearch = !searchStr || nameStr.includes(searchStr);
    
    let matchesType = false;
    if (typeFilter === 'all') matchesType = true;
    else if (typeFilter === 'last_scan') matchesType = r.is_from_last_scan === true;
    else if (typeFilter === 'prep_recipe') matchesType = r.type !== 'sale_item';
    else matchesType = r.type === typeFilter;
    
    let matchesCat = false;
    if (categoryFilter === 'all') matchesCat = true;
    else matchesCat = r.menu_category === categoryFilter;

    return matchesSearch && matchesType && matchesCat;
  });

  const handleToggleSelectAll = (checked) => {
    if (checked) {
      const filteredIds = filteredRecipes.map(r => r.id);
      setSelectedRecipes(prev => Array.from(new Set([...prev, ...filteredIds])));
    } else {
      const filteredIds = new Set(filteredRecipes.map(r => r.id));
      setSelectedRecipes(prev => prev.filter(id => !filteredIds.has(id)));
    }
  };

  const handleToggleSelect = (id, checked) => {
    setSelectedRecipes(prev => 
      checked ? [...prev, id] : prev.filter(x => x !== id)
    );
  };

  const handleBulkTag = async (e) => {
    const newTag = e.target.value;
    if (!newTag || selectedRecipes.length === 0) return;
    try {
      setLoading(true);
      const updates = selectedRecipes.map(id => ({ id, menu_category: newTag }));
      await base44.entities.Recipe.bulkUpdate(updates);
      await loadRecipes();
      setSelectedRecipes([]);
    } catch (err) {
      alert("Error tagging recipes: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f2f1] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black p-6 rounded-xl text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full blur-2xl opacity-20 -ml-10 -mb-10 pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ChefHat className="w-8 h-8" />
              {language === 'he' ? 'ניהול מתכונים' : 'Recipe Management'}
            </h1>
            <p className="mt-1 opacity-90">
              {language === 'he' ? 'שלום, נהל את המתכונים והמחירים שלך' : 'Hello, manage your recipes and prices'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end relative z-10">

            
            <Button 
              onClick={handleFindDuplicates}
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
              {language === 'he' ? 'סרוק תפריט (תמונות או PDF)' : 'Scan Menu (Images or PDF)'}
            </Button>

            <Button 
              onClick={handleExportPrepInventory}
              disabled={exportingSheet}
              className="bg-white text-black hover:bg-gray-200 border-none rounded-full px-6 font-bold"
            >
              {exportingSheet ? <Loader2 className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" /> : <FileSpreadsheet className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />}
              {language === 'he' ? 'ייצוא פריט הכנה לספירה' : 'Export פריט הכנה for Count'}
            </Button>
            <Button 
              onClick={() => { setImportType('prep_recipe'); setShowImportModal(true); }}
              className="bg-white text-black hover:bg-gray-200 border-none rounded-full px-6 font-bold"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'ייבוא פריט הכנה' : 'Import פריט הכנה'}
            </Button>
            <Button 
              onClick={() => { setImportType('sale_item'); setShowImportModal(true); }}
              className="bg-white text-black hover:bg-gray-200 border-none rounded-full px-6 font-bold"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'ייבוא מנות' : 'Import Dishes'}
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

        {/* Calculate Overall Theoretical SFC */}
        {(() => {
          let totalSFC = 0;
          let sfcItemsCount = 0;
          filteredRecipes.forEach(recipe => {
            if (recipe.type === 'sale_item' && recipe.sale_price > 0 && recipe.total_cost > 0) {
               const salePriceExVat = Number(recipe.sale_price) / 1.18;
               const sfc = (Number(recipe.total_cost) / salePriceExVat) * 100;
               if (sfc > 0 && sfc < 200) { // filter out extreme anomalies
                 totalSFC += sfc;
                 sfcItemsCount++;
               }
            }
          });
          const avgSFC = sfcItemsCount > 0 ? (totalSFC / sfcItemsCount).toFixed(1) : 0;

          return (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 flex items-center">
                <Search className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} text-gray-400 w-5 h-5`} />
                <Input
                  placeholder={language === 'he' ? 'חיפוש מתכונים...' : 'Search recipes...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`bg-white rounded-full ${isRTL ? 'pr-10' : 'pl-10'}`}
                />
                {sfcItemsCount > 0 && (
                  <div className={`absolute top-2 ${isRTL ? 'left-4' : 'right-4'} flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-white rounded-full text-xs font-bold border border-gray-700 pointer-events-none shadow-sm`}>
                    <span className="opacity-70 font-medium">S.F.C%:</span>
                    <span>{avgSFC}%</span>
                  </div>
                )}
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 rounded-full border border-input bg-white px-4 py-2 text-sm focus-visible:outline-none"
              >
                <option value="all">{language === 'he' ? 'כל הסוגים' : 'All Types'}</option>
                <option value="sale_item">{language === 'he' ? 'פריט למכירה' : 'Sale Item'}</option>
                <option value="prep_recipe">{language === 'he' ? 'פריט הכנה' : 'פריט הכנה'}</option>
                <option value="last_scan">{language === 'he' ? 'סריקת תפריט אחרונה' : 'Last Menu Scan'}</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 rounded-full border border-input bg-white px-4 py-2 text-sm focus-visible:outline-none"
              >
                <option value="all">{language === 'he' ? 'כל המחלקות' : 'All Departments'}</option>
                <option value="general">{language === 'he' ? 'כללי' : 'General'}</option>
                <option value="kitchen">{language === 'he' ? 'מטבח' : 'Kitchen'}</option>
                <option value="bar">{language === 'he' ? 'בר' : 'Bar'}</option>
                <option value="wine">{language === 'he' ? 'יין' : 'Wine'}</option>
                <option value="dessert">{language === 'he' ? 'קינוחים' : 'Dessert'}</option>
              </select>
              
              {selectedRecipes.length > 0 && (
                <div className="flex items-center gap-2 bg-blue-50 px-4 rounded-full border border-blue-100">
                  <span className="text-sm font-medium text-blue-800 whitespace-nowrap">
                    {selectedRecipes.length} {language === 'he' ? 'נבחרו' : 'selected'}
                  </span>
                  <select
                    onChange={handleBulkTag}
                    value=""
                    className="h-8 rounded border-none bg-transparent text-sm text-blue-800 font-bold focus-visible:outline-none cursor-pointer"
                  >
                    <option value="" disabled>{language === 'he' ? 'סמן כ...' : 'Tag as...'}</option>
                    <option value="general">{language === 'he' ? 'כללי' : 'General'}</option>
                    <option value="kitchen">{language === 'he' ? 'מטבח' : 'Kitchen'}</option>
                    <option value="bar">{language === 'he' ? 'בר' : 'Bar'}</option>
                    <option value="wine">{language === 'he' ? 'יין' : 'Wine'}</option>
                    <option value="dessert">{language === 'he' ? 'קינוחים' : 'Dessert'}</option>
                  </select>
                </div>
              )}
            </div>
          );
        })()}

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <img 
              src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/0c6fcae55_smartplate_logo_insta_320x320px.png" 
              alt="Loading" 
              className="w-20 h-20 animate-spin rounded-xl shadow-md"
              style={{ animationDuration: '2s' }}
            />
            <p className="text-gray-600 font-medium text-lg">{language === 'he' ? 'טוען נתונים...' : 'Loading...'}</p>
          </div>
        ) : (
          <RecipeListView 
            recipes={filteredRecipes} 
            onEdit={(recipe) => { setEditingRecipe(recipe); setShowForm(true); }}
            onDelete={handleDelete}
            selectedRecipes={selectedRecipes}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
          />
        )}

        {showForm && (
          <RecipeForm
            recipe={editingRecipe}
            onSave={(savedRecipe) => {
              setShowForm(false);
              if (savedRecipe) {
                setRecipes(prev => {
                  const exists = prev.find(r => r.id === savedRecipe.id);
                  if (exists) return prev.map(r => r.id === savedRecipe.id ? { ...r, ...savedRecipe } : r);
                  return [savedRecipe, ...prev];
                });
              }
              // Wait for DB replicas to catch up before fetching fresh data
              setTimeout(() => {
                loadRecipes();
              }, 1500);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        <ImportIngredientsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            loadRecipes();
          }}
          importType={importType}
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

        <CleanDuplicateRecipesModal
          isOpen={showCleanModal}
          onClose={() => setShowCleanModal(false)}
          recipes={recipes}
          onDelete={handleCleanDuplicates}
        />
      </div>
    </div>
  );
}