import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Calendar, Clock, MapPin } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

export default function WorkerSchedulePage() {
  const { t, language } = useLanguage();
  const [worker, setWorker] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWorkerSchedule = async () => {
      try {
        setLoading(true);
        
        // Get worker ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const workerId = urlParams.get('worker_id');
        const scheduleId = urlParams.get('schedule_id');

        if (!workerId || !scheduleId) {
          setError(language === 'he' ? 'קישור לא תקין' : 'Invalid link');
          return;
        }

        // Load worker and schedule
        const [workerData, scheduleData] = await Promise.all([
          base44.entities.Worker.get(workerId),
          base44.entities.WeeklySchedule.get(scheduleId)
        ]);

        if (!workerData || !scheduleData) {
          setError(language === 'he' ? 'נתונים לא נמצאו' : 'Data not found');
          return;
        }

        setWorker(workerData);
        setSchedule(scheduleData);
      } catch (err) {
        console.error('Error loading worker schedule:', err);
        setError(language === 'he' ? 'שגיאה בטעינת הנתונים' : 'Error loading data');
      } finally {
        setLoading(false);
      }
    };

    loadWorkerSchedule();
  }, [language]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-purple-600" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 text-lg">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const days = language === 'he'
    ? ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const dayLabels = language === 'he'
    ? ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Filter shifts for this worker
  const myShifts = (schedule.shifts || []).filter(s => s.worker_id === worker.id);

  // Group shifts by day
  const shiftsByDay = {};
  days.forEach(day => {
    shiftsByDay[day] = myShifts.filter(s => s.day === day);
  });

  const weekStart = new Date(schedule.week_start_date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const totalHours = myShifts.reduce((sum, shift) => sum + (shift.hours_worked || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">
                  {language === 'he' ? 'לוח המשמרות שלי' : 'My Work Schedule'}
                </CardTitle>
                <p className="text-purple-100 text-lg">{worker.full_name}</p>
                <p className="text-purple-200 text-sm">{worker.job_position_name}</p>
              </div>
              <Calendar className="w-16 h-16 opacity-80" />
            </div>
          </CardHeader>
        </Card>

        {/* Week Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">
                    {language === 'he' ? 'שבוע' : 'Week'}
                  </p>
                  <p className="font-semibold">
                    {weekStart.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
                      day: 'numeric',
                      month: 'short'
                    })} - {weekEnd.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">
                    {language === 'he' ? 'סה"כ שעות' : 'Total Hours'}
                  </p>
                  <p className="font-semibold text-2xl text-blue-600">
                    {totalHours.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Schedule */}
        <div className="space-y-4">
          {days.map((day, index) => {
            const dayShifts = shiftsByDay[day];
            const hasShifts = dayShifts && dayShifts.length > 0;
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + index);

            return (
              <Card key={day} className={hasShifts ? 'border-2 border-purple-200' : 'bg-gray-50'}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {dayLabels[index]}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {dayDate.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>
                    {hasShifts && (
                      <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {dayShifts.length} {dayShifts.length === 1 
                          ? (language === 'he' ? 'משמרת' : 'shift')
                          : (language === 'he' ? 'משמרות' : 'shifts')}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {hasShifts ? (
                    <div className="space-y-3">
                      {dayShifts.map((shift, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border-2 border-purple-100">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-purple-600" />
                              <span className="font-semibold text-purple-900">
                                {shift.job_position}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="font-mono font-semibold text-lg">
                                {shift.start_time} - {shift.end_time}
                              </span>
                            </div>
                            <span className="text-gray-600">
                              ({shift.hours_worked?.toFixed(1)} {language === 'he' ? 'שעות' : 'hours'})
                            </span>
                          </div>
                          {shift.notes && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-sm text-gray-600">{shift.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      {language === 'he' ? 'אין משמרות' : 'No shifts'}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}