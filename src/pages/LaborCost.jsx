import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import NetworkErrorHandler from "../components/NetworkErrorHandler";
import { getCache, setCache, isStale } from "../components/utils/cache";
import moment from "moment";

// Set week to start on Sunday (Israel standard)
moment.updateLocale('en', {
  week: {
    dow: 0, // Sunday is the first day of the week
  }
});

import JobPositionsList from "../components/labor/JobPositionsList";
import WorkersList from "../components/labor/WorkersList";
import WeeklyScheduleView from "../components/labor/WeeklyScheduleView";
import LaborGoalsTab from "../components/labor/LaborGoalsTab";
import TipsSimulator from "../components/labor/TipsSimulator";
import TipPolicyEditor from "../components/labor/TipPolicyEditor";
import ImportLaborModal from "../components/labor/ImportLaborModal";
import { FileSpreadsheet } from "lucide-react";

export default function LaborCostPage() {
  const [positions, setPositions] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("schedule");
  const [networkError, setNetworkError] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return moment().startOf('week').format('YYYY-MM-DD');
  });
  const { t, language } = useLanguage();
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Hydrate from cache for instant UI
  useEffect(() => {
    const c = getCache('labor_v1');
    if (c?.data) {
      setPositions(c.data.positions || []);
      setWorkers(c.data.workers || []);
      setSchedules(c.data.schedules || []);
      setLoading(false);
    }
  }, []);

  const loadData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setNetworkError(false);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const user = await base44.auth.me();
      // Determine working email: use owner account when this user is a store sub-user
      let workingEmail = user.acting_as_store_email || user.acting_as_user_email || user.email;
      let ownerEmail = user.store_user_owner_email || null;
      if (!ownerEmail) {
        try {
          const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
          if (storeUserRecords.length > 0) ownerEmail = storeUserRecords[0].owner_email || null;
        } catch (_) {}
      }
      if (ownerEmail) {
        workingEmail = ownerEmail;
      }

      let headEmail = null;
      if (user.chain_id && !user.is_chain_head) {
        const chains = await base44.entities.Chain.filter({ id: user.chain_id });
        if (chains?.length) headEmail = chains[0].head_store_user_email;
      }

      let positionsData = [];
      let workersData = [];
      let schedulesData = [];
      
      const isAdminControlling = !!(user?.admin_original_email && user?.acting_as_user_email);
      
      if (isAdminControlling) {
          try {
              const { data } = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: workingEmail });
              if (data?.success) {
                  positionsData = data.data.positions || [];
                  workersData = data.data.workers || [];
                  schedulesData = data.data.schedules || [];
              }
          } catch(e) { console.error("Admin fetch error", e); }
      } else {
          const res = await Promise.all([
            base44.entities.JobPosition.filter({ created_by: headEmail || workingEmail }, "name"),
            base44.entities.Worker.filter({ created_by: workingEmail }, "full_name"),
            base44.entities.WeeklySchedule.filter({ created_by: workingEmail }, "-week_start_date")
          ]);
          positionsData = res[0];
          workersData = res[1];
          schedulesData = res[2];
      }
      
      setPositions(positionsData);
      setWorkers(workersData);
      setSchedules(schedulesData);
      setCache('labor_v1', { positions: positionsData, workers: workersData, schedules: schedulesData });
    } catch (error) {
      console.error("Error loading data:", error);
      
      if ((error.message === 'Network Error' || error.code === 'ERR_NETWORK') && retryCount < 3) {
        console.log(`Retrying data load... attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return loadData(retryCount + 1);
      }
      
      setNetworkError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedCode = localStorage.getItem('labor_passcode');
    if (savedCode === '2233') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const c = getCache('labor_v1');
      const stale = isStale(c, 180000);
      if (stale || !c?.data) {
        loadData();
      }
    }
  }, [isAuthenticated]);

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcode === '2233') {
      localStorage.setItem('labor_passcode', '2233');
      setIsAuthenticated(true);
    } else {
      alert(language === 'he' ? 'קוד שגוי' : 'Incorrect code');
      setPasscode('');
    }
  };

  const handlePreviousWeek = () => {
    const prevWeek = moment(currentWeekStart).subtract(1, 'week').format('YYYY-MM-DD');
    setCurrentWeekStart(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = moment(currentWeekStart).add(1, 'week').format('YYYY-MM-DD');
    setCurrentWeekStart(nextWeek);
  };

  const handleToday = () => {
    setCurrentWeekStart(moment().startOf('week').format('YYYY-MM-DD'));
  };

  const handleAddPosition = async (positionData) => {
    try {
      await base44.entities.JobPosition.create(positionData);
      await loadData();
    } catch (error) {
      console.error("Error adding position:", error);
      alert(t('error_saving'));
    }
  };

  const handleUpdatePosition = async (id, positionData) => {
    try {
      await base44.entities.JobPosition.update(id, positionData);
      await loadData();
    } catch (error) {
      console.error("Error updating position:", error);
      alert(t('error_saving'));
    }
  };

  const handleDeletePosition = async (id) => {
    if (!confirm(t('delete') + '?')) return;
    try {
      await base44.entities.JobPosition.delete(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting position:", error);
      alert(t('error_saving'));
    }
  };

  const handleAddWorker = async (workerData) => {
    try {
      await base44.entities.Worker.create(workerData);
      await loadData();
    } catch (error) {
      console.error("Error adding worker:", error);
      alert(t('error_saving'));
    }
  };

  const handleUpdateWorker = async (id, workerData) => {
    try {
      await base44.entities.Worker.update(id, workerData);
      await loadData();
    } catch (error) {
      console.error("Error updating worker:", error);
      alert(t('error_saving'));
    }
  };

  const handleDeleteWorker = async (id) => {
    if (!confirm(t('delete') + '?')) return;
    try {
      await base44.entities.Worker.delete(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting worker:", error);
      alert(t('error_saving'));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handlePasscodeSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            {language === 'he' ? 'הכנס קוד גישה' : 'Enter Passcode'}
          </h2>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full text-center text-2xl tracking-widest p-3 border-2 border-gray-200 rounded-lg mb-6 focus:border-purple-500 focus:outline-none transition-colors"
            placeholder="••••"
            maxLength={4}
            autoFocus
          />
          <Button type="submit" className="w-full h-12 text-lg bg-purple-600 hover:bg-purple-700">
            {language === 'he' ? 'כניסה' : 'Enter'}
          </Button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-purple-600" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (networkError) {
    return <NetworkErrorHandler onRetry={() => loadData()} />;
  }

  const isRTL = language === 'he';
  const weekEnd = moment(currentWeekStart).add(6, 'days');
  const isCurrentWeek = moment().isBetween(moment(currentWeekStart), weekEnd, null, '[]');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-4 md:p-8">
      <div className="w-full">
        <div className={`mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : ''}>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{language === 'he' ? 'סידור עבודה' : 'Weekly Schedule'}</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">{t('manage_workers_schedules')}</p>
          </div>
          <Button
            variant="outline"
            className="shrink-0 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700"
            onClick={() => setShowImportModal(true)}
          >
            <FileSpreadsheet className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'he' ? 'יבוא עובדים מ-Google Sheets' : 'Import Workers from Sheets'}
          </Button>
        </div>

        <ImportLaborModal 
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={loadData}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-5xl">
            <TabsTrigger value="schedule">{language === 'he' ? 'סידור עבודה' : 'Schedule'}</TabsTrigger>
            <TabsTrigger value="goals">{language === 'he' ? 'יעדים' : 'Goals'}</TabsTrigger>
            <TabsTrigger value="positions">{t('positions')}</TabsTrigger>
            <TabsTrigger value="workers">{t('workers')}</TabsTrigger>
            <TabsTrigger value="tips">{language === 'he' ? 'טיפים' : 'Tips'}</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            {/* Week Navigation */}
            <div className={`flex items-center justify-between bg-white rounded-lg shadow-sm p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="outline"
                onClick={handlePreviousWeek}
                className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {t('previous_week')}
              </Button>

              <div className="flex flex-col items-center gap-2">
                <div className={`flex items-center gap-2 text-lg font-semibold ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CalendarIcon className="w-5 h-5 text-purple-600" />
                  <span>
                    {moment(currentWeekStart).format('DD/MM/YYYY')} - {weekEnd.format('DD/MM/YYYY')}
                  </span>
                </div>
                {!isCurrentWeek && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToday}
                    className="text-xs"
                  >
                    {t('current_week')}
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                onClick={handleNextWeek}
                className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {t('next_week')}
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>

            <WeeklyScheduleView
              weekStartDate={currentWeekStart}
              schedules={schedules}
              workers={workers}
              positions={positions}
              onScheduleSaved={loadData}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <LaborGoalsTab />
          </TabsContent>

          <TabsContent value="positions" className="space-y-6">
            <JobPositionsList
              positions={positions}
              onAdd={handleAddPosition}
              onUpdate={handleUpdatePosition}
              onDelete={handleDeletePosition}
            />
          </TabsContent>

          <TabsContent value="workers" className="space-y-6">
            <WorkersList
              workers={workers}
              positions={positions}
              onAdd={handleAddWorker}
              onUpdate={handleUpdateWorker}
              onDelete={handleDeleteWorker}
            />
          </TabsContent>

          <TabsContent value="tips" className="space-y-6">
            <TipsSimulator />
            <TipPolicyEditor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}