import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../components/LanguageProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Loader, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function PriceChangesPage() {
    const { t, language } = useLanguage();
    const isRTL = language === 'he' || language === 'ar';
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const loadLogs = async () => {
        setLoading(true);
        try {
            const user = await base44.auth.me();
            if (!user) return;
            const data = await base44.entities.PriceChangeLog.list("-created_date", 200);
            setLogs(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const filteredLogs = logs.filter(log => 
        (log.item_name || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {language === 'he' ? 'היסטוריית שינויי מחיר' : 'Price Changes History'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {language === 'he' ? 'מעקב אחר שינויי עלויות ומחירי מכירה' : 'Track cost and sale price changes'}
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} />
                        <Input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={language === 'he' ? 'חיפוש פריט...' : 'Search item...'}
                            className={`${isRTL ? 'pr-9' : 'pl-9'} h-10`}
                        />
                    </div>
                    <Button onClick={loadLogs} variant="outline" size="icon" className="h-10 w-10 shrink-0">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3">{language === 'he' ? 'תאריך' : 'Date'}</th>
                                <th className="px-4 py-3">{language === 'he' ? 'סוג פריט' : 'Item Type'}</th>
                                <th className="px-4 py-3">{language === 'he' ? 'שם פריט' : 'Item Name'}</th>
                                <th className="px-4 py-3">{language === 'he' ? 'סוג שינוי' : 'Change Type'}</th>
                                <th className="px-4 py-3">{language === 'he' ? 'מחיר ישן' : 'Old Price'}</th>
                                <th className="px-4 py-3">{language === 'he' ? 'מחיר חדש' : 'New Price'}</th>
                                <th className="px-4 py-3">{language === 'he' ? 'שינוי %' : 'Change %'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-12 text-center">
                                        <Loader className="w-8 h-8 animate-spin mx-auto text-gray-500 mb-2" />
                                        <span>{t('loading')}</span>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                                        {language === 'he' ? 'לא נמצאו שינויי מחיר' : 'No price changes found'}
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log) => {
                                const diff = log.new_price - log.old_price;
                                const pct = log.old_price > 0 ? (diff / log.old_price) * 100 : 0;
                                const isUp = diff > 0;
                                return (
                                    <tr key={log.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {new Date(log.created_date).toLocaleString(language === 'he' ? 'he-IL' : 'en-US')}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {log.item_type === 'recipe' 
                                                ? <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">{language === 'he' ? 'מנת קופה' : 'POS Item'}</span>
                                                : <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{language === 'he' ? 'חומר גלם' : 'Raw Item'}</span>}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{log.item_name}</td>
                                        <td className="px-4 py-3">
                                            {log.change_type === 'sale_price' 
                                                ? <span className="text-gray-900">{language === 'he' ? 'מחיר מכירה' : 'Sale Price'}</span> 
                                                : <span className="text-gray-600">{language === 'he' ? 'עלות קנייה' : 'Cost'}</span>}
                                        </td>
                                        <td className="px-4 py-3">₪{Number(log.old_price).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-900">₪{Number(log.new_price).toFixed(2)}</td>
                                        <td className={`px-4 py-3 font-bold ${isUp ? 'text-red-600' : 'text-green-600'}`}>
                                            <div className="flex items-center gap-1">
                                                {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                {Math.abs(pct).toFixed(1)}%
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}