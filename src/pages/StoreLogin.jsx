import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User } from 'lucide-react';
import { useLanguage } from '../components/LanguageProvider';

export default function StoreLogin() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">{language === 'he' ? 'התחברות למערכת' : 'Restaurant Login'}</CardTitle>
          <CardDescription className="text-base text-gray-500">
            {language === 'he' ? 'התחבר עם החשבון שאליו נשלחה ההזמנה' : 'Login with the account that received the invitation'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={(e) => {
                e.preventDefault();
                base44.auth.redirectToLogin('/#/pages/Orders');
              }}
              className="w-full h-12 text-lg font-medium bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer pointer-events-auto"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              {language === 'he' ? 'המשך עם גוגל' : 'Continue with Google'}
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                base44.auth.redirectToLogin('/#/pages/Orders');
              }}
              className="w-full h-12 text-lg font-medium bg-black hover:bg-gray-900 text-white shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer pointer-events-auto"
            >
              <img src="https://www.svgrepo.com/show/511330/apple-173.svg" className="w-5 h-5 invert" alt="Apple" />
              {language === 'he' ? 'המשך עם אפל' : 'Continue with Apple'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}