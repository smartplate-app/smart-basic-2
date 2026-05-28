import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader, Lock, User } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

export default function StoreLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError(language === 'he' ? 'נא למלא שם משתמש וסיסמה' : 'Please fill in username and password');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // The email format used when creating the user
      // Since we don't know the exact store ID here, we might need to rely on loginRestaurantUser 
      // taking the username, but wait, loginRestaurantUser expects email.
      // Let's modify loginRestaurantUser to accept username, or we can just pass the username 
      // and let the backend search by email starting with username@
      
      const response = await base44.functions.invoke('loginRestaurantUser', {
        username: username.trim().toLowerCase(),
        password: password
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Invalid credentials');
      }

      const storeUser = response.data.user;
      const userEmail = storeUser.email; // e.g., username@store_id.local

      // Try to login via Base44 Auth
      try {
        await base44.auth.loginViaEmailPassword(userEmail, password);
        // Login successful
        window.location.href = '/';
      } catch (authError) {
        // If login fails, they might not be registered in Base44 yet
        console.log('Base44 login failed, attempting registration...', authError);
        
        try {
          await base44.auth.register({
            email: userEmail,
            password: password,
            full_name: storeUser.full_name
          });
          
          // Try login again after registration
          await base44.auth.loginViaEmailPassword(userEmail, password);
          window.location.href = '/';
        } catch (regError) {
          console.error('Registration failed:', regError);
          throw new Error(language === 'he' ? 'שגיאה בהרשמת המשתמש למערכת' : 'Failed to register user to the system');
        }
      }

    } catch (err) {
      console.error(err);
      let errorMsg = err?.response?.data?.error || err.message;
      if (errorMsg === 'Request failed with status code 401' || errorMsg === 'Invalid username or password') {
        errorMsg = language === 'he' ? 'שם משתמש או סיסמה שגויים' : 'Invalid username or password';
      }
      setError(errorMsg || (language === 'he' ? 'שם משתמש או סיסמה שגויים' : 'Invalid username or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 pb-6 text-center">
          <CardTitle className="text-2xl font-bold">
            {language === 'he' ? 'התחברות למסעדה' : 'Restaurant Login'}
          </CardTitle>
          <p className="text-sm text-gray-500">
            {language === 'he' ? 'הכנס שם משתמש וסיסמה שקיבלת ממנהל המסעדה' : 'Enter the username and password provided by your manager'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4" dir={language === 'he' ? 'rtl' : 'ltr'}>
            <div className="space-y-2">
              <Label htmlFor="username">{language === 'he' ? 'שם משתמש' : 'Username'}</Label>
              <div className="relative">
                <User className={`absolute top-3 w-5 h-5 text-gray-400 ${language === 'he' ? 'right-3' : 'left-3'}`} />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={language === 'he' ? 'pr-10' : 'pl-10'}
                  placeholder={language === 'he' ? 'לדוגמה: dani' : 'e.g. dani'}
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{language === 'he' ? 'סיסמה' : 'Password'}</Label>
              <div className="relative">
                <Lock className={`absolute top-3 w-5 h-5 text-gray-400 ${language === 'he' ? 'right-3' : 'left-3'}`} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={language === 'he' ? 'pr-10' : 'pl-10'}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-lg mt-4"
              disabled={loading}
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                language === 'he' ? 'התחבר' : 'Login'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}