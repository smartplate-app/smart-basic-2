import React, { useState } from "react";
import { useLanguage } from "../components/LanguageProvider";
import TipEntryForm from "../components/tips/TipEntryForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import moment from "moment";

export default function TipsPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));

  const handlePrevDay = () => {
    setSelectedDate(moment(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'));
  };

  const handleNextDay = () => {
    setSelectedDate(moment(selectedDate).add(1, 'day').format('YYYY-MM-DD'));
  };

  const handleToday = () => {
    setSelectedDate(moment().format('YYYY-MM-DD'));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-4xl mx-auto">
        <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'he' ? 'ניהול טיפים' : 'Tip Management'}
          </h1>
          
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button variant="outline" size="icon" onClick={handlePrevDay}>
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={handleToday} className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {moment(selectedDate).format('DD/MM/YYYY')}
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextDay}>
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <TipEntryForm 
          selectedDate={selectedDate} 
          onSave={() => {
            // Optionally reload or show success
          }}
        />
      </div>
    </div>
  );
}