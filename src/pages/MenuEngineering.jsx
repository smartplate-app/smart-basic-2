import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "../components/LanguageProvider";
import { Lock, Calculator, Star, Tractor, Puzzle, Dog } from "lucide-react";

export default function MenuEngineeringPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quantities, setQuantities] = useState({});

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
              {language === 'he' ? 'הזן קוד גישה כדי לצפות במחשבון הנדסת תפריט' : 'Enter access code to view Menu Engineering Calculator'}
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
  let totalProfit = 0;
  let validItemsCount = 0;

  const itemsData = recipes.map(recipe => {
    const qty = quantities[recipe.id] || 0;
    const salePrice = Number(recipe.sale_price) || 0;
    const cost = Number(recipe.total_cost) || 0;
    const itemProfit = salePrice - cost;
    const totalItemProfit = itemProfit * qty;

    if (qty > 0) {
      totalVolume += qty;
      totalProfit += totalItemProfit;
      validItemsCount++;
    }

    return {
      ...recipe,
      qty,
      itemProfit,
      totalItemProfit
    };
  });

  const avgVolume = validItemsCount > 0 ? totalVolume / validItemsCount : 0;
  const avgProfit = totalVolume > 0 ? totalProfit / totalVolume : 0;

  const categorizedItems = itemsData.map(item => {
    let category = "";
    let icon = null;
    let color = "";

    if (item.qty === 0) {
      category = language === 'he' ? 'אין מכירות' : 'No Sales';
      color = "text-gray-400";
    } else if (item.qty >= avgVolume && item.itemProfit >= avgProfit) {
      category = language === 'he' ? 'כוכב (Star)' : 'Star';
      icon = <Star className="w-4 h-4" />;
      color = "text-yellow-500 bg-yellow-50 border-yellow-200";
    } else if (item.qty >= avgVolume && item.itemProfit < avgProfit) {
      category = language === 'he' ? 'סוס עבודה (Plowhorse)' : 'Plowhorse';
      icon = <Tractor className="w-4 h-4" />;
      color = "text-blue-500 bg-blue-50 border-blue-200";
    } else if (item.qty < avgVolume && item.itemProfit >= avgProfit) {
      category = language === 'he' ? 'חידה (Puzzle)' : 'Puzzle';
      icon = <Puzzle className="w-4 h-4" />;
      color = "text-purple-500 bg-purple-50 border-purple-200";
    } else {
      category = language === 'he' ? 'כלב (Dog)' : 'Dog';
      icon = <Dog className="w-4 h-4" />;
      color = "text-red-500 bg-red-50 border-red-200";
    }

    return { ...item, category, icon, color };
  });

  return (
    <div className="min-h-screen bg-[#f3f2f1] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-blue-600 p-6 rounded-xl text-white shadow-md">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Calculator className="w-8 h-8" />
              {language === 'he' ? 'מחשבון הנדסת תפריט' : 'Menu Engineering Calculator'}
            </h1>
            <p className="mt-1 opacity-90">
              {language === 'he' ? 'הזן כמויות שנמכרו כדי לנתח את ביצועי המנות שלך' : 'Enter quantities sold to analyze your menu performance'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'מנה' : 'Item'}</th>
                    <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'מחיר' : 'Price'}</th>
                    <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'עלות' : 'Cost'}</th>
                    <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'רווח למנה' : 'Item Profit'}</th>
                    <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'} w-32`}>{language === 'he' ? 'כמות שנמכרה' : 'Qty Sold'}</th>
                    <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'קטגוריה' : 'Category'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categorizedItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">₪{Number(item.sale_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-red-600">₪{Number(item.total_cost || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">₪{item.itemProfit.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={item.qty || ''}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          className="h-8 text-center"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {item.qty > 0 ? (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${item.color}`}>
                            {item.icon}
                            {item.category}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">{item.category}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {categorizedItems.length === 0 && !loading && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        {language === 'he' ? 'לא נמצאו מנות למכירה' : 'No sale items found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{language === 'he' ? 'סיכום נתונים' : 'Summary'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">{language === 'he' ? 'ממוצע כמות למנה' : 'Avg Qty per Item'}</div>
                  <div className="text-2xl font-bold">{avgVolume.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{language === 'he' ? 'ממוצע רווח למנה' : 'Avg Profit per Item'}</div>
                  <div className="text-2xl font-bold text-green-600">₪{avgProfit.toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{language === 'he' ? 'מקרא' : 'Legend'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 p-1 bg-yellow-50 text-yellow-500 rounded"><Star className="w-4 h-4" /></div>
                  <div>
                    <div className="font-bold">{language === 'he' ? 'כוכב (Star)' : 'Star'}</div>
                    <div className="text-gray-500 text-xs">{language === 'he' ? 'פופולרי ורווחי - קדם אותם!' : 'Popular & Profitable - Promote!'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 p-1 bg-blue-50 text-blue-500 rounded"><Tractor className="w-4 h-4" /></div>
                  <div>
                    <div className="font-bold">{language === 'he' ? 'סוס עבודה (Plowhorse)' : 'Plowhorse'}</div>
                    <div className="text-gray-500 text-xs">{language === 'he' ? 'פופולרי אך פחות רווחי - שפר רווחיות.' : 'Popular but less profitable - Improve margin.'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 p-1 bg-purple-50 text-purple-500 rounded"><Puzzle className="w-4 h-4" /></div>
                  <div>
                    <div className="font-bold">{language === 'he' ? 'חידה (Puzzle)' : 'Puzzle'}</div>
                    <div className="text-gray-500 text-xs">{language === 'he' ? 'רווחי אך פחות פופולרי - בדוק למה.' : 'Profitable but less popular - Investigate why.'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 p-1 bg-red-50 text-red-500 rounded"><Dog className="w-4 h-4" /></div>
                  <div>
                    <div className="font-bold">{language === 'he' ? 'כלב (Dog)' : 'Dog'}</div>
                    <div className="text-gray-500 text-xs">{language === 'he' ? 'לא פופולרי ולא רווחי - שקול להסיר.' : 'Unpopular & Unprofitable - Consider removing.'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}