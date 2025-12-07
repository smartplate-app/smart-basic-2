import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';
import moment from 'moment';

// Set week to start on Sunday (Israel standard)
moment.updateLocale('en', {
  week: {
    dow: 0,
  }
});

export default function TheoreticalSchedule({ weekStartDate, workers, positions }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  useEffect(() => {
    loadRequests();
  }, [weekStartDate]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      const workingEmail = user.acting_as_store_email || user.email;
      const data = await base44.entities.WorkerRequest.filter({
        created_by: workingEmail,
        week_start_date: weekStartDate
      });
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const dayLabels = {
    sunday: language === 'he' ? 'ראשון' : 'Sunday',
    monday: language === 'he' ? 'שני' : 'Monday',
    tuesday: language === 'he' ? 'שלישי' : 'Tuesday',
    wednesday: language === 'he' ? 'רביעי' : 'Wednesday',
    thursday: language === 'he' ? 'חמישי' : 'Thursday',
    friday: language === 'he' ? 'שישי' : 'Friday',
    saturday: language === 'he' ? 'שבת' : 'Saturday'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="border-orange-300">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{language === 'he' ? 'אין בקשות לשבוע זה. עבור לטאב "בקשות" כדי להוסיף בקשות.' : 'No requests for this week. Go to "Requests" tab to add requests.'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
          <AlertTriangle className="w-5 h-5" />
          {language === 'he' ? 'לוח תיאורטי - מבוסס בקשות בלבד' : 'Theoretical Schedule - Based on Requests Only'}
        </CardTitle>
        <p className={`text-sm text-orange-100 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {language === 'he' ? 'חורים בלוח מסמנים תפקידים שאף אחד לא ביקש לעבוד בהם' : 'Gaps show positions where nobody requested to work'}
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className={`border p-2 text-sm font-semibold ${isRTL ? 'text-right' : 'text-left'} w-32`}>
                  {language === 'he' ? 'תפקיד' : 'Position'}
                </th>
                {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                  <th key={day} className="border p-2 text-sm font-semibold min-w-[120px]">
                    <div className="flex flex-col gap-1">
                      <div>{dayLabels[day]}</div>
                      <div className="text-xs text-gray-500 font-normal">
                        {moment(weekStartDate).day(day === 'sunday' ? 0 : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day) + 1).format('DD/MM')}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map(position => {
                const positionRequests = requests.filter(r => r.job_position_id === position.id || r.job_position_name === position.name);
                
                // Show all positions, even those with no requests
                return (
                  <tr key={position.id}>
                    <td className={`border p-2 font-medium bg-gray-50 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {position.name}
                    </td>
                    {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => {
                      const dayRequests = positionRequests.filter(r => r.day_of_week === day);
                      
                      return (
                        <td key={`${position.id}-${day}`} className="border p-1">
                          {dayRequests.length === 0 ? (
                            <div className="bg-red-100 border-2 border-red-300 rounded p-2 text-center min-h-[60px] flex items-center justify-center">
                              <span className="text-red-700 font-bold text-xs">
                                {language === 'he' ? '⚠️ חור בכיסוי!' : '⚠️ Gap!'}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {dayRequests.map((req, idx) => (
                                <div key={idx} className="bg-green-100 p-2 rounded text-xs border border-green-300">
                                  <div className="font-semibold text-gray-900">{req.worker_name}</div>
                                  <div className="text-xs text-gray-600">
                                    {req.start_time} - {req.end_time}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className={`mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-sm text-orange-800 font-medium">
            {language === 'he' 
              ? '💡 חורים אדומים מסמנים תפקידים וימים שבהם לא התקבלה אף בקשה - שימו לב למקומות אלו!' 
              : '💡 Red gaps indicate positions and days where no requests were received - pay attention to these spots!'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}