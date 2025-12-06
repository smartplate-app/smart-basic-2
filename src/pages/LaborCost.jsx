import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import NetworkErrorHandler from "../components/NetworkErrorHandler";
import moment from "moment";

import JobPositionsList from "../components/labor/JobPositionsList";
import WorkersList from "../components/labor/WorkersList";
import WeeklyScheduleView from "../components/labor/WeeklyScheduleView";
import LaborGoalsTab from "../components/labor/LaborGoalsTab";
import WorkerRequestManager from "../components/labor/WorkerRequestManager";

export default function LaborCostPage() {
  const [positions, setPositions] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("schedule");
  const [networkError, setNetworkError] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return moment().startOf('isoWeek').format('YYYY-MM-DD');
  });
  const { t, language } = useLanguage();

  const loadData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setNetworkError(false);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const user = await base44.auth.me();
      // Use acting_as_store_email if admin is controlling a user
      const workingEmail = user.acting_as_store_email || user.email;
      const [positionsData, workersData, schedulesData] = await Promise.all([
        base44.entities.JobPosition.filter({ created_by: workingEmail }, "name"),
        base44.entities.Worker.filter({ created_by: workingEmail }, "full_name"),
        base44.entities.WeeklySchedule.filter({ created_by: workingEmail }, "-week_start_date")
      ]);
      setPositions(positionsData);
      setWorkers(workersData);
      setSchedules(schedulesData);
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
    loadData();
  }, []);

  const handlePreviousWeek = () => {
    const prevWeek = moment(currentWeekStart).subtract(1, 'week').format('YYYY-MM-DD');
    setCurrentWeekStart(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = moment(currentWeekStart).add(1, 'week').format('YYYY-MM-DD');
    setCurrentWeekStart(nextWeek);
  };

  const handleToday = () => {
    setCurrentWeekStart(moment().startOf('isoWeek').format('YYYY-MM-DD'));
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('labor_cost_management')}</h1>
          <p className="text-gray-600 mt-2">{t('manage_workers_schedules')}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="schedule">{t('schedule')}</TabsTrigger>
            <TabsTrigger value="requests">{language === 'he' ? 'בקשות' : 'Requests'}</TabsTrigger>
            <TabsTrigger value="goals">{language === 'he' ? 'יעדים' : 'Goals'}</TabsTrigger>
            <TabsTrigger value="positions">{t('positions')}</TabsTrigger>
            <TabsTrigger value="workers">{t('workers')}</TabsTrigger>
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

          <TabsContent value="requests" className="space-y-6">
            <WorkerRequestManager
              weekStartDate={currentWeekStart}
              workers={workers}
              positions={positions}
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
        </Tabs>
      </div>
    </div>
  );
}