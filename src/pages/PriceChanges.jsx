import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../components/LanguageProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Loader, TrendingUp, TrendingDown, RefreshCw, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PriceChangesPage() {
    const { t, language } = useLanguage();
    const isRTL = language === 'he' || language === 'ar';
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [selectedItem, setSelectedItem] = useState(null);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const user = await base44.auth.me();
            if (!user) return;
            
            let data = [];
            const isAdminControlling = !!(user?.admin_original_email && user?.acting_as_user_email);
            const targetEmail = user?.acting_as_store_email || user?.acting_as_user_email || user?.email;

            if (isAdminControlling) {
                try {
                    const res = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: targetEmail });
                    if (res.data?.success) {
                        data = res.data.data.priceChanges || [];
                    }
                } catch(e) {}
            } else {
                data = await base44.entities.PriceChangeLog.filter({ created_by: targetEmail }, "-created_date", 1000);
            }
            
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

    const filteredLogs = logs.filter(log => {
        const matchesSearch = (log.item_name || "").toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "all" || log.item_type === typeFilter;
        return matchesSearch && matchesType;
    });

    const chartData = [...filteredLogs].slice(0, 30).reverse().map(log => {
        const diff = log.new_price - log.old_price;
        const pct = log.old_price > 0 ? (diff / log.old_price) * 100 : 0;
        const targetDate = log.effective_date || log.created_date;
        return {
            name: log.item_name,
            date: new Date(targetDate).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            pctChange: Number(pct.toFixed(2)),
            isUp: diff > 0,
            oldPrice: log.old_price,
            newPrice: log.new_price
        };
    });

    const handleItemClick = (itemName) => {
        setSelectedItem(itemName);
    };

    const getSelectedItemHistory = () => {
        if (!selectedItem) return [];
        const itemLogs = logs.filter(l => l.item_name === selectedItem);
        const sorted = [...itemLogs].sort((a, b) => new Date(a.effective_date || a.created_date) - new Date(b.effective_date || b.created_date));
        
        const history = [];
        if (sorted.length > 0) {
            history.push({
                date: new Date(sorted[0].effective_date || sorted[0].created_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                price: sorted[0].old_price,
                label: language === 'he' ? 'מחיר התחלתי' : 'Initial'
            });
            sorted.forEach((l, idx) => {
                history.push({
                    date: new Date(l.effective_date || l.created_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                    price: l.new_price,
                    label: `${language === 'he' ? 'עדכון' : 'Update'} ${idx + 1}`
                });
            });
        }
        return history;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
                    <p className="font-bold text-gray-900">{data.name}</p>
                    <p className="text-sm text-gray-500">{data.date}</p>
                    <div className="mt-2 space-y-1 text-sm">
                        <p>{language === 'he' ? 'מחיר ישן:' : 'Old Price:'} ₪{Number(data.oldPrice).toFixed(2)}</p>
                        <p>{language === 'he' ? 'מחיר חדש:' : 'New Price:'} ₪{Number(data.newPrice).toFixed(2)}</p>
                        <p className={`font-bold ${data.isUp ? 'text-red-600' : 'text-green-600'}`}>
                            {language === 'he' ? 'שינוי:' : 'Change:'} {data.pctChange > 0 ? '+' : ''}{data.pctChange}%
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#f3f2f1] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black p-6 rounded-xl text-white shadow-md">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <TrendingUp className="w-8 h-8" />
                            {language === 'he' ? 'היסטוריית שינויי מחיר' : 'Price Changes History'}
                        </h1>
                        <p className="mt-1 opacity-90">
                            {language === 'he' ? 'מעקב אחר שינויי עלויות ומחירי מכירה' : 'Track cost and sale price changes'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        <Button onClick={loadLogs} className="bg-white/20 hover:bg-white/30 text-white border-none rounded-full px-4">
                            <RefreshCw className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {language === 'he' ? 'רענן' : 'Refresh'}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} text-gray-400 w-5 h-5`} />
                        <Input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={language === 'he' ? 'חיפוש פריט...' : 'Search item...'}
                            className={`bg-white rounded-full ${isRTL ? 'pr-10' : 'pl-10'} h-11 border-none shadow-sm`}
                        />
                    </div>
                    <select 
                        value={typeFilter} 
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-11 rounded-full border-none shadow-sm bg-white px-4 py-2 text-sm focus-visible:outline-none min-w-[200px]"
                    >
                        <option value="all">{language === 'he' ? 'הכל' : 'All'}</option>
                        <option value="item">{language === 'he' ? 'חומרי גלם (עלות)' : 'Raw Items (Cost)'}</option>
                        <option value="recipe">{language === 'he' ? 'מנות קופה (מכירה)' : 'POS Items (Sale)'}</option>
                    </select>
                </div>

                {/* Chart Section */}
                <Card className="shadow-sm border-0 rounded-xl overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                        {language === 'he' ? 'מגמות שינוי מחירים (%)' : 'Price Change Trends (%)'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : chartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                {language === 'he' ? 'אין נתונים להצגה בגרף' : 'No data for chart'}
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 12, fill: '#6b7280' }} 
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 12, fill: '#6b7280' }} 
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val}%`}
                                    />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                    <ReferenceLine y={0} stroke="#9ca3af" />
                                    <Bar 
                                        dataKey="pctChange" 
                                        radius={[4, 4, 0, 0]}
                                        onClick={(data) => {
                                            if (data && data.name) handleItemClick(data.name);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.isUp ? '#ef4444' : '#22c55e'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-0 rounded-xl overflow-hidden">
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
                                    <tr 
                                        key={log.id} 
                                        className="bg-white border-b hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => handleItemClick(log.item_name)}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {new Date(log.effective_date || log.created_date).toLocaleString(language === 'he' ? 'he-IL' : 'en-US')}
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
            {/* Single Item History Modal */}
            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{selectedItem} - {language === 'he' ? 'היסטוריית מחירים' : 'Price History'}</DialogTitle>
                    </DialogHeader>
                    <div className="h-[300px] w-full mt-4">
                        {selectedItem && (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={getSelectedItemHistory()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fontSize: 12, fill: '#6b7280' }} 
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 12, fill: '#6b7280' }} 
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `₪${val}`}
                                        domain={['auto', 'auto']}
                                    />
                                    <RechartsTooltip 
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
                                                        <p className="font-bold text-gray-900">{data.date}</p>
                                                        <p className="text-sm text-gray-500">{data.label}</p>
                                                        <p className="font-bold text-blue-600 mt-1">₪{Number(data.price).toFixed(2)}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="price" 
                                        stroke="#3b82f6" 
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            </div>
        </div>
    );
}