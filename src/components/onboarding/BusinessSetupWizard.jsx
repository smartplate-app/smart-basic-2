import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '../LanguageProvider';
import { Store, MapPin, Percent, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BusinessSetupWizard({ user, onComplete, forceShow = false }) {
  const { language } = useLanguage();
  const isHe = language === 'he';
  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const [formData, setFormData] = useState({
    business_name: '',
    business_address: '',
    vat_percent: 17
  });

  useEffect(() => {
    if (forceShow) {
      setOpen(true);
      return;
    }

    if (!user) return;

    // Only show to head users (owners) who haven't completed this info
    const isOwner = !user.store_user_owner_email && !user.acting_as_store_email;
    const needsSetup = !user.business_name || !user.business_address || typeof user.vat_percent === 'undefined';

    if (isOwner && needsSetup) {
      setFormData({
        business_name: user.business_name || '',
        business_address: user.business_address || '',
        vat_percent: typeof user.vat_percent === 'number' ? user.vat_percent : 17
      });
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [user, forceShow]);

  const handleSubmit = async () => {
    if (!formData.business_name || !formData.business_address) {
      alert(isHe ? 'נא למלא את כל השדות' : 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      if (!forceShow) {
        await base44.auth.updateMe({
          business_name: formData.business_name,
          business_address: formData.business_address,
          vat_percent: Number(formData.vat_percent)
        });
        setOpen(false);
        setSuccessOpen(true);
      } else {
        setOpen(false);
        if (onComplete) onComplete();
      }
    } catch (e) {
      console.error(e);
      alert(isHe ? 'שגיאה בשמירת הנתונים' : 'Error saving data');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      id: 'name',
      title: isHe ? 'שם המסעדה' : 'Restaurant Name',
      desc: isHe ? 'איך קוראים לעסק שלך?' : 'What is the name of your business?',
      icon: <Store className="w-12 h-12 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <Label className="text-lg">{isHe ? 'שם המסעדה' : 'Restaurant Name'}</Label>
          <Input 
            value={formData.business_name} 
            onChange={(e) => setFormData({...formData, business_name: e.target.value})}
            placeholder={isHe ? 'לדוגמה: קפה רוטשילד' : 'e.g. Central Cafe'}
            className="text-lg py-6"
          />
        </div>
      )
    },
    {
      id: 'address',
      title: isHe ? 'כתובת המסעדה' : 'Restaurant Address',
      desc: isHe ? 'היכן העסק ממוקם?' : 'Where is your business located?',
      icon: <MapPin className="w-12 h-12 text-green-500" />,
      content: (
        <div className="space-y-4">
          <Label className="text-lg">{isHe ? 'כתובת מלאה' : 'Full Address'}</Label>
          <Input 
            value={formData.business_address} 
            onChange={(e) => setFormData({...formData, business_address: e.target.value})}
            placeholder={isHe ? 'לדוגמה: רוטשילד 1, תל אביב' : 'e.g. 123 Main St, New York'}
            className="text-lg py-6"
          />
        </div>
      )
    },
    {
      id: 'vat',
      title: isHe ? 'מע"מ (VAT)' : 'VAT Percentage',
      desc: isHe ? 'מהו אחוז המע"מ במדינה שלך?' : 'What is the VAT % in your country?',
      icon: <Percent className="w-12 h-12 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <Label className="text-lg">{isHe ? 'אחוז המע"מ' : 'VAT %'}</Label>
          <Input 
            type="number"
            value={formData.vat_percent} 
            onChange={(e) => setFormData({...formData, vat_percent: e.target.value})}
            className="text-lg py-6"
          />
        </div>
      )
    }
  ];

  if (!open && !successOpen) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={() => {}}> {/* Prevent closing by clicking outside */}
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden outline-none">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 flex flex-col items-center justify-center min-h-[420px] text-center relative" dir={isHe ? 'rtl' : 'ltr'}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: isHe ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isHe ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center w-full"
            >
              <div className="mb-6 bg-white p-3 rounded-2xl shadow-md border border-blue-100 overflow-hidden">
                {steps[step].icon}
              </div>
              <DialogTitle className="text-2xl font-extrabold text-gray-900 mb-2">
                {steps[step].title}
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-lg mb-8">
                {steps[step].desc}
              </DialogDescription>
              
              <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-sm border text-left" dir={isHe ? 'rtl' : 'ltr'}>
                {steps[step].content}
              </div>
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

        <div className="p-4 bg-white border-t flex justify-between items-center" dir={isHe ? 'rtl' : 'ltr'}>
          <div className="text-sm text-gray-500 font-medium">
            {isHe ? `שלב ${step + 1} מתוך ${steps.length}` : `Step ${step + 1} of ${steps.length}`}
          </div>
          <div className="flex gap-3">
            {step > 0 && (
              <Button 
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                {isHe ? 'חזור' : 'Back'}
              </Button>
            )}
            <Button 
              onClick={() => {
                if (step < steps.length - 1) {
                  setStep(step + 1);
                } else {
                  handleSubmit();
                }
              }}
              disabled={loading || (step === 0 && !formData.business_name) || (step === 1 && !formData.business_address) || (step === 2 && (formData.vat_percent === '' || formData.vat_percent === null || formData.vat_percent === undefined))}
              className="bg-blue-600 hover:bg-blue-700 min-w-[100px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : step < steps.length - 1 ? (
                isHe ? 'הבא' : 'Next'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {isHe ? 'סיום' : 'Finish'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={successOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[400px] text-center" dir={isHe ? 'rtl' : 'ltr'}>
        <div className="flex flex-col items-center py-6">
          <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
          <DialogTitle className="text-2xl font-bold mb-2">
            {isHe ? 'הפעולה הושלמה בהצלחה!' : 'Action deployed successfully!'}
          </DialogTitle>
          <DialogDescription className="text-lg mb-6">
            {isHe ? 'הנתונים נשמרו בהצלחה.' : 'The data was saved successfully.'}
          </DialogDescription>
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg h-12"
            onClick={() => {
              setSuccessOpen(false);
              if (onComplete) onComplete();
              window.location.reload();
            }}
          >
            {isHe ? 'אישור' : 'OK'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}