
import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader, Printer, AlertTriangle, ShoppingCart, Package, Scale } from 'lucide-react';
import { format } from 'date-fns';
import { he, enUS, de, ru } from 'date-fns/locale';
import { useLanguage } from '@/components/LanguageProvider';

const locales = { he, en: enUS, de, ru };

export default function ReportsPage() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [aggregatedData, setAggregatedData] = useState(null);
    const [comparisonData, setComparisonData] = useState(null);
    const [activeTab, setActiveTab] = useState('by-orders');
    const { t, language } = useLanguage();
    
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(String(currentYear));
    const [month, setMonth] = useState(String(new Date().getMonth()));

    const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: String(i),
        label: format(new Date(currentYear, i), 'MMMM', { locale: locales[language] || enUS })
    }));

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
            } catch (e) {
                console.error("Auth error:", e);
            } finally {
                setAuthLoading(false);
            }
        };
        checkAuth();
    }, []);

    const generateReport = async () => {
        if (!user) return;
        setLoading(true);
        setReportData(null);
        setAggregatedData(null);
        setComparisonData(null);
        try {
            const allOrders = await base44.entities.Order.filter({ created_by: user.email });
            const allReceipts = await base44.entities.SupplyReceipt.filter({ created_by: user.email });
            
            const selectedMonth = parseInt(month, 10);
            const selectedYear = parseInt(year, 10);

            const filteredOrders = allOrders.filter(order => {
                const orderDate = new Date(order.created_date);
                return orderDate.getFullYear() === selectedYear && orderDate.getMonth() === selectedMonth;
            });

            const filteredReceipts = allReceipts.filter(receipt => {
                const receiptDate = new Date(receipt.received_date);
                return receiptDate.getFullYear() === selectedYear && receiptDate.getMonth() === selectedMonth;
            });

            // Data for "By Orders" tab (existing)
            const itemsMap = new Map();
            filteredOrders.forEach(order => {
                order.items.forEach(item => {
                    if (itemsMap.has(item.item_name)) {
                        const existing = itemsMap.get(item.item_name);
                        existing.quantity += item.quantity;
                        existing.total_cost += item.total || 0;
                    } else {
                        itemsMap.set(item.item_name, {
                            name: item.item_name,
                            quantity: item.quantity,
                            unit: item.unit,
                            total_cost: item.total || 0
                        });
                    }
                });
            });

            const aggregatedItems = Array.from(itemsMap.values()).sort((a, b) => b.quantity - a.quantity);
            const totalOrdersCost = filteredOrders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
            
            setReportData({
                totalOrders: filteredOrders.length,
                totalItems: aggregatedItems.reduce((sum, item) => sum + item.quantity, 0),
                totalCost: totalOrdersCost,
                items: aggregatedItems,
            });

            // Data for "All Items Aggregated" tab
            const allItemsMap = new Map();
            filteredOrders.forEach(order => {
                order.items.forEach(item => {
                    const key = item.item_name;
                    if (allItemsMap.has(key)) {
                        const existing = allItemsMap.get(key);
                        existing.quantity += item.quantity;
                        existing.total_cost += item.total || 0;
                        existing.order_count += 1;
                    } else {
                        allItemsMap.set(key, {
                            name: item.item_name,
                            quantity: item.quantity,
                            unit: item.unit,
                            total_cost: item.total || 0,
                            order_count: 1
                        });
                    }
                });
            });

            const allAggregatedItems = Array.from(allItemsMap.values()).sort((a, b) => b.quantity - a.quantity);
            
            setAggregatedData({
                totalItems: allAggregatedItems.reduce((sum, item) => sum + item.quantity, 0),
                totalCost: allAggregatedItems.reduce((sum, item) => sum + item.total_cost, 0),
                items: allAggregatedItems,
                uniqueItemsCount: allAggregatedItems.length
            });

            // NEW: Data for "Order vs Receipt Comparison" tab
            const orderedItemsMap = new Map();
            const receivedItemsMap = new Map();

            // Calculate total ordered
            filteredOrders.forEach(order => {
                order.items.forEach(item => {
                    if (orderedItemsMap.has(item.item_name)) {
                        const existing = orderedItemsMap.get(item.item_name);
                        existing.quantity += item.quantity;
                        existing.cost += item.total || 0;
                    } else {
                        orderedItemsMap.set(item.item_name, {
                            name: item.item_name,
                            quantity: item.quantity,
                            unit: item.unit,
                            cost: item.total || 0
                        });
                    }
                });
            });

            // Calculate total received
            filteredReceipts.forEach(receipt => {
                receipt.verified_items?.forEach(item => {
                    if (receivedItemsMap.has(item.item_name)) {
                        const existing = receivedItemsMap.get(item.item_name);
                        existing.quantity += item.received_quantity || 0;
                        const itemCost = (item.actual_price || 0) * (item.received_quantity || 0) * (1 - (item.actual_discount || 0) / 100);
                        existing.cost += itemCost;
                    } else {
                        const itemCost = (item.actual_price || 0) * (item.received_quantity || 0) * (1 - (item.actual_discount || 0) / 100);
                        receivedItemsMap.set(item.item_name, {
                            name: item.item_name,
                            quantity: item.received_quantity || 0,
                            unit: item.unit,
                            cost: itemCost
                        });
                    }
                });
            });

            // Create comparison data
            const comparisonItems = [];
            const allItemNames = new Set([...orderedItemsMap.keys(), ...receivedItemsMap.keys()]);

            allItemNames.forEach(itemName => {
                const ordered = orderedItemsMap.get(itemName) || { quantity: 0, cost: 0, unit: '-' };
                const received = receivedItemsMap.get(itemName) || { quantity: 0, cost: 0, unit: '-' };
                
                const quantityDiff = received.quantity - ordered.quantity;
                const costDiff = received.cost - ordered.cost;
                const quantityDiffPercent = ordered.quantity > 0 ? ((quantityDiff / ordered.quantity) * 100) : 0;
                
                comparisonItems.push({
                    name: itemName,
                    ordered_quantity: ordered.quantity,
                    received_quantity: received.quantity,
                    quantity_diff: quantityDiff,
                    quantity_diff_percent: quantityDiffPercent,
                    ordered_cost: ordered.cost,
                    received_cost: received.cost,
                    cost_diff: costDiff,
                    unit: ordered.unit || received.unit || '-',
                    has_discrepancy: Math.abs(quantityDiff) > 0.01 || Math.abs(costDiff) > 0.01
                });
            });

            comparisonItems.sort((a, b) => Math.abs(b.quantity_diff) - Math.abs(a.quantity_diff));

            const totalOrderedCost = Array.from(orderedItemsMap.values()).reduce((sum, item) => sum + item.cost, 0);
            const totalReceivedCost = Array.from(receivedItemsMap.values()).reduce((sum, item) => sum + item.cost, 0);
            const totalOrderedQuantity = Array.from(orderedItemsMap.values()).reduce((sum, item) => sum + item.quantity, 0);
            const totalReceivedQuantity = Array.from(receivedItemsMap.values()).reduce((sum, item) => sum + item.quantity, 0);

            setComparisonData({
                items: comparisonItems,
                totalOrderedCost,
                totalReceivedCost,
                totalOrderedQuantity,
                totalReceivedQuantity,
                costDifference: totalReceivedCost - totalOrderedCost,
                quantityDifference: totalReceivedQuantity - totalOrderedQuantity,
                totalOrders: filteredOrders.length,
                totalReceipts: filteredReceipts.length,
                itemsWithDiscrepancies: comparisonItems.filter(i => i.has_discrepancy).length
            });

        } catch (error) {
            console.error("Error generating report:", error);
        } finally {
            setLoading(false);
        }
    };
    
    const handlePrint = () => {
        window.print();
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        right: 0;
                    }
                    .no-print {
                        display: none;
                    }
                }
            `}</style>
            
            <div className="max-w-6xl mx-auto">
                <Card className="no-print">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-6 h-6" />
                            {language === 'he' ? 'דוח הזמנות ספקים' : 'Supplier Orders Report'}
                        </CardTitle>
                        <CardDescription>
                            {language === 'he' 
                                ? 'צפה בסיכום מפורט של כל ההזמנות לספקים לפי חודש'
                                : 'View detailed summary of all supplier orders by month'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="grid gap-2">
                            <label>{t('year')}</label>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label>{t('month')}</label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger className="w-40"><SelectValue placeholder={t('month')} /></SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={generateReport} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin ml-2" /> 
                                    {language === 'he' ? 'מייצר דוח...' : 'Generating Report...'}
                                </>
                            ) : (
                                language === 'he' ? 'צור דוח' : 'Generate Report'
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {loading && (
                    <div className="flex justify-center items-center h-64">
                         <Loader className="w-12 h-12 animate-spin text-blue-600" />
                    </div>
                )}

                {(reportData || aggregatedData || comparisonData) && (
                    <div id="print-section" className="mt-8">
                        <Card>
                            <CardHeader className="flex flex-row justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl flex items-center gap-2">
                                        <ShoppingCart className="w-6 h-6" />
                                        {language === 'he' 
                                            ? `דוח הזמנות ספקים - ${months.find(m=>m.value===month)?.label} ${year}`
                                            : `Supplier Orders Report - ${months.find(m=>m.value===month)?.label} ${year}`
                                        }
                                    </CardTitle>
                                </div>
                                <Button onClick={handlePrint} variant="outline" className="no-print">
                                    <Printer className="w-4 h-4 ml-2" /> 
                                    {language === 'he' ? 'הדפס' : 'Print'}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-3 mb-6">
                                        <TabsTrigger value="by-orders" className="flex items-center gap-2">
                                            <ShoppingCart className="w-4 h-4" />
                                            {language === 'he' ? 'לפי הזמנות' : 'By Orders'}
                                        </TabsTrigger>
                                        <TabsTrigger value="aggregated" className="flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            {language === 'he' ? 'כל הפריטים מצטבר' : 'All Items Aggregated'}
                                        </TabsTrigger>
                                        <TabsTrigger value="comparison" className="flex items-center gap-2">
                                            <Scale className="w-4 h-4" />
                                            {language === 'he' ? 'הזמנות מול אספקה' : 'Orders vs Supply'}
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="by-orders">
                                        {reportData && (
                                            <>
                                                <CardDescription className="mb-4 space-y-1">
                                                    <div>
                                                        {language === 'he' ? 'סה"כ הזמנות:' : 'Total Orders:'} <strong>{reportData.totalOrders}</strong>
                                                    </div>
                                                    <div>
                                                        {language === 'he' ? 'סה"כ פריטים שהוזמנו:' : 'Total Items Ordered:'} <strong>{reportData.totalItems.toFixed(2)}</strong>
                                                    </div>
                                                    <div>
                                                        {language === 'he' ? 'עלות כוללת:' : 'Total Cost:'} <strong>₪{reportData.totalCost.toFixed(2)}</strong>
                                                    </div>
                                                </CardDescription>
                                                
                                                {reportData.items.length > 0 ? (
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                        <div>
                                                            <h3 className="font-bold mb-4">
                                                                {language === 'he' ? 'טבלת כמויות ועלויות' : 'Quantities & Costs Table'}
                                                            </h3>
                                                            <div className="border rounded-lg max-h-96 overflow-y-auto">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>{language === 'he' ? 'שם הפריט' : 'Item Name'}</TableHead>
                                                                            <TableHead>{language === 'he' ? 'כמות' : 'Quantity'}</TableHead>
                                                                            <TableHead>{language === 'he' ? 'יחידה' : 'Unit'}</TableHead>
                                                                            <TableHead>{language === 'he' ? 'עלות' : 'Cost'}</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {reportData.items.map(item => (
                                                                            <TableRow key={item.name}>
                                                                                <TableCell>{item.name}</TableCell>
                                                                                <TableCell>{item.quantity.toFixed(2)}</TableCell>
                                                                                <TableCell>{item.unit}</TableCell>
                                                                                <TableCell>₪{item.total_cost.toFixed(2)}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                        <div>
                                                             <h3 className="font-bold mb-4">
                                                                {language === 'he' ? '10 הפריטים המובילים' : 'Top 10 Items'}
                                                            </h3>
                                                            <ResponsiveContainer width="100%" height={400}>
                                                                <BarChart data={reportData.items.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" />
                                                                    <XAxis type="number" />
                                                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                                                    <Tooltip 
                                                                        formatter={(value, name) => {
                                                                            if (name === 'quantity') return [value.toFixed(2), language === 'he' ? 'כמות' : 'Quantity'];
                                                                            if (name === 'total_cost') return [`₪${value.toFixed(2)}`, language === 'he' ? 'עלות' : 'Cost'];
                                                                            return [value, name];
                                                                        }} 
                                                                    />
                                                                    <Legend />
                                                                    <Bar dataKey="quantity" name={language === 'he' ? 'כמות' : 'Quantity'} fill="#3b82f6" />
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-12">
                                                        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
                                                        <h3 className="mt-2 text-lg font-medium">
                                                            {language === 'he' ? 'לא נמצאו הזמנות' : 'No Orders Found'}
                                                        </h3>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            {language === 'he' 
                                                                ? 'לא נמצאו הזמנות לתקופה זו'
                                                                : 'No orders found for this period'}
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="aggregated">
                                        {aggregatedData && (
                                            <>
                                                <CardDescription className="mb-4 space-y-1">
                                                    <div>
                                                        {language === 'he' ? 'סה"כ פריטים ייחודיים:' : 'Total Unique Items:'} <strong>{aggregatedData.uniqueItemsCount}</strong>
                                                    </div>
                                                    <div>
                                                        {language === 'he' ? 'סה"כ כמות כל הפריטים:' : 'Total Quantity All Items:'} <strong>{aggregatedData.totalItems.toFixed(2)}</strong>
                                                    </div>
                                                    <div>
                                                        {language === 'he' ? 'עלות כוללת:' : 'Total Cost:'} <strong>₪{aggregatedData.totalCost.toFixed(2)}</strong>
                                                    </div>
                                                </CardDescription>
                                                
                                                {aggregatedData.items.length > 0 ? (
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                        <div>
                                                            <h3 className="font-bold mb-4">
                                                                {language === 'he' ? 'כל הפריטים - מצטבר' : 'All Items - Aggregated'}
                                                            </h3>
                                                            <div className="border rounded-lg max-h-96 overflow-y-auto">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>{language === 'he' ? 'שם הפריט' : 'Item Name'}</TableHead>
                                                                            <TableHead>{language === 'he' ? 'כמות כוללת' : 'Total Quantity'}</TableHead>
                                                                            <TableHead>{language === 'he' ? 'יחידה' : 'Unit'}</TableHead>
                                                                            <TableHead>{language === 'he' ? 'עלות כוללת' : 'Total Cost'}</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {aggregatedData.items.map(item => (
                                                                            <TableRow key={item.name}>
                                                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                                                <TableCell className="font-semibold text-blue-600">{item.quantity.toFixed(2)}</TableCell>
                                                                                <TableCell>{item.unit}</TableCell>
                                                                                <TableCell className="font-semibold text-green-600">₪{item.total_cost.toFixed(2)}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                        <div>
                                                             <h3 className="font-bold mb-4">
                                                                {language === 'he' ? '10 הפריטים המובילים - מצטבר' : 'Top 10 Items - Aggregated'}
                                                            </h3>
                                                            <ResponsiveContainer width="100%" height={400}>
                                                                <BarChart data={aggregatedData.items.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" />
                                                                    <XAxis type="number" />
                                                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                                                    <Tooltip 
                                                                        formatter={(value, name) => {
                                                                            if (name === 'quantity') return [value.toFixed(2), language === 'he' ? 'כמות' : 'Quantity'];
                                                                            if (name === 'total_cost') return [`₪${value.toFixed(2)}`, language === 'he' ? 'עלות' : 'Cost'];
                                                                            return [value, name];
                                                                        }} 
                                                                    />
                                                                    <Legend />
                                                                    <Bar dataKey="quantity" name={language === 'he' ? 'כמות' : 'Quantity'} fill="#8b5cf6" />
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-12">
                                                        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
                                                        <h3 className="mt-2 text-lg font-medium">
                                                            {language === 'he' ? 'לא נמצאו פריטים' : 'No Items Found'}
                                                        </h3>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            {language === 'he' 
                                                                ? 'לא נמצאו פריטים לתקופה זו'
                                                                : 'No items found for this period'}
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="comparison">
                                        {comparisonData && (
                                            <>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                    <Card>
                                                        <CardContent className="pt-6">
                                                            <div className="text-sm text-gray-600">{language === 'he' ? 'סה"כ הוזמן' : 'Total Ordered'}</div>
                                                            <div className="text-2xl font-bold text-blue-600">₪{comparisonData.totalOrderedCost.toFixed(2)}</div>
                                                        </CardContent>
                                                    </Card>
                                                    <Card>
                                                        <CardContent className="pt-6">
                                                            <div className="text-sm text-gray-600">{language === 'he' ? 'סה"כ התקבל' : 'Total Received'}</div>
                                                            <div className="text-2xl font-bold text-green-600">₪{comparisonData.totalReceivedCost.toFixed(2)}</div>
                                                        </CardContent>
                                                    </Card>
                                                    <Card>
                                                        <CardContent className="pt-6">
                                                            <div className="text-sm text-gray-600">{language === 'he' ? 'הפרש' : 'Difference'}</div>
                                                            <div className={`text-2xl font-bold ${comparisonData.costDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {comparisonData.costDifference >= 0 ? '+' : ''}₪{comparisonData.costDifference.toFixed(2)}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                    <Card>
                                                        <CardContent className="pt-6">
                                                            <div className="text-sm text-gray-600">{language === 'he' ? 'פריטים עם סטיות' : 'Items w/ Discrepancies'}</div>
                                                            <div className="text-2xl font-bold text-orange-600">{comparisonData.itemsWithDiscrepancies}</div>
                                                        </CardContent>
                                                    </Card>
                                                </div>

                                                {comparisonData.items.length > 0 ? (
                                                    <div className="border rounded-lg overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-gray-50">
                                                                    <TableHead className="font-bold">{language === 'he' ? 'שם פריט' : 'Item Name'}</TableHead>
                                                                    <TableHead className="text-center font-bold">{language === 'he' ? 'הוזמן' : 'Ordered'}</TableHead>
                                                                    <TableHead className="text-center font-bold">{language === 'he' ? 'התקבל' : 'Received'}</TableHead>
                                                                    <TableHead className="text-center font-bold">{language === 'he' ? 'הפרש כמות' : 'Qty Diff'}</TableHead>
                                                                    <TableHead className="text-center font-bold">{language === 'he' ? 'עלות הזמנה' : 'Ordered Cost'}</TableHead>
                                                                    <TableHead className="text-center font-bold">{language === 'he' ? 'עלות אספקה' : 'Received Cost'}</TableHead>
                                                                    <TableHead className="text-center font-bold">{language === 'he' ? 'הפרש עלות' : 'Cost Diff'}</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {comparisonData.items.map((item, idx) => (
                                                                    <TableRow key={idx} className={item.has_discrepancy ? 'bg-orange-50' : ''}>
                                                                        <TableCell className="font-medium whitespace-nowrap">
                                                                            {item.name}
                                                                            {item.has_discrepancy && (
                                                                                <AlertTriangle className="inline w-4 h-4 text-orange-500 ml-1" />
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center whitespace-nowrap">{item.ordered_quantity.toFixed(2)} {item.unit}</TableCell>
                                                                        <TableCell className="text-center whitespace-nowrap">{item.received_quantity.toFixed(2)} {item.unit}</TableCell>
                                                                        <TableCell className={`text-center font-bold whitespace-nowrap ${item.quantity_diff > 0 ? 'text-green-600' : item.quantity_diff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                                            {item.quantity_diff > 0 ? '+' : ''}{item.quantity_diff.toFixed(2)}
                                                                            {item.quantity_diff !== 0 && ` (${item.quantity_diff_percent.toFixed(1)}%)`}
                                                                        </TableCell>
                                                                        <TableCell className="text-center whitespace-nowrap">₪{item.ordered_cost.toFixed(2)}</TableCell>
                                                                        <TableCell className="text-center whitespace-nowrap">₪{item.received_cost.toFixed(2)}</TableCell>
                                                                        <TableCell className={`text-center font-bold whitespace-nowrap ${item.cost_diff > 0 ? 'text-red-600' : item.cost_diff < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                                                            {item.cost_diff > 0 ? '+' : ''}₪{item.cost_diff.toFixed(2)}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-12">
                                                        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
                                                        <h3 className="mt-2 text-lg font-medium">
                                                            {language === 'he' ? 'אין נתונים להשוואה' : 'No Data for Comparison'}
                                                        </h3>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            {language === 'he' 
                                                                ? 'לא נמצאו הזמנות או קבלות אספקה לתקופה זו'
                                                                : 'No orders or receipts found for this period'}
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
