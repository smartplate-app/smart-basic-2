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
  
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState('prep_recipe');
  
  const [scanningMenu, setScanningMenu] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [missingRecipes, setMissingRecipes] = useState([]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      let currentUser;
      try { currentUser = await base44.auth.me(); } catch(e){}
      
      if (!currentUser) {
        const data = await base44.entities.Recipe.filter({}, "-created_date", 10000);
        setRecipes(data || []);
        setCache('recipes_v1', { recipes: data || [] });
        setLoading(false);
        return;
      }

      let targetEmail = currentUser.acting_as_store_email || currentUser.acting_as_user_email || currentUser.store_user_owner_email || currentUser.email;
      
      // If user is not impersonating, check if they are a StoreUser for someone else
      if (!currentUser.acting_as_store_email && !currentUser.acting_as_user_email && !currentUser.store_user_owner_email) {
        try {
          const recs = await base44.entities.StoreUser.filter({ user_email: currentUser.email, is_active: true });
          if (recs.length > 0) targetEmail = recs[0].owner_email;
        } catch(e){}
      }

      const isAdminControlling = currentUser?.role === 'admin' && targetEmail !== currentUser.email;

      let data = [];
      if (isAdminControlling) {
        const { data: adminData } = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: targetEmail });
        if (adminData?.success && adminData?.data?.recipes) {
          data = adminData.data.recipes;
        }
      } else {
        let data1 = await base44.entities.Recipe.filter({ created_by: targetEmail }, "-created_date", 10000);
        let data2 = await base44.entities.Recipe.filter({ store_owner_email: targetEmail }, "-created_date", 10000);
        data = [...data1, ...data2];
        
        if (targetEmail !== currentUser.email) {
          const myData1 = await base44.entities.Recipe.filter({ created_by: currentUser.email }, "-created_date", 10000);
          const myData2 = await base44.entities.Recipe.filter({ store_owner_email: currentUser.email }, "-created_date", 10000);
          const myData = [...myData1, ...myData2];
          data = [...data, ...myData].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
        }

        if (currentUser.chain_id && !currentUser.is_chain_head) {
          try {
            const chain = await base44.entities.Chain.filter({ id: currentUser.chain_id });
            if (chain.length > 0) {
              const headEmail = chain[0].head_store_user_email;
              const headData1 = await base44.entities.Recipe.filter({ created_by: headEmail }, "-created_date", 10000);
              const headData2 = await base44.entities.Recipe.filter({ store_owner_email: headEmail }, "-created_date", 10000);
              const headData = [...headData1, ...headData2];
              data = [...headData, ...data].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
            }
          } catch(e){}
        }
      }

      setRecipes(data || []);
      setCache('recipes_v1', { recipes: data || [] });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    const c = getCache('recipes_v1');
    if (c?.data) {
      setRecipes(c.data.recipes || []);
    }
    loadRecipes();
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
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#f3f2f1] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black p-6 rounded-xl text-white shadow-md">
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
              onClick={() => { setImportType('prep_recipe'); setShowImportModal(true); }}
              className="bg-white text-black hover:bg-gray-200 border-none rounded-full px-6 font-bold"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'ייבוא הכנות' : 'Import Preps'}
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

        <RecipeListView 
          recipes={filteredRecipes} 
          onEdit={(recipe) => { setEditingRecipe(recipe); setShowForm(true); }}
          onDelete={handleDelete}
        />

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