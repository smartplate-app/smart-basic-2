import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, MessageCircle, ShoppingCart, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageProvider';
import { base44 } from '@/api/base44Client';

export default function OnboardingModal({ user }) {
  const { language } = useLanguage();
  const isHe = language === 'he';
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const checkFirstTime = async () => {
      const key = `b44_onboarding_seen_${user.email}`;
      if (!localStorage.getItem(key)) {
        // Check if they have any suppliers to safely determine if they are truly new
        try {
          const suppliers = await base44.entities.Supplier.list();
          if (suppliers.length === 0) {
            setOpen(true);
          } else {
            localStorage.setItem(key, '1');
          }
        } catch (e) {
          setOpen(true);
        }
      }
      setLoading(false);
    };
    checkFirstTime();
  }, [user]);

  useEffect(() => {
    const handleTestEvent = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener('b44_test_onboarding', handleTestEvent);
    return () => window.removeEventListener('b44_test_onboarding', handleTestEvent);
  }, []);

  const handleClose = () => {
    setOpen(false);
    if (user) {
      localStorage.setItem(`b44_onboarding_seen_${user.email}`, '1');
    }
  };

  const steps = [
    {
      id: 'welcome',
      icon: <ShoppingCart className="w-16 h-16 text-blue-500" />,
      title: isHe ? 'ברוכים הבאים ל-Smart Plate!' : 'Welcome to Smart Plate!',
      description: isHe 
        ? 'רוצים לבצע הזמנה חדשה מספק? בואו נראה איך עושים את זה בכמה שלבים פשוטים.' 
        : 'Want to make a new order from a supplier? Let\'s see how to do it in a few simple steps.',
    },
    {
      id: 'supplier',
      icon: <Users className="w-16 h-16 text-indigo-500" />,
      title: isHe ? '1. הוספת ספק' : '1. Add a Supplier',
      description: isHe 
        ? 'תחילה עליכם להוסיף ספק למערכת. זה הספק שממנו תרצו להזמין.' 
        : 'First, you need to add a supplier to the system. This is who you will be ordering from.',
    },
    {
      id: 'items',
      icon: <FileSpreadsheet className="w-16 h-16 text-green-500" />,
      title: isHe ? '2. הוספת פריטים בקלות' : '2. Adding Items is Easy',
      description: isHe 
        ? 'בחרו אם להוסיף את הפריט הראשון ידנית, או לייצר גיליון גוגל (Google Sheet) ולהקליד שם את כל הפריטים, המחירים והיחידות. המערכת תמשוך אותם אוטומטית לכרטיס הספק!' 
        : 'Choose to either manually add the first item, or generate a Google Sheet to type in all items, prices, and units, and that will automatically paste it into the supplier card and items!',
    },
    {
      id: 'order',
      icon: <MessageCircle className="w-16 h-16 text-green-600" />,
      title: isHe ? '3. שליחת הזמנה בוואטסאפ' : '3. Send Order via WhatsApp',
      description: isHe 
        ? 'אחרי שהכל מוכן, תוכלו ליצור הזמנה חדשה, להוסיף פריטים לעגלה, ולשלוח את ההזמנה ישירות לספק בוואטסאפ בקליק אחד!' 
        : 'After everything is set, you can create a new order, add a couple of items to your cart, and send it directly to the supplier by WhatsApp with one click!',
    }
  ];

  if (loading || !open) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden outline-none">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 flex flex-col items-center justify-center min-h-[340px] text-center relative" dir={isHe ? 'rtl' : 'ltr'}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: isHe ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isHe ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center w-full"
            >
              <div className="mb-6 bg-white p-5 rounded-full shadow-md border border-blue-100">
                {steps[step].icon}
              </div>
              <DialogTitle className="text-2xl font-extrabold text-gray-900 mb-4">
                {steps[step].title}
              </DialogTitle>
              <p className="text-gray-700 text-lg leading-relaxed max-w-sm">
                {steps[step].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="absolute bottom-6 flex gap-2" dir="ltr">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-2.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-600' : 'w-2.5 bg-blue-200'}`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="p-4 bg-white border-t sm:justify-between flex-row items-center gap-4" dir={isHe ? 'rtl' : 'ltr'}>
          <Button 
            variant="ghost" 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-800"
          >
            {isHe ? 'דלג על ההסבר' : 'Skip tutorial'}
          </Button>
          <Button 
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                handleClose();
              }
            }}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 min-w-[140px] gap-2"
          >
            {step < steps.length - 1 ? (
              <>
                {isHe ? 'הבא' : 'Next'}
                <ArrowRight className={`w-4 h-4 ${isHe ? 'rotate-180' : ''}`} />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                {isHe ? 'קדימה מתחילים!' : 'Let\'s Get Started!'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}