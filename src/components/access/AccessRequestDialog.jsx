import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function AccessRequestDialog({ open, onOpenChange, onSubmitted }) {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [business, setBusiness] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const me = await base44.auth.me();
          setFullName(me.full_name || '');
          setEmail(me.email || '');
        }
      } catch {}
    })();
  }, [open]);

  const submit = async () => {
    if (!fullName || !email) {
      alert('Please fill in your name and email');
      return;
    }
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('submitAccessRequest', {
        full_name: fullName,
        email,
        phone,
        business_name: business,
        message,
        page_url: window.location.href
      });
      if (data?.success) {
        setSuccess(true);
        onSubmitted && onSubmitted();
      } else {
        alert(data?.error || 'Failed to submit request');
      }
    } catch (e) {
      alert(e?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request access</DialogTitle>
          <DialogDescription>Tell us who you are and we will enable access ASAP.</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
            Thanks! Your request was sent. We'll be in touch shortly.
          </div>
        ) : (
          <div className="grid gap-3">
            <div>
              <Label>Your name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+972..." />
            </div>
            <div>
              <Label>Business name (optional)</Label>
              <Input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Restaurant / Business" />
            </div>
            <div>
              <Label>Anything we should know? (optional)</Label>
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Notes" />
            </div>
          </div>
        )}

        <DialogFooter>
          {!success ? (
            <Button onClick={submit} disabled={loading} className="bg-gray-900 hover:bg-gray-800">
              {loading ? 'Sending...' : 'Request access'}
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)} className="bg-gray-900 hover:bg-gray-800">Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}