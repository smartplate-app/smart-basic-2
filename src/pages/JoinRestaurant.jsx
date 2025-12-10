import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader, Store } from 'lucide-react';

export default function JoinRestaurantPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    
    if (code.length !== 5) {
      alert('הקוד חייב להיות בן 5 ספרות');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(`${window.location.origin}/#/pages/JoinRestaurant?code=${code}`);
        window.location.href = `/auth/login?next=${returnUrl}`;
        return;
      }

      const currentUser = await base44.auth.me();

      // Find the access code
      const codes = await base44.entities.RestaurantAccessCode.filter({ code: code, is_active: true });
      
      if (codes.length === 0) {
        setError('קוד לא תקין או פג תוקף');
        setLoading(false);
        return;
      }

      const accessCode = codes[0];

      // Check if code expired
      if (new Date(accessCode.expires_at) < new Date()) {
        setError('פג תוקף הקוד');
        setLoading(false);
        return;
      }

      // Check if user already has access
      const existingAccess = await base44.entities.StoreUser.filter({
        user_email: currentUser.email,
        owner_email: accessCode.owner_email,
        is_active: true
      });

      if (existingAccess.length > 0) {
        alert('כבר יש לך גישה למסעדה הזו!');
        window.location.href = '/#/pages/Orders';
        return;
      }

      // Create StoreUser record
      await base44.entities.StoreUser.create({
        store_id: 'main',
        store_name: accessCode.restaurant_name,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        role: accessCode.role,
        owner_email: accessCode.owner_email,
        is_active: true
      });

      // Update code usage count
      await base44.entities.RestaurantAccessCode.update(accessCode.id, {
        uses_count: (accessCode.uses_count || 0) + 1
      });

      // Update user metadata
      await base44.auth.updateMe({
        store_user_role: accessCode.role,
        store_user_owner_email: accessCode.owner_email,
        store_user_store_name: accessCode.restaurant_name
      });

      alert('הצטרפת בהצלחה! 🎉');
      window.location.href = '/#/pages/Orders';

    } catch (err) {
      console.error('Error joining restaurant:', err);
      setError('שגיאה בהצטרפות למסעדה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
              alt="Smart Plate"
              className="h-16 object-contain"
            />
          </div>
          <CardTitle className="text-2xl">הצטרף למסעדה</CardTitle>
          <p className="text-gray-600 text-sm mt-2">
            הזן את קוד הגישה בן 5 הספרות שקיבלת
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <Label className="text-right block mb-2">קוד גישה</Label>
              <Input 
                type="text"
                maxLength={5}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="12345"
                className="text-center text-2xl font-bold tracking-widest"
                dir="ltr"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm text-right">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading || code.length !== 5}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'הצטרף'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}