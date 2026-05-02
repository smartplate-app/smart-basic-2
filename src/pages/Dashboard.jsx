import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader, TrendingUp, TrendingDown, AlertCircle, Save, Edit2, BarChart3, FileSpreadsheet, Download, Share, Upload, PlusCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, BarChart, Bar } from "recharts";
import moment from "moment";

import { notifyOS } from "../components/notifications/notify";
import SalesImportModal from "../components/sales/SalesImportModal";
import { getCache, setCache, isStale } from "../components/utils/cache";

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [dashboardData, setDashboardData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("actual");

  // Goal Setting fields
  const [predictedSales, setPredictedSales] = useState(0);
  const [laborGoalPercent, setLaborGoalPercent] = useState(25);
  const [foodGoalPercent, setFoodGoalPercent] = useState(30);
  const [managementSalary, setManagementSalary] = useState(0);
  const [monthlyRent, setMonthlyRent] = useState(0);

  // Footfall prediction fields
  const [dailyCustomers, setDailyCustomers] = useState(0);
  const [avgPerPerson, setAvgPerPerson] = useState(0);
  const [isKosher, setIsKosher] = useState(false);

  // Actual Performance fields
  const [actualSales, setActualSales] = useState(0);
  const [calculatedLaborCost, setCalculatedLaborCost] = useState(0);
  const [calculatedFoodCost, setCalculatedFoodCost] = useState(0);
  const [totalTips, setTotalTips] = useState(0);
  const [restaurantSales, setRestaurantSales] = useState(0);
  const [deliverySales, setDeliverySales] = useState(0);
  
  // Predicted values based on weekly schedules
  const [predictedLaborToDate, setPredictedLaborToDate] = useState(0);
  const [predictedSalesToDate, setPredictedSalesToDate] = useState(0);
  const [predictedMonthlyLabor, setPredictedMonthlyLabor] = useState(0);
  const [hasScheduleData, setHasScheduleData] = useState(false);
  const [exportingMonthly, setExportingMonthly] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [externalLink, setExternalLink] = useState("");
  const [syncingExternal, setSyncingExternal] = useState(false);
  const [inventoryCounts, setInventoryCounts] = useState([]);
  const [monthReceipts, setMonthReceipts] = useState([]);
  const [monthOrders, setMonthOrders] = useState([]);
  const [latestWeeklyLaborCost, setLatestWeeklyLaborCost] = useState(0);
  const [latestPredictedWeeklySales, setLatestPredictedWeeklySales] = useState(0);
  const [selectedStartCountId, setSelectedStartCountId] = useState("");
  const [selectedEndCountId, setSelectedEndCountId] = useState("");
  const [lastAfcSheetId, setLastAfcSheetId] = useState(null);
  const [lastAfcSheetUrl, setLastAfcSheetUrl] = useState(null);

  // PWA install prompt
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Projection (sales)
  const [projectedMonthlySales, setProjectedMonthlySales] = useState(0);
  const [projectionDaysElapsed, setProjectionDaysElapsed] = useState(0);
  const [projectionAvgPerDay, setProjectionAvgPerDay] = useState(0);

  // Manual overrides
  const [useManualLabor, setUseManualLabor] = useState(false);
  const [manualLaborCost, setManualLaborCost] = useState(0);
  const [useManualFood, setUseManualFood] = useState(false);
  const [manualFoodCost, setManualFoodCost] = useState(0);
  const [manualLaborLastUpdated, setManualLaborLastUpdated] = useState(null);
  const autoSaveTimerRef = useRef(null);

  // Category scan (Sales BI image)
  const [categoryScanLoading, setCategoryScanLoading] = useState(false);
  const [categoryChart, setCategoryChart] = useState([]);
  const [categoryScanError, setCategoryScanError] = useState(null);
  const [consultPopupOpen, setConsultPopupOpen] = useState(false);

  // Weekly POS Sales
  const [weeklySalesRecords, setWeeklySalesRecords] = useState([]);
  const [showSalesImportModal, setShowSalesImportModal] = useState(false);
  const [showMondayReminder, setShowMondayReminder] = useState(false);

  useEffect(() => {
    const today = new Date();
    if (today.getDay() === 1) { // Monday
      const key = `pos_reminder_${today.toISOString().slice(0,10)}`;
      if (!localStorage.getItem(key)) {
        setShowMondayReminder(true);
        localStorage.setItem(key, '1');
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  useEffect(() => {
    setActualSales((Number(restaurantSales)||0) + (Number(deliverySales)||0));
  }, [restaurantSales, deliverySales]);

  // Setup PWA install prompt listeners
  useEffect(() => {
    const checkInstalled = () => {
      const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = 'standalone' in navigator && navigator.standalone;
      setIsPwaInstalled(Boolean(standalone || iosStandalone));
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(Boolean(isiOS));
    };
    checkInstalled();

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    const onAppInstalled = () => {
      setIsPwaInstalled(true);
      setInstallPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    try {
      await installPromptEvent.userChoice;
    } finally {
      setInstallPromptEvent(null);
    }
  };

  const loadData = async (retryCount = 0) => {
    try {
      setError(null);

      // Add delay for retries
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Use controlled user's email if admin is controlling; otherwise own
      let workingEmail = currentUser.acting_as_store_email || currentUser.acting_as_user_email || currentUser.email;
      // If this user is a store manager/worker, show the head owner's data on the dashboard
      let ownerEmail = currentUser.store_user_owner_email || null;
      if (!ownerEmail) {
        try {
          const recs = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
          if (recs.length > 0) ownerEmail = recs[0].owner_email || null;
        } catch (_) {}
      }
      if (ownerEmail) {
        workingEmail = ownerEmail;
      }

      // Bootstrap fast render from cache (especially helpful when installed as PWA)
      const cacheKey = `dashboard_cache_${workingEmail}_${selectedMonth}`;
      const c = getCache(cacheKey);
      if (c?.data) {
        const cached = c.data;
        setDashboardData(cached.dashboardData || null);
        setPredictedSales(cached.predictedSales || 0);
        setLaborGoalPercent(cached.laborGoalPercent ?? 25);
        setFoodGoalPercent(cached.foodGoalPercent ?? 30);
        setManagementSalary(cached.managementSalary || 0);
        setMonthlyRent(cached.monthlyRent || 0);
        setActualSales(cached.actualSales || 0);
        setTotalTips(cached.totalTips || 0);
        setManualLaborCost(cached.manualLaborCost || 0);
        setUseManualLabor(Boolean(cached.useManualLabor));
        setCalculatedLaborCost(cached.calculatedLaborCost || 0);
        setCalculatedFoodCost(cached.calculatedFoodCost || 0);
        setPredictedLaborToDate(cached.predictedLaborToDate || 0);
        setPredictedSalesToDate(cached.predictedSalesToDate || 0);
        setPredictedMonthlyLabor(cached.predictedMonthlyLabor || 0);
        setHasScheduleData(Boolean(cached.hasScheduleData));
        setLoading(false);
        
        if (!isStale(c, 180000)) {
          return;
        }
      } else {
        setLoading(true);
      }

      // Load all data in parallel for faster loading
      const monthStart = moment(selectedMonth).startOf('month');
      const today = moment();
      const monthEnd = moment(selectedMonth).endOf('month');
      const endDate = today.isBefore(monthEnd) && today.isAfter(monthStart) ? today : monthEnd;

      const [allDashboardData, allSchedules, allReceipts, allOrders, incomingTransfers, outgoingTransfers, allCounts, allWeeklySales] = await Promise.all([
        base44.entities.MonthlyDashboardData.filter({ created_by: workingEmail, month: selectedMonth }),
        base44.entities.WeeklySchedule.filter({ created_by: workingEmail }),
        base44.entities.SupplyReceipt.filter({ created_by: workingEmail }),
        base44.entities.Order.filter({ created_by: workingEmail }),
        base44.entities.InventoryTransfer.filter({ month: selectedMonth, to_store_email: workingEmail, status: 'completed' }),
        base44.entities.InventoryTransfer.filter({ month: selectedMonth, from_store_email: workingEmail, status: 'completed' }),
        base44.entities.InventoryCount.filter({ created_by: workingEmail }, "-count_date"),
        base44.entities.WeeklySalesRecord.filter({ created_by: workingEmail }, "-week_start_date")
      ]);

      setInventoryCounts(allCounts);
      
      const filteredWeeklySales = allWeeklySales.filter(ws => {
         const d = moment(ws.week_start_date);
         return d.isSameOrAfter(monthStart) && d.isSameOrBefore(endDate);
      });
      setWeeklySalesRecords(filteredWeeklySales);

      // Process dashboard data
      const existingData = allDashboardData[0];
      
      const calculatedTotalSales = filteredWeeklySales.reduce((sum, r) => sum + (r.total_sales_incl_vat || 0), 0);
      const calculatedRestaurantSales = filteredWeeklySales.reduce((sum, r) => sum + (r.restaurant_sales || 0), 0);
      const calculatedDeliverySales = filteredWeeklySales.reduce((sum, r) => sum + (r.delivery_sales || 0) + (r.wolt_sales || 0) + (r.takeaway_sales || 0), 0);

      if (existingData) {
        setDashboardData(existingData);
        setPredictedSales(existingData.predicted_sales || calculatedTotalSales || 0);
        setLaborGoalPercent(existingData.labor_goal_percent || 25);
        setFoodGoalPercent(existingData.food_goal_percent || 30);
        setManagementSalary(existingData.management_salary || 0);
        setMonthlyRent(existingData.monthly_rent_incl_vat || 0);
        // Sales & tips
        setRestaurantSales(calculatedRestaurantSales);
        setDeliverySales(calculatedDeliverySales);
        setActualSales(calculatedTotalSales);
        setTotalTips(0);
        // Manual labor override
        const mlc = Number(existingData.manual_labor_cost || 0);
        setManualLaborCost(mlc);
        setUseManualLabor(Boolean(existingData.use_manual_labor));
        setManualLaborLastUpdated(existingData.updated_date || existingData.created_date || null);
        
        // Manual food override
        const mfc = Number(existingData.manual_food_cost || 0);
        setManualFoodCost(mfc);
        setUseManualFood(Boolean(existingData.use_manual_food));
      } else {
        setDashboardData(null);
        setPredictedSales(calculatedTotalSales);
        setLaborGoalPercent(25);
        setFoodGoalPercent(30);
        setManagementSalary(0);
        setMonthlyRent(0);
        setActualSales(calculatedTotalSales);
        setTotalTips(0);
        setRestaurantSales(calculatedRestaurantSales);
        setDeliverySales(calculatedDeliverySales);
        setManualLaborCost(0);
        setUseManualLabor(false);
        setManualFoodCost(0);
        setUseManualFood(false);
      }

      // Sales projection (based on days elapsed till yesterday)
      const daysInMonth = moment(selectedMonth).daysInMonth();
      let daysElapsedForProjection = 0;
      if (moment().isSame(monthStart, 'month')) {
        daysElapsedForProjection = Math.max(1, today.diff(monthStart, 'days'));
      } else if (moment(selectedMonth).isBefore(moment(), 'month')) {
        daysElapsedForProjection = daysInMonth;
      } else {
        daysElapsedForProjection = 1;
      }
      const salesTillNow = existingData ? (existingData.total_sales || 0) : 0;
      const avgPerDayInclVAT = salesTillNow > 0 ? (salesTillNow / daysElapsedForProjection) : 0;
      setProjectionDaysElapsed(daysElapsedForProjection);
      setProjectionAvgPerDay(avgPerDayInclVAT);
      setProjectedMonthlySales(avgPerDayInclVAT * daysInMonth);

      // Labor MTD based on baseline week's daily cost × days passed in month
      // Choose the week that contains the first day of the month; fallback to earliest overlapping week
      const overlapping = allSchedules.filter(s => {
        const ws = moment(s.week_start_date);
        const we = moment(s.week_start_date).add(6, 'days');
        return we.isSameOrAfter(monthStart) && ws.isSameOrBefore(monthEnd);
      });
      const anchor = overlapping.find(s => {
        const ws = moment(s.week_start_date);
        const we = moment(s.week_start_date).add(6, 'days');
        return monthStart.isBetween(ws, we, undefined, '[]');
      });
      const baseline = anchor || overlapping.sort((a, b) => moment(a.week_start_date).valueOf() - moment(b.week_start_date).valueOf())[0];

      // MTD based on working days elapsed (unique shift dates in month) × baseline daily cost (weekly/7)
      let mtdLabor = 0;
      if (baseline && (baseline.total_cost || 0) > 0) {
        const workedDates = new Set();
        allSchedules.forEach(s => {
          (s.shifts || []).forEach(sh => {
            const m = moment(sh.date, moment.ISO_8601, true);
            if (!m.isValid()) return;
            if (m.isBetween(monthStart, endDate, 'day', '[]')) {
              workedDates.add(m.format('YYYY-MM-DD'));
            }
          });
        });
        const workingDaysElapsed = workedDates.size || 0;
        const dailyCost = (baseline.total_cost || 0) / 7;
        mtdLabor = dailyCost * workingDaysElapsed;
      }
      setCalculatedLaborCost(Math.round(mtdLabor));

      // Calculate predicted labor based on the latest schedule with data
      // Find the most recent schedule that has total_cost (includes employer costs)
      const schedulesWithData = allSchedules
        .filter(s => s.total_cost > 0)
        .sort((a, b) => moment(b.week_start_date).valueOf() - moment(a.week_start_date).valueOf());
      
      if (schedulesWithData.length > 0) {
        setHasScheduleData(true);
        
        // Take the latest schedule
        const latestSchedule = schedulesWithData[0];
        const weeklyLaborCost = latestSchedule.total_cost; // Already includes employer costs
        const weeklySales = latestSchedule.predicted_weekly_sales || 0;
        setLatestWeeklyLaborCost(weeklyLaborCost || 0);
        setLatestPredictedWeeklySales(weeklySales || 0);
        
        // Calculate monthly prediction: weekly * 4.2 weeks
        const monthlyPredictedLabor = weeklyLaborCost * 4.2;
        const monthlyPredictedSales = weeklySales * 4.2;
        
        // Store monthly prediction
        setPredictedMonthlyLabor(monthlyPredictedLabor);
        
        // Calculate days passed from beginning of month to today
        const daysPassed = today.isBefore(monthEnd) && today.isAfter(monthStart) 
          ? today.diff(monthStart, 'days') + 1 
          : moment(selectedMonth).daysInMonth();
        
        // Calculate average daily costs from monthly prediction
        const daysInMonth = moment(selectedMonth).daysInMonth();
        const avgDailyLaborCost = monthlyPredictedLabor / daysInMonth;
        const avgDailySales = monthlyPredictedSales / daysInMonth;
        
        // Predicted to date = daily average * days passed
        setPredictedLaborToDate(avgDailyLaborCost * daysPassed);
        setPredictedSalesToDate(avgDailySales * daysPassed);
      } else {
        setHasScheduleData(false);
        setPredictedLaborToDate(0);
        setPredictedSalesToDate(0);
        setPredictedMonthlyLabor(0);
        setLatestWeeklyLaborCost(0);
        setLatestPredictedWeeklySales(0);
      }

      // Calculate food cost (remove VAT from receipts unless they are zero VAT)
      const VAT_RATE = 1 + (currentUser?.vat_percent ?? 18) / 100;
      const filteredReceipts = (allReceipts || []).filter(r => {
        const dateStr = r.invoice_date || r.received_date;
        if (!dateStr) return false;
        const d = moment(dateStr, [moment.ISO_8601, 'YYYY-MM-DD', 'DD/MM/YYYY']);
        return d.isValid() && d.isSameOrAfter(monthStart) && d.isSameOrBefore(endDate);
      });
      let totalFoodCost = 0;
      filteredReceipts.forEach(receipt => {
        const receiptTotal = receipt.invoice_total || receipt.calculated_total || 0;
        // Remove VAT from receipt total
        const receiptVatRate = receipt.is_zero_vat ? 1 : VAT_RATE;
        totalFoodCost += receiptTotal / receiptVatRate;
      });

      // Branch transfers: add incoming, subtract outgoing (costs assumed excl. VAT)
      const incomingTransfersTotal = (incomingTransfers || []).reduce((sum, t) => sum + (t.total_cost || 0), 0);
      const outgoingTransfersTotal = (outgoingTransfers || []).reduce((sum, t) => sum + (t.total_cost || 0), 0);
      const adjustedFoodCost = totalFoodCost + incomingTransfersTotal - outgoingTransfersTotal;

      setCalculatedFoodCost(adjustedFoodCost);
      setMonthReceipts(filteredReceipts);

      const filteredOrders = (allOrders || []).filter(o => {
        const d = moment(o.delivery_date || o.created_date);
        return d.isSameOrAfter(monthStart) && d.isSameOrBefore(endDate);
      });
      setMonthOrders(filteredOrders);

      // Save lightweight cache snapshot for fast next startup
      try {
        const snapshot = {
          dashboardData: existingData || null,
          predictedSales: existingData ? (existingData.predicted_sales || existingData.total_sales || 0) : 0,
          laborGoalPercent: existingData ? (existingData.labor_goal_percent || 25) : 25,
          foodGoalPercent: existingData ? (existingData.food_goal_percent || 30) : 30,
          managementSalary: existingData ? (existingData.management_salary || 0) : 0,
          monthlyRent: existingData ? (existingData.monthly_rent_incl_vat || 0) : 0,
          actualSales: existingData ? ((Number(existingData.restaurant_sales || 0) + Number(existingData.delivery_takeaway_sales || 0)) || (existingData.total_sales || 0)) : 0,
          totalTips: existingData ? (existingData.total_tips || 0) : 0,
          manualLaborCost: existingData ? Number(existingData.manual_labor_cost || 0) : 0,
          useManualLabor: existingData ? Boolean(existingData.use_manual_labor) : false,
          manualFoodCost: existingData ? Number(existingData.manual_food_cost || 0) : 0,
          useManualFood: existingData ? Boolean(existingData.use_manual_food) : false,
          calculatedLaborCost: Math.round(mtdLabor),
          calculatedFoodCost: adjustedFoodCost,
          predictedLaborToDate,
          predictedSalesToDate,
          predictedMonthlyLabor,
          hasScheduleData,
          combinedGoalPercent: 60
        };
        setCache(`dashboard_cache_${workingEmail}_${selectedMonth}`, snapshot);
      } catch (_) {}


    } catch (error) {
      console.error("Error loading dashboard data:", error);
      
      // Retry on network errors
      const isNetworkError = error.message?.includes('aborted') || 
                            error.message?.includes('Network') || 
                            error.code === 'ERR_NETWORK';
      
      if (isNetworkError && retryCount < 3) {
        console.log(`Retrying dashboard load... (${retryCount + 1}/3)`);
        return loadData(retryCount + 1);
      }
      
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const dataToSave = {
        month: selectedMonth,
        predicted_sales: parseFloat(predictedSales) || 0,
        labor_goal_percent: parseFloat(laborGoalPercent) || 25,
        food_goal_percent: parseFloat(foodGoalPercent) || 30,
        management_salary: parseFloat(managementSalary) || 0,
        total_sales: (Number(restaurantSales) || 0) + (Number(deliverySales) || 0),
        restaurant_sales: Number(restaurantSales) || 0,
        delivery_takeaway_sales: Number(deliverySales) || 0,
        total_tips: 0,
        manual_labor_cost: parseFloat(manualLaborCost) || 0,
        use_manual_labor: useManualLabor,
        manual_food_cost: parseFloat(manualFoodCost) || 0,
        use_manual_food: useManualFood,
        monthly_rent_incl_vat: parseFloat(monthlyRent) || 0
      };

      if (dashboardData && dashboardData.id) {
        await base44.entities.MonthlyDashboardData.update(dashboardData.id, dataToSave);
      } else {
        await base44.entities.MonthlyDashboardData.create(dataToSave);
      }

      setEditMode(false);
      await loadData();
    } catch (error) {
      console.error("Error saving dashboard data:", error);
      alert(t('error_saving') + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save manual labor cost (debounced, no button needed)
  const autoSaveManualLabor = (newLaborCost, newUseManual) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const now = new Date().toISOString();
        const dataToSave = {
          month: selectedMonth,
          predicted_sales: parseFloat(predictedSales) || 0,
          labor_goal_percent: parseFloat(laborGoalPercent) || 25,
          food_goal_percent: parseFloat(foodGoalPercent) || 30,
          management_salary: parseFloat(managementSalary) || 0,
          total_sales: (Number(restaurantSales) || 0) + (Number(deliverySales) || 0),
          restaurant_sales: Number(restaurantSales) || 0,
          delivery_takeaway_sales: Number(deliverySales) || 0,
          total_tips: 0,
          manual_labor_cost: parseFloat(newLaborCost) || 0,
          use_manual_labor: newUseManual,
          manual_food_cost: parseFloat(manualFoodCost) || 0,
          use_manual_food: useManualFood,
          monthly_rent_incl_vat: parseFloat(monthlyRent) || 0
        };
        if (dashboardData && dashboardData.id) {
          await base44.entities.MonthlyDashboardData.update(dashboardData.id, dataToSave);
        } else {
          const created = await base44.entities.MonthlyDashboardData.create(dataToSave);
          setDashboardData(created);
        }
        setManualLaborLastUpdated(now);
      } catch (e) {
        console.error('Auto-save labor cost failed:', e);
      }
    }, 1000);
  };

  // Validate combined goal doesn't exceed 60%
  const handleLaborGoalChange = (value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue + foodGoalPercent <= 60) {
      setLaborGoalPercent(newValue);
    } else {
      setLaborGoalPercent(60 - foodGoalPercent);
    }
  };

  const handleFoodGoalChange = (value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue + laborGoalPercent <= 60) {
      setFoodGoalPercent(newValue);
    } else {
      setFoodGoalPercent(60 - laborGoalPercent);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSyncFromLink = async () => {
    if (!externalLink) return;

    try {
      setSyncingExternal(true);
      const response = await base44.functions.invoke('importFromExternalDashboard', { url: externalLink, month: selectedMonth });
      
      if (response.data && response.data.success) {
        const d = response.data.data.data || response.data.data;
        if (d) {
          setActualSales(d.total_sales || 0);
          setRestaurantSales(d.restaurant_sales || 0);
          if (d.use_manual_labor) {
            setUseManualLabor(true);
            setManualLaborCost(d.manual_labor_cost || 0);
          }
        }
        alert(language === 'he' ? 'הנתונים סונכרנו בהצלחה מהקישור!' : 'Data synced successfully from link!');
        await loadData();
      } else {
        throw new Error(response.data?.error || 'Sync failed');
      }
    } catch (error) {
      console.error("Error syncing from link:", error);
      alert(language === 'he' ? 'שגיאה בסנכרון: ' + error.message : 'Error syncing: ' + error.message);
    } finally {
      setSyncingExternal(false);
    }
  };

  const handleImportFromSheet = async () => {
    const url = prompt(language === 'he' ? 'הזן קישור לגיליון Google Sheets:' : 'Enter Google Sheets URL:');
    if (!url) return;

    try {
      setImportingData(true);
      const response = await base44.functions.invoke('importDashboardDataFromSheet', { spreadsheetUrl: url });
      
      if (response.data.success) {
        const d = response.data.data;
        if (d) {
          setActualSales(d.total_sales || 0);
          setRestaurantSales(d.restaurant_sales || 0);
          setDeliverySales(d.delivery_takeaway_sales || 0);
          setPredictedSales(d.predicted_sales || 0);
          setLaborGoalPercent(d.labor_goal_percent || 25);
          setFoodGoalPercent(d.food_goal_percent || 30);
          if (d.use_manual_labor) {
            setUseManualLabor(true);
            setManualLaborCost(d.manual_labor_cost || 0);
          }
          if (d.use_manual_food) {
            setUseManualFood(true);
            setManualFoodCost(d.manual_food_cost || 0);
          }
        }
        alert(language === 'he' ? 'הנתונים יובאו בהצלחה!' : 'Data imported successfully!');
        setSelectedMonth(response.data.month);
        await loadData();
      } else {
        throw new Error(response.data.error || 'Import failed');
      }
    } catch (error) {
      console.error("Error importing data:", error);
      alert(language === 'he' ? 'שגיאה בייבוא נתונים: ' + error.message : 'Error importing data: ' + error.message);
    } finally {
      setImportingData(false);
    }
  };

  const handleExportMonthlyReport = async () => {
    try {
      setExportingMonthly(true);
      
      const exportData = {
        reportType: 'monthly',
        month: selectedMonth,
        data: {
          actualSales: actualSales,
          actualSalesExVAT: actualSalesExVAT,
          laborCost: effectiveLaborCost,
          laborPercent: actualLaborPercent.toFixed(1),
          foodCost: calculatedFoodCost,
          foodPercent: actualFoodPercent.toFixed(1),
          combinedCost: effectiveLaborCost + calculatedFoodCost,
          combinedPercent: actualCombinedPercent.toFixed(1),
          predictedSales: predictedSales,
          laborGoalAmount: laborGoalAmount,
          laborGoalPercent: laborGoalPercent,
          foodGoalAmount: foodGoalAmount,
          foodGoalPercent: foodGoalPercent
        }
      };

      const response = await base44.functions.invoke('exportToGoogleSheets', exportData);
      
      if (response.data.success) {
        window.open(response.data.url, '_blank');
        alert(language === 'he' ? 'הדוח יוצא בהצלחה!' : 'Report exported successfully!');
      } else {
        throw new Error(response.data.error || 'Export failed');
      }
    } catch (error) {
      console.error("Error exporting monthly report:", error);
      alert(language === 'he' ? 'שגיאה בייצוא הדוח' : 'Error exporting report');
    } finally {
      setExportingMonthly(false);
    }
  };



  const openSheetsApp = (sheetId, browserUrl) => {
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const webUrl = browserUrl || (sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}` : null);
    const appUrl = webUrl ? `googlesheets://${webUrl}` : null;
    if (isiOS && appUrl) {
      const start = Date.now();
      window.location.href = appUrl;
      setTimeout(() => {
        if (Date.now() - start < 1500 && webUrl) {
          window.open(webUrl, '_blank');
        }
      }, 1200);
    } else if (webUrl) {
      window.open(webUrl, '_blank');
    }
  };

  const handleGenerateAfcSheet = async () => {
    try {
      const startDate = moment(selectedMonth, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
      const endDate = moment(selectedMonth, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');
      const { data } = await base44.functions.invoke('generateAfcSheet', { startDate, endDate, startCountId: selectedStartCountId, endCountId: selectedEndCountId });
      if (data?.spreadsheetId || data?.spreadsheetUrl) {
        setLastAfcSheetId(data.spreadsheetId || null);
        setLastAfcSheetUrl(data.spreadsheetUrl || null);
        openSheetsApp(data.spreadsheetId, data.spreadsheetUrl);
        return;
      }
      if (data?.csvContent) {
        const blob = new Blob([data.csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data?.suggestedFileName || 'afc_report.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }
      alert(language === 'he' ? 'כשל ביצירת הדוח' : 'Failed to generate sheet');
    } catch (e) {
      alert(language === 'he' ? 'כשל ביצירת הדוח' : 'Failed to generate sheet');
    }
  };

  // Upload & parse BI category image/pdf -> build percent-of-total chart
  const handleCategoryImageChange = async (file) => {
    setCategoryScanLoading(true);
    setCategoryScanError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // OCR schema for structured extraction (Hebrew + English labels)
      const json_schema = {
        type: 'object',
        additionalProperties: true,
        properties: {
          rows: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
              properties: {
                category: { type: 'string' },
                Category: { type: 'string' },
                name: { type: 'string' },
                '\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4': { type: 'string' },
                '\u05E9\u05DD': { type: 'string' },
                sales: { anyOf: [{ type: 'number' }, { type: 'string' }] },
                amount: { anyOf: [{ type: 'number' }, { type: 'string' }] },
                Sales: { anyOf: [{ type: 'number' }, { type: 'string' }] },
                '\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA': { anyOf: [{ type: 'number' }, { type: 'string' }] },
                percentage: { anyOf: [{ type: 'number' }, { type: 'string' }] },
                '\u05D0\u05D7\u05D5\u05D6': { anyOf: [{ type: 'number' }, { type: 'string' }] },
                '\u05D0\u05D7\u05D5\u05D6\u05D9\u05DD': { anyOf: [{ type: 'number' }, { type: 'string' }] }
              }
            }
          }
        },
        required: ['rows']
      };

      // Run OCR extraction and a Hebrew-tuned LLM in parallel
      const extractPromise = base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema });

      const schemaLLM = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                category: { type: 'string' },
                percentage: { anyOf: [{ type: 'number' }, { type: 'string' }] },
                amount: { anyOf: [{ type: 'number' }, { type: 'string' }] }
              },
              required: ['name']
            }
          }
        },
        required: ['items']
      };
      const hebrewPrompt = `אתה מומחה לחילוץ מידע מדוחות מכירה בעברית.
קיבלת תמונה/‏PDF של דוח "מכירות לפי קטגוריה". הוצא את כל הקטגוריות עם אחוז מכלל המכירות (מועדף) או סכום בשקלים אם אין אחוז.
הנחיות חשובות:
- תמוך בעברית (כיווניות RTL), סימן % ותווי ₪/פסיקים.
- תתעלם מקישוטים/כותרות. החזר רק קטגוריות אמיתיות.
- אם יש רק סכומים – חשב אחוזים יחסית לסכום הכולל.
- ודא שהאחוזים סוכמים בערך ל-100% (סטייה קטנה מותרת).
החזר JSON בלבד במבנה items: [{name, percentage?, amount?}].`;
      const llmPromise = base44.integrations.Core.InvokeLLM({
        prompt: hebrewPrompt,
        response_json_schema: schemaLLM,
        file_urls: [file_url]
      });

      const [resExtract, resLLM] = await Promise.all([extractPromise, llmPromise]);

      // Helpers
      const parseNumber = (v) => {
        if (typeof v === 'number' && isFinite(v)) return v;
        if (v == null) return 0;
        const s = String(v).replace(/%/g, '').replace(/[^0-9,.-]/g, '').replace(/,/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
      };
      const pick = (obj, keys) => { for (const k of keys) { if (obj[k] != null && obj[k] !== '') return obj[k]; } return null; };
      const normalizeTo100 = (arr) => {
        const sum = arr.reduce((s, x) => s + (isFinite(x.value) ? Math.max(0, x.value) : 0), 0);
        if (sum > 0) return arr.map(x => ({ ...x, value: (Math.max(0, x.value) / sum) * 100 }));
        return arr;
      };

      // Build candidates from OCR
      let ocrRows = null;
      if (resExtract?.status === 'success' && resExtract?.output) ocrRows = resExtract.output;
      const arrOcr = Array.isArray(ocrRows) ? ocrRows : (Array.isArray(ocrRows?.rows) ? ocrRows.rows : []);
      const normOcr = arrOcr.map((r) => {
        const name = pick(r, ['category','Category','name','\u05E9\u05DD','\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4']) || '';
        const salesRaw = pick(r, ['sales','amount','Sales','\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA']);
        const percRaw = pick(r, ['percentage','\u05D0\u05D7\u05D5\u05D6','\u05D0\u05D7\u05D5\u05D6\u05D9\u05DD']);
        const sales = parseNumber(salesRaw);
        let percentage = percRaw != null ? parseNumber(percRaw) : null;
        if (percentage != null && percentage > 0 && percentage <= 1) percentage *= 100;
        return { name, sales, percentage };
      }).filter(x => x.name);
      const totalOcr = normOcr.reduce((s, x) => s + (isFinite(x.sales) ? x.sales : 0), 0);
      const withPercOcr = normOcr
        .filter(x => (x.percentage != null && isFinite(x.percentage)) || (isFinite(x.sales) && x.sales > 0))
        .map(x => ({ name: x.name, value: (x.percentage != null && isFinite(x.percentage)) ? x.percentage : (totalOcr > 0 ? (x.sales / totalOcr) * 100 : 0) }));

      // Build candidates from LLM
      const itemsLLM = Array.isArray(resLLM?.items) ? resLLM.items : (Array.isArray(resLLM?.data?.items) ? resLLM.data.items : []);
      const withPercLLM = (itemsLLM || []).map(it => {
        const amount = parseNumber(it.amount);
        let perc = it.percentage != null ? parseNumber(it.percentage) : null;
        if (perc != null && perc > 0 && perc <= 1) perc *= 100;
        return { name: it.name || it.category || '', value: (perc != null && isFinite(perc)) ? perc : amount };
      }).filter(x => x.name);

      // Prefer LLM for Hebrew if it found anything; otherwise fall back to OCR
      let chosen = (language === 'he' && withPercLLM.length > 0) ? withPercLLM : (withPercLLM.length >= withPercOcr.length ? withPercLLM : withPercOcr);

      // If chosen contains raw amounts (not percents), normalize to 100%
      const sumChosen = chosen.reduce((s, x) => s + (isFinite(x.value) ? x.value : 0), 0);
      if (sumChosen > 0 && sumChosen > 120) { // likely raw amounts
        chosen = chosen.map(x => ({ ...x, value: (x.value / sumChosen) * 100 }));
      }
      // Final normalization to sum ~100
      const chosenNorm = normalizeTo100(chosen).sort((a,b) => b.value - a.value);

      if (chosenNorm.length === 0) {
        setCategoryScanError(language === 'he' ? 'לא נמצא מידע קריא בתמונה/‏PDF. נסו תמונה חדה יותר או דו"ח עם שמות קטגוריות וסכומים/אחוזים.' : 'Couldn’t read categories from the image/PDF. Try a clearer shot or a report that shows category names and amounts/percents.');
      }
      setCategoryChart(chosenNorm);
    } catch (err) {
      console.error('Category scan failed:', err);
      setCategoryScanError(language === 'he' ? 'נכשלה קריאת הדוח. נסו תמונה ברורה או PDF.' : 'Failed to read the report. Try a clear image or PDF.');
    } finally {
      setCategoryScanLoading(false);
    }
  };

  // Derived KPIs for consulting banner (computed early for hooks below)
  const userVatMultiplier = 1 + (user?.vat_percent ?? 18) / 100;
  const actualSalesExVAT = actualSales / userVatMultiplier;
  const effectiveLaborCost = (useManualLabor && manualLaborCost > 0) ? manualLaborCost : calculatedLaborCost;
  const effectiveFoodCost = (useManualFood && manualFoodCost > 0) ? manualFoodCost : calculatedFoodCost;
  const actualLaborPercent = actualSalesExVAT > 0 ? (effectiveLaborCost / actualSalesExVAT) * 100 : 0;
  const weeklySalesExVAT = latestPredictedWeeklySales > 0 ? latestPredictedWeeklySales / userVatMultiplier : 0;
  const weeklyLaborPercent = weeklySalesExVAT > 0 ? ((latestWeeklyLaborCost || 0) / weeklySalesExVAT) * 100 : 0;
  const actualFoodPercent = actualSalesExVAT > 0 ? (effectiveFoodCost / actualSalesExVAT) * 100 : 0;
  const actualCombinedPercent = actualLaborPercent + actualFoodPercent;
  const daysInMonthForProjection = moment(selectedMonth).daysInMonth();
  const projectedSalesInclVAT = (actualSales > 0 && projectionDaysElapsed > 0)
    ? (actualSales / projectionDaysElapsed) * daysInMonthForProjection
    : projectedMonthlySales;
  const rentPercentOfSales = projectedSalesInclVAT > 0 ? (monthlyRent / projectedSalesInclVAT) * 100 : 0;
  const isRentAbove7 = rentPercentOfSales > 7;
  const isCombinedAbove60 = actualCombinedPercent > 60;
  const showConsulting = isRentAbove7 || isCombinedAbove60;

  // OS notification when combined cost exceeds goal (before early returns)
  useEffect(() => {
    const localUserVatMultiplier = 1 + (user?.vat_percent ?? 18) / 100;
    const predictedSalesExVATLocal = (predictedSales || 0) / localUserVatMultiplier;
    const combinedGoalPercentLocal = 60;
    const actualSalesExVATLocal = (actualSales || 0) / localUserVatMultiplier;
    const effectiveLaborCostLocal = (useManualLabor && manualLaborCost > 0) ? manualLaborCost : calculatedLaborCost;
    const actualLaborPercentLocal = actualSalesExVATLocal > 0 ? (effectiveLaborCostLocal / actualSalesExVATLocal) * 100 : 0;
    const effectiveFoodCostLocal = (useManualFood && manualFoodCost > 0) ? manualFoodCost : calculatedFoodCost;
    const actualFoodPercentLocal = actualSalesExVATLocal > 0 ? (effectiveFoodCostLocal / actualSalesExVATLocal) * 100 : 0;
    const actualCombinedPercentLocal = actualLaborPercentLocal + actualFoodPercentLocal;
    const isOverGoalLocal = actualCombinedPercentLocal > combinedGoalPercentLocal;
    if (!isOverGoalLocal) return;
    const key = `notif_over_goal_${selectedMonth}`;
    if (localStorage.getItem(key)) return;
    const title = language === 'he' ? 'חריגה מהיעד' : 'Over goal';
    const body = language === 'he'
      ? `האחוז המשולב ${actualCombinedPercentLocal.toFixed(1)}% גבוה מהיעד ${combinedGoalPercentLocal.toFixed(0)}%`
      : `Combined cost ${actualCombinedPercentLocal.toFixed(1)}% exceeds goal ${combinedGoalPercentLocal.toFixed(0)}%`;
    notifyOS({ title, body, tag: 'dashboard-over-goal' });
    localStorage.setItem(key, '1');
  }, [predictedSales, laborGoalPercent, foodGoalPercent, actualSales, useManualLabor, manualLaborCost, calculatedLaborCost, useManualFood, manualFoodCost, calculatedFoodCost, selectedMonth, language]);

  // Show one-time consulting popup per month when thresholds exceeded
  useEffect(() => {
    if (showConsulting) {
      try {
        const key = `consult_popup_${selectedMonth}`;
        if (!localStorage.getItem(key)) {
          setConsultPopupOpen(true);
          localStorage.setItem(key, '1');
        }
      } catch (_) {
        setConsultPopupOpen(true);
      }
    }
  }, [showConsulting, selectedMonth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#d4a373]" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              {language === 'he' ? 'שגיאה בטעינת דשבורד' : 'Error Loading Dashboard'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              {language === 'he' ? 'נסה שוב' : 'Try Again'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  // Goal calculations
  const operatingDays = isKosher ? 26 : 31;
  const footfallMonthlyPrediction = (dailyCustomers || 0) * (avgPerPerson || 0) * operatingDays;
  const currentVatMultiplier = 1 + (user?.vat_percent ?? 18) / 100;
  const predictedSalesExVAT = predictedSales / currentVatMultiplier;
  const combinedGoalPercent = 60;
  const laborGoalAmount = predictedSalesExVAT * (laborGoalPercent / 100);
  const foodGoalAmount = predictedSalesExVAT * (foodGoalPercent / 100);

  // Actual calculations
  const isOverGoal = actualCombinedPercent > combinedGoalPercent;

  const costBreakdownData = [
    { name: language === 'he' ? 'עלות עבודה' : 'Labor Cost', value: effectiveLaborCost, color: '#1f2937' },
    { name: language === 'he' ? 'עלות מזון' : 'Food Cost', value: effectiveFoodCost, color: '#6b7280' }
  ];

  // AFC calculations (start count + supplies accepted - end count) / sales (excl. VAT)
  const startCount = inventoryCounts.find(c => c.id === selectedStartCountId);
  const endCount = inventoryCounts.find(c => c.id === selectedEndCountId);
  const startVal = startCount?.total_inventory_value || 0;
  const endVal = endCount?.total_inventory_value || 0;
  const suppliesAccepted = effectiveFoodCost; // Already excl. VAT and adjusted for transfers
  const afcUsage = Math.max(0, startVal + suppliesAccepted - endVal);
  const afcPercent = actualSalesExVAT > 0 ? (afcUsage / actualSalesExVAT) * 100 : 0;

  // Build per-item usage rows (only items with both begin and end counts)
  const itemUsageRows = (() => {
    if (!startCount || !endCount) return [];
    const cn = (s) => (s ? String(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim() : '');
    const countMap = (count) => {
      const m = new Map();
      const items = Array.isArray(count?.items) ? count.items : [];
      items.forEach(it => {
        const key = it.item_id || cn(it.item_name || it.item);
        const name = it.item_name || it.item || '';
        const unit = it.unit || '';
        const qty = Number(it.counted_quantity) || 0;
        const prev = m.get(key) || { name, unit, qty: 0 };
        prev.qty += qty;
        if (!prev.unit && unit) prev.unit = unit;
        if (!prev.name && name) prev.name = name;
        m.set(key, prev);
      });
      return m;
    };
    const begin = countMap(startCount);
    const end = countMap(endCount);
    const ordered = new Map();
    (monthOrders || []).forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach(it => {
        const key = it.item_id || cn(it.item_name || it.item);
        const name = it.item_name || it.item || '';
        const unit = it.unit || '';
        const qty = Number(it.quantity || 0) || 0;
        const prev = ordered.get(key) || { name, unit, qty: 0 };
        prev.qty += qty;
        if (!prev.unit && unit) prev.unit = unit;
        if (!prev.name && name) prev.name = name;
        ordered.set(key, prev);
      });
    });
    const keys = Array.from(begin.keys()).filter(k => end.has(k));
    const rows = keys.map(k => {
      const b = Number(begin.get(k)?.qty || 0);
      const e = Number(end.get(k)?.qty || 0);
      const p = Number(ordered.get(k)?.qty || 0);
      const name = begin.get(k)?.name || ordered.get(k)?.name || end.get(k)?.name || '';
      const unit = begin.get(k)?.unit || ordered.get(k)?.unit || end.get(k)?.unit || '';
      const u = Math.max(0, b + p - e);
      return { name, unit, b, p, e, u };
    }).sort((a, b) => b.u - a.u);
    return rows;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8 2xl:p-12" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full">
        {/* Header */}
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
          <div>
            <h1 className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('monthly_dashboard')}
            </h1>
            <p className={`text-gray-600 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('dashboard_greeting', { name: (user.acting_as_user_name || user.full_name) })}
            </p>
          </div>
          <div className={`flex flex-wrap gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {!isPwaInstalled && (
              installPromptEvent ? (
                <Button
                  variant="outline"
                  onClick={handlePwaInstall}
                  className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Download className="w-4 h-4" />
                  {language === 'he' ? 'התקן אפליקציה' : 'Install App'}
                </Button>
              ) : (
                isIOS && (
                  <Button
                    variant="outline"
                    onClick={() => setShowIosGuide(true)}
                    className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Share className="w-4 h-4" />
                    {language === 'he' ? 'הוסף למסך הבית' : 'Add to Home Screen'}
                  </Button>
                )
              )
            )}
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const res = await base44.functions.invoke('syncPOSData', {});
                  if (res.data?.success) {
                    window.location.reload();
                  } else {
                    alert(language === 'he' ? 'שגיאה בייבוא מ-POS: ' + (res.data?.error || '') : 'Error syncing POS: ' + (res.data?.error || ''));
                  }
                } catch (e) {
                  alert(language === 'he' ? 'שגיאה: ' + e.message : 'Error: ' + e.message);
                }
              }}
              className="bg-white flex items-center gap-2"
            >
              🔄 {language === 'he' ? 'ייבוא מ-POS' : 'Sync POS'}
            </Button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40 cursor-pointer px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const date = moment().subtract(i, 'months');
                return (
                  <option key={date.format('YYYY-MM')} value={date.format('YYYY-MM')}>
                    {date.format('YYYY-MM')}
                  </option>
                );
              })}
            </select>
            {!editMode ? (
              <Button onClick={() => setEditMode(true)} variant="outline" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Edit2 className="w-4 h-4" />
                {t('edit')}
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 bg-gray-900 hover:bg-gray-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('save')}
              </Button>
            )}
          </div>
        </div>

        <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'he' ? 'הוספת האפליקציה למסך הבית' : 'Add the app to your Home Screen'}</DialogTitle>
              <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                {language === 'he' ? 'באייפון/iPad אין כפתור התקנה אוטומטי. עקבו אחרי השלבים:' : 'On iPhone/iPad there is no automatic install prompt. Follow these steps:'}
              </DialogDescription>
            </DialogHeader>
            <div className={`space-y-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-3">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a006cfeba8053be10f189/b1f6773e1_IMG_0299.png" alt="App Icon" className="h-10 w-10 rounded-lg border" />
                <span className="text-gray-600">{language === 'he' ? 'האייקון שיופיע במסך הבית' : 'This is the icon that will appear on your home screen.'}</span>
              </div>
              <ol className="list-decimal ml-5 space-y-2 rtl:mr-5 rtl:ml-0">
                <li>{language === 'he' ? 'לחצו על כפתור השיתוף בספארי (ריבוע עם חץ למעלה).' : 'Tap the Share button in Safari (square with an up arrow).'}</li>
                <li>{language === 'he' ? 'גללו ובחרו "הוסף למסך הבית".' : 'Scroll and choose "Add to Home Screen".'}</li>
                <li>{language === 'he' ? 'אשרו עם "הוסף".' : 'Confirm by tapping "Add".'}</li>
              </ol>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={consultPopupOpen} onOpenChange={setConsultPopupOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'he' ? 'המלצה לייעוץ' : 'Consider our consulting service'}</DialogTitle>
              <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                {language === 'he' ? 'שכר הדירה מעל 7% או עלות מזון + עבודה מעל 60%.' : 'Your rent is above 7% or food cost + labor cost is above 60%.'}
              </DialogDescription>
            </DialogHeader>
            <p className={isRTL ? 'text-right' : 'text-left'}>
              {language === 'he' ? 'למידע נוסף: ' : 'For more details: '}<a href="mailto:admin@smartplate.org" className="text-[#d4a373] underline">admin@smartplate.org</a>
            </p>
          </DialogContent>
        </Dialog>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-2xl">
            <TabsTrigger value="actual" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {language === 'he' ? 'ביצוע בפועל' : 'Actual Performance'}
            </TabsTrigger>
            <TabsTrigger value="afc" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {language === 'he' ? 'דוח AFC' : 'AFC Report'}
            </TabsTrigger>
          </TabsList>

          {/* Actual Performance Tab */}
          <TabsContent value="actual" className="space-y-6">
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
              <div className="text-sm text-gray-600">
                {language === 'he' ? 'בחר חודש:' : 'Select month:'}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-36 cursor-pointer px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {Array.from({ length: 18 }, (_, i) => {
                    const date = moment().subtract(i, 'months');
                    return (
                      <option key={date.format('YYYY-MM')} value={date.format('YYYY-MM')}>
                        {date.format('YYYY-MM')}
                      </option>
                    );
                  })}
                </select>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Input 
                    type="url" 
                    placeholder={language === 'he' ? 'הדבק קישור (למשל Rosa)...' : 'Paste external link...'} 
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    className="w-48 h-8 text-sm"
                  />
                  <Button 
                    onClick={handleSyncFromLink}
                    disabled={syncingExternal || !externalLink}
                    size="sm"
                    className={`flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-full px-4 transition-all hover:shadow-md ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    {syncingExternal ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {language === 'he' ? 'סנכרן מקישור' : 'Sync from Link'}
                  </Button>
                </div>
                <Button 
                  onClick={handleImportFromSheet}
                  disabled={importingData}
                  size="sm"
                  className={`flex items-center gap-1.5 bg-[#0f9d58] hover:bg-[#0b8043] text-white shadow-sm rounded-full px-4 transition-all hover:shadow-md ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {importingData ? <Loader className="w-4 h-4 animate-spin" /> : (
                    <div className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                  )}
                  {language === 'he' ? 'ייבוא מ-Sheets' : 'Import Sheets'}
                </Button>
                <Button 
                  onClick={handleExportMonthlyReport}
                  disabled={exportingMonthly}
                  size="sm"
                  className={`flex items-center gap-1.5 bg-[#0f9d58] hover:bg-[#0b8043] text-white shadow-sm rounded-full px-4 transition-all hover:shadow-md ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {exportingMonthly ? <Loader className="w-4 h-4 animate-spin" /> : (
                    <div className="flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                  )}
                  {language === 'he' ? 'ייצוא ל-Sheets' : 'Export Sheets'}
                </Button>
              </div>
            </div>

            {/* Sales banner + advisory */}
            <div className={`flex flex-col md:flex-row ${isRTL ? 'md:flex-row-reverse' : ''} gap-4`}>
              {/* Advisory box (left of sales on desktop) */}
              {showConsulting && (
                <div className="md:w-1/2 w-full">
                  <div className="h-full bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center">
                    <p className={`text-rose-700 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {language === 'he'
                        ? 'אם שכר הדירה גבוה מ-7% או עלות המזון + עלות העבודה מעל 60%, שקלו להשתמש בשירות הייעוץ שלנו — לפרטים נוספים: admin@smartplate.org'
                        : 'If your rent is above 7% or food cost + labor cost is above 60%, consider using our consulting service — for more details email us: admin@smartplate.org'}
                    </p>
                  </div>
                </div>
              )}
              {/* Sales banner */}
              <div className={showConsulting ? "md:w-1/2 w-full" : "w-full"}>
                <Card className="bg-gradient-to-br from-amber-100 to-yellow-100 border border-amber-200">
                  <CardContent className={`py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="text-sm font-semibold text-amber-800">
                      {language === 'he' ? 'מכירות חודשיות' : 'Monthly Sales'}
                    </div>
                    <div className="text-3xl font-extrabold text-amber-900 mt-1">
                      {formatCurrency(actualSales)}
                    </div>
                    <div className="text-xs text-amber-700 mt-1">
                      {language === 'he' ? 'כולל מסעדה + משלוחים (כולל מע״מ)' : 'Dine-in + delivery (incl. VAT)'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Daily Average (MTD) */}
            <Card>
              <CardContent className={`py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="text-sm font-semibold text-gray-700">
                  {language === 'he' ? 'ממוצע יומי (עד כה)' : 'Average Daily Sales (MTD)'}
                </div>
                <div className="text-2xl font-extrabold text-gray-900 mt-1">
                  {formatCurrency(projectionAvgPerDay)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {language === 'he'
                    ? `חושב לפי ${projectionDaysElapsed} ימים`
                    : `Computed over ${projectionDaysElapsed} days`}
                </div>
              </CardContent>
            </Card>



            {/* Monthly Rent (incl. VAT) + 7% Check */}
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle>{language === 'he' ? 'שכר דירה חודשי (כולל מע"מ)' : 'Monthly Rent (incl. VAT)'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                  <div className="space-y-2">
                    <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                      {language === 'he' ? 'סכום שכר דירה' : 'Rent Amount'}
                    </Label>
                    <Input
                      type="number"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={`text-lg font-bold ${isRTL ? 'text-right' : 'text-left'}`}
                      disabled={!editMode}
                    />
                    {editMode && (
                      <Button onClick={handleSave} disabled={saving} className="mt-2">
                        {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {language === 'he' ? ' שמור' : ' Save'}
                      </Button>
                    )}
                  </div>
                  <div className={`bg-gray-50 rounded-lg p-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="text-sm text-gray-600">
                      {language === 'he' ? 'תחזית מכירות (כולל מע"מ)' : 'Projected Sales (incl. VAT)'}
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(projectedSalesInclVAT)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {language === 'he' ? `חושב לפי ${projectionDaysElapsed} ימים מדווחים` : `Based on ${projectionDaysElapsed} reported days`}
                    </div>
                  </div>
                  <div className={`${isRentAbove7 ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'} rounded-lg p-3 border`}>
                    <div className={`text-sm ${isRentAbove7 ? 'text-red-700' : 'text-green-700'}`}>
                      {language === 'he' ? 'שכר דירה כאחוז מהמכירות' : 'Rent as % of sales'}
                    </div>
                    <div className={`text-2xl font-extrabold ${isRentAbove7 ? 'text-red-700' : 'text-green-700'}`}>
                      {rentPercentOfSales.toFixed(1)}%
                    </div>
                    <div className="mt-1">
                      <Badge className={isRentAbove7 ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}>
                        {isRentAbove7 ? (language === 'he' ? 'מעל 7%' : 'Above 7%') : (language === 'he' ? 'מתחת ל-7%' : 'Within 7%')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calculated Costs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 text-white">
                <CardHeader>
                  <CardTitle className={`text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'עלויות עבודה מסידור עבודה' : 'Labor Cost (from Schedules)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {formatCurrency(effectiveLaborCost)}
                  </div>
                  <div className={`text-gray-300 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {actualLaborPercent.toFixed(1)}% {language === 'he' ? 'מהמכירות החודשיות (ללא מע\"מ)' : 'of monthly sales (excl. VAT)'}
                  </div>

                  {/* Manual override controls - always visible inside this card */}
                  <div className={`mt-3 space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Switch checked={useManualLabor} onCheckedChange={(val) => { 
                        setUseManualLabor(val); 
                        autoSaveManualLabor(manualLaborCost, val); 
                      }} />
                      <span className="text-sm">{language === 'he' ? 'השתמש בעלות מוזנת/מיובאת' : 'Use imported/manual labor cost'}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Input
                        type="number"
                        value={manualLaborCost}
                        onChange={(e) => { 
                          const v = parseFloat(e.target.value) || 0; 
                          setManualLaborCost(v); 
                          if (!useManualLabor) setUseManualLabor(true); 
                          autoSaveManualLabor(v, true); 
                        }}
                        placeholder="0"
                        className={`w-48 bg-white/10 border-white/20 ${isRTL ? 'text-right' : 'text-left'}`}
                      />
                    </div>
                    {useManualLabor && (
                      <div className={`text-xs text-yellow-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div>{language === 'he' ? 'מצב מותאם אישית (הוזן ידנית או ע"י קישור) — נשמר אוטומטית' : 'Custom override (Manual or Link) — auto-saved'}</div>
                        {manualLaborLastUpdated && (
                          <div className="text-white/70 mt-1" dir={isRTL ? 'rtl' : 'ltr'}>
                            {language === 'he' ? 'עודכן לאחרונה: ' : 'Last updated: '}
                            {moment(manualLaborLastUpdated).format('DD/MM/YYYY HH:mm')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`text-gray-400 text-xs mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? `סה"כ עלות עבודה כולל עלויות מעסיק בתקופה ${selectedMonth}` : `Total labor cost incl. employer costs for ${selectedMonth}`}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-600 to-gray-700 text-white">
                <CardHeader>
                  <CardTitle className={`text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'קבלות אספקה (ללא מע"מ)' : 'Supply Receipts (excl. VAT)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {formatCurrency(calculatedFoodCost)}
                  </div>
                  <div className={`text-gray-200 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {actualFoodPercent.toFixed(1)}% {language === 'he' ? 'מהמכירות (ללא מע"מ)' : 'of sales (excl. VAT)'}
                  </div>

                  {/* Manual override controls */}
                  <div className={`mt-3 space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Switch checked={useManualFood} onCheckedChange={setUseManualFood} />
                      <span className="text-sm">{language === 'he' ? 'השתמש בעלות מזון ידנית' : 'Use manual food cost'}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Input
                        type="number"
                        value={manualFoodCost}
                        onChange={(e) => { const v = parseFloat(e.target.value) || 0; setManualFoodCost(v); if (!useManualFood) setUseManualFood(true); }}
                        placeholder="0"
                        className={`w-48 bg-white/10 border-white/20 ${isRTL ? 'text-right' : 'text-left'}`}
                      />
                    </div>
                    {useManualFood && (
                      <div className={`text-xs text-yellow-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {language === 'he' ? 'מצב ידני — נשמר לחודש שנבחר למעלה' : 'Manual mode — saved for the selected month'}
                      </div>
                    )}
                  </div>

                  <div className={`text-gray-400 text-xs mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'סה"כ קבלות אספקה מתחילת החודש' : 'Total supply receipts from month start'}
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${isOverGoal ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white`}>
                <CardHeader>
                  <CardTitle className={`text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'אחוז עלויות משולב' : 'Combined Cost %'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {actualCombinedPercent.toFixed(1)}%
                  </div>
                  <div className={`text-sm flex items-center gap-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                    {isOverGoal ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isOverGoal 
                      ? (language === 'he' ? 'מעל היעד ב-' : 'Over goal by ')
                      : (language === 'he' ? 'מתחת ליעד ב-' : 'Under goal by ')
                    }
                    {Math.abs(actualCombinedPercent - combinedGoalPercent).toFixed(1)}%
                  </div>
                  <div className={`text-white/80 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'יעד:' : 'Goal:'} {combinedGoalPercent.toFixed(0)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'he' ? 'פילוח עלויות' : 'Cost Breakdown'}
                </CardTitle>
              </CardHeader>
              <CardContent>
            ...
              </CardContent>
            </Card>

            {/* Category Report (Image/PDF → Percent of Total) */}
            <Card>
              <CardHeader>
                <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'he' ? 'דוח קטגוריות (מתמונה/‏PDF)' : 'Category Report (from Image/PDF)'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCategoryImageChange(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />
                  {categoryScanLoading && <Loader className="w-4 h-4 animate-spin text-[#d4a373]" />}
                </div>
                {categoryScanError && (
                  <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{categoryScanError}</p>
                )}

                {categoryChart.length > 0 ? (
                  <div className="mt-6">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={categoryChart}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                        >
                          {categoryChart.map((_, idx) => (
                            <Cell key={idx} fill={["#1f2937","#6b7280","#0ea5e9","#22c55e","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#f97316","#a3e635"][idx % 10]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className={`text-sm text-gray-500 mt-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'העלה צילום/‏PDF ברור של דוח קטגוריות (כולל שמות קטגוריות וסכומים/אחוזים) כדי לראות פילוח באחוזים' : 'Upload a clear image/PDF of the category report (with category names and amounts/percents) to see percent-of-total breakdown.'}
                  </p>
                )}
              </CardContent>
            </Card>
            </TabsContent>






          {/* Labor Goals Tab removed */}

          {/* AFC Report Tab */}
          <TabsContent value="afc" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" onClick={handleGenerateAfcSheet} className="gap-2 h-9">
                    <FileSpreadsheet className="w-4 h-4" />
                    {language === 'he' ? 'צור גיליון AFC' : 'Generate AFC Sheet'}
                  </Button>
                  {lastAfcSheetId && (
                    <Button variant="outline" onClick={() => openSheetsApp(lastAfcSheetId, lastAfcSheetUrl)} className="gap-2 h-9">
                      <FileSpreadsheet className="w-4 h-4" />
                      {language === 'he' ? 'פתח באפליקציית Sheets' : 'Open in Sheets App'}
                    </Button>
                  )}
                  <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
                    {language === 'he' ? 'דוח AFC' : 'AFC Report'}
                  </CardTitle>
                </div>
                <div className={`mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs text-gray-500">
                    {language === 'he' ? 'מייצר Google Sheet עם 3 עמודות: פריט, יחידה, שימוש' : 'Generates Google Sheet with 3 columns: Item, Unit, Usage'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                  <div className="space-y-2">
                    <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                      {language === 'he' ? 'ספירת פתיחה' : 'Start Count'}
                    </Label>
                    <Select value={selectedStartCountId} onValueChange={setSelectedStartCountId}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'he' ? 'בחר ספירת פתיחה' : 'Choose start count'} />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryCounts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {moment(c.count_date).format('YYYY-MM-DD')} • {c.name || (language === 'he' ? 'ללא שם' : 'No name')} • {formatCurrency(c.total_inventory_value || 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                      {language === 'he' ? 'ספירת סיום' : 'End Count'}
                    </Label>
                    <Select value={selectedEndCountId} onValueChange={setSelectedEndCountId}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'he' ? 'בחר ספירת סיום' : 'Choose end count'} />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryCounts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {moment(c.count_date).format('YYYY-MM-DD')} • {c.name || (language === 'he' ? 'ללא שם' : 'No name')} • {formatCurrency(c.total_inventory_value || 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-600">{language === 'he' ? 'מלאי פתיחה' : 'Opening Inventory'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(startVal)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-600">{language === 'he' ? 'אספקה שהתקבלה (ללא מע"מ)' : 'Supplies Accepted (excl. VAT)'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(suppliesAccepted)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-600">{language === 'he' ? 'מלאי סגירה' : 'Closing Inventory'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(endVal)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-600">{language === 'he' ? 'מכירות (ללא מע"מ)' : 'Sales (excl. VAT)'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(actualSalesExVAT)}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className={`bg-gradient-to-br ${afcPercent > 35 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white`}>
                  <CardContent className="py-8">
                    <div className={`text-center`}>
                      <div className="text-5xl font-extrabold tracking-tight">{afcPercent.toFixed(1)}%</div>
                      <div className="mt-2 text-white/90 text-lg">שימוש סחורות בפועל - לא סתם קניינות</div>
                      <div className="mt-4 text-sm text-white/80">
                        {language === 'he' ? 'חישוב: מלאי פתיחה + אספקה - מלאי סגירה' : 'Formula: Opening + Supplies - Closing'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-600">{language === 'he' ? 'שימוש בסחורה (₪)' : 'Goods Used (₪)'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(afcUsage)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-600">{language === 'he' ? 'יחס לשוק' : 'Benchmark Note'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-700">{language === 'he' ? 'יעד מסעדות נפוץ: 28%–32% (משתנה לפי סוג העסק)' : 'Common target: 28%–32% (varies by concept)'}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-600">{language === 'he' ? 'בחירת חודש' : 'Selected Month'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{selectedMonth}</div>
                    </CardContent>
                  </Card>
                </div>
                </CardContent>
                </Card>

                <Card>
                <CardHeader>
                <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'he' ? 'פירוט שימוש לפי פריט' : 'Per-Item Usage Breakdown'}
                </CardTitle>
                </CardHeader>
                <CardContent>
                {(!selectedStartCountId || !selectedEndCountId) ? (
                  <div className={isRTL ? 'text-right text-gray-500' : 'text-left text-gray-500'}>
                    {language === 'he' ? 'בחר ספירת פתיחה וסיום כדי לראות פירוט לפי פריט' : 'Choose start and end counts to see per-item usage'}
                  </div>
                ) : (itemUsageRows.length === 0 ? (
                  <div className={isRTL ? 'text-right text-gray-500' : 'text-left text-gray-500'}>
                    {language === 'he' ? 'אין פריטים להצגה' : 'No items to display'}
                  </div>
                ) : (
                  <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'he' ? 'פריט' : 'Item'}</TableHead>
                          <TableHead className="w-24">{language === 'he' ? 'יחידה' : 'Unit'}</TableHead>
                          <TableHead className="text-right">{language === 'he' ? 'פתיחה' : 'Begin'}</TableHead>
                          <TableHead className="text-right">{language === 'he' ? 'הזמנות' : 'Orders'}</TableHead>
                          <TableHead className="text-right">{language === 'he' ? 'סגירה' : 'End'}</TableHead>
                          <TableHead className="text-right">{language === 'he' ? 'שימוש' : 'Usage'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemUsageRows.map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="whitespace-nowrap">{r.name}</TableCell>
                            <TableCell className="whitespace-nowrap">{r.unit}</TableCell>
                            <TableCell className="text-right">{Number(r.b).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{Number(r.p).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{Number(r.e).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold">{Number(r.u).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                </CardContent>
                </Card>
                </TabsContent>


          </Tabs>
      </div>


    </div>
  );
}