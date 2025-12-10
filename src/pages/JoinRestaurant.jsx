import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader, CheckCircle, AlertCircle } from "lucide-react";

export default function JoinRestaurantPage() {
  const [loading, setLoading] = useState(true);
  const [restaurantData, setRestaurantData] = useState(null);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    parseInviteData();
  }, []);

  const parseInviteData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const encodedData = urlParams.get('data');

      if (!encodedData) {
        setError('Invalid invitation link. Please contact the restaurant.');
        setLoading(false);
        return;
      }

      // Decode using Unicode-safe method (matches encoding in StoreUsers)
      const decoded = JSON.parse(decodeURIComponent(encodedData));
      setRestaurantData(decoded);
      setUsername(decoded.inviteeEmail.split('@')[0]);
      
      // Check if user already authenticated
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        // User is already logged in, auto-complete registration
        await autoCompleteRegistration(decoded);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error parsing invite:', err);
      setError('Invalid invitation link format.');
      setLoading(false);
    }
  };

  const autoCompleteRegistration = async (data) => {
    try {
      const currentUser = await base44.auth.me();
      
      // Update user to be part of this restaurant
      await base44.auth.updateMe({
        store_user_role: data.role,
        store_user_owner_email: data.ownerEmail,
        store_user_store_name: data.restaurantName,
        acting_as_store_email: data.ownerEmail,
        acting_as_store_name: data.restaurantName,
        business_name: data.restaurantName,
        business_address: data.restaurantAddress,
        restaurant_logo: data.restaurantLogo
      });

      // Create StoreUser record
      await base44.entities.StoreUser.create({
        store_id: data.ownerEmail,
        store_name: data.restaurantName,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        role: data.role,
        owner_email: data.ownerEmail,
        is_active: true
      });

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/pages/Orders';
      }, 2000);
    } catch (err) {
      console.error('Error auto-completing registration:', err);
      setError('Failed to complete registration. Please try manually.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);

      // Create user account
      const response = await base44.functions.invoke('createSimpleUserAccount', {
        email: restaurantData.inviteeEmail,
        full_name: restaurantData.inviteeName,
        username: username.trim(),
        password: password,
        restaurant_data: {
          store_user_role: restaurantData.role,
          store_user_owner_email: restaurantData.ownerEmail,
          store_user_store_name: restaurantData.restaurantName,
          acting_as_store_email: restaurantData.ownerEmail,
          acting_as_store_name: restaurantData.restaurantName,
          business_name: restaurantData.restaurantName,
          business_address: restaurantData.restaurantAddress || '',
          restaurant_logo: restaurantData.restaurantLogo || ''
        }
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/auth/login?next=' + encodeURIComponent('/pages/Orders');
        }, 2000);
      } else {
        alert(response.data.error || 'Failed to create account');
      }
    } catch (err) {
      console.error('Error creating account:', err);
      alert('Failed to create account: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-lg text-gray-700">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Welcome!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-xl font-bold">🎉 You've joined {restaurantData.restaurantName}!</p>
            <p className="text-gray-600">Redirecting to your dashboard...</p>
            <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {restaurantData.restaurantLogo && (
              <img 
                src={restaurantData.restaurantLogo}
                alt={restaurantData.restaurantName}
                className="h-16 w-16 object-contain rounded-lg"
              />
            )}
          </div>
          <CardTitle className="text-center">Join {restaurantData.restaurantName}</CardTitle>
          <p className="text-center text-gray-600 mt-2">
            Welcome, {restaurantData.inviteeName}!
          </p>
          <p className="text-center text-sm text-purple-600 mt-1">
            You're joining as {restaurantData.role === 'manager' ? 'Manager' : 'Worker'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email (read-only)</Label>
              <Input value={restaurantData.inviteeEmail} disabled className="bg-gray-100" />
            </div>

            <div>
              <Label>Username *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
              />
            </div>

            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength={6}
              />
            </div>

            <div>
              <Label>Confirm Password *</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Join Restaurant'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}