import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Save, Upload, X, CalendarPlus, Download } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

export default function UserProfilePage() {
  const { t, language } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    business_name: "",
    business_tax_id: "",
    business_address: "",
    phone: "",
    supply_receiving_contact: "",
    supply_receiving_phone: "",
    email_sender_name: "",
    reply_to_email: "",
    restaurant_logo: ""
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [driveEmail, setDriveEmail] = useState("");
  const [driveAuthorized, setDriveAuthorized] = useState(null);
  const [driveChecking, setDriveChecking] = useState(false);
  const [driveAccount, setDriveAccount] = useState(null);

  // AI & Content tools state
  const [igType, setIgType] = useState('post');
  const [igTopics, setIgTopics] = useState('offline mode, weekly scheduling, order management');
  const [igGenerating, setIgGenerating] = useState(false);
  const [igResult, setIgResult] = useState(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [optLoading, setOptLoading] = useState(false);
  const [optResult, setOptResult] = useState(null);
  const [coverGenerating, setCoverGenerating] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [savingDrive, setSavingDrive] = useState(false);
  const [driveLink, setDriveLink] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setFormData({
        full_name: currentUser.full_name || "",
        email: currentUser.email || "",
        business_name: currentUser.business_name || "",
        business_tax_id: currentUser.business_tax_id || "",
        business_address: currentUser.business_address || "",
        phone: currentUser.phone || "",
        supply_receiving_contact: currentUser.supply_receiving_contact || "",
        supply_receiving_phone: currentUser.supply_receiving_phone || "",
        email_sender_name: currentUser.email_sender_name || "",
        reply_to_email: currentUser.reply_to_email || "",
        restaurant_logo: currentUser.restaurant_logo || ""
      });
      setDriveEmail(currentUser.drive_share_email || currentUser.email || "");
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await base44.auth.updateMe({
        full_name: formData.full_name,
        phone: formData.phone,
        business_name: formData.business_name,
        business_tax_id: formData.business_tax_id,
        business_address: formData.business_address,
        supply_receiving_contact: formData.supply_receiving_contact,
        supply_receiving_phone: formData.supply_receiving_phone,
        email_sender_name: formData.email_sender_name,
        reply_to_email: formData.reply_to_email,
        restaurant_logo: formData.restaurant_logo
      });

      alert(t('save_success') || 'Settings saved successfully!');
      loadUserData();
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(t('error_saving') || 'Error saving profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDriveEmail = async () => {
    try {
      const email = (driveEmail || '').trim();
      if (!email) { alert('Enter a Google email'); return; }
      await base44.auth.updateMe({ drive_share_email: email });
      alert('Saved');
      await loadUserData();
    } catch (e) {
      alert('Error: ' + (e?.message || e));
    }
  };

  const handleCheckDrive = async () => {
    try {
      setDriveChecking(true);
      const { data } = await base44.functions.invoke('checkDriveAuth', {});
      setDriveAuthorized(!!data?.authorized);
      if (data?.authorized) {
        try {
          const who = await base44.functions.invoke('driveWhoAmI', {});
          setDriveAccount(who?.data?.user || null);
        } catch {}
        const target = (driveEmail || user?.email || '').trim();
        alert(`Connected. Files will be shared to ${target}.`);
      } else {
        alert('Not connected to Google Drive');
      }
    } catch (e) {
      setDriveAuthorized(false);
      alert('Not connected');
    } finally {
      setDriveChecking(false);
    }
  };

  const buildGoogleRecurringURL = () => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 20);
    if (now.getDate() > 20) start = new Date(now.getFullYear(), now.getMonth() + 1, 20);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const fmt = (d) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const text = encodeURIComponent(language === 'he' ? 'בדיקות חודשיות: עלות עבודה, עלות מזון, סידור עבודה, קבלות' : 'Monthly checklist: labor cost, food cost, schedule, receipts');
    const details = encodeURIComponent(language === 'he'
      ? 'צ׳ק ליסט:\n1) בדיקת עלות עבודה\n2) בדיקת עלות מזון\n3) לאשר שכל העובדים שובצו\n4) לאשר כל הקבלות'
      : 'Checklist:\n1) Review labor cost\n2) Review food cost\n3) Verify workers scheduled\n4) Accept all receipts');
    const dates = `${fmt(start)}/${fmt(end)}`;
    const recur = encodeURIComponent('RRULE:FREQ=MONTHLY;BYMONTHDAY=20');
    const ctz = encodeURIComponent('Asia/Jerusalem');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${dates}&recur=${recur}&ctz=${ctz}`;
  };

  const handleEnableReminder = async () => {
    try {
      setReminderLoading(true);
      const { data } = await base44.functions.invoke('createMonthlyComplianceReminder', {});
      if (data?.success) {
        alert((language === 'he' ? 'תזכורת חודשית נוצרה/עודכנה ביומן שלך' : 'Monthly reminder created/updated on your calendar'));
      } else {
        // Fallback: open pre-filled Google Calendar event (no OAuth needed)
        window.open(buildGoogleRecurringURL(), '_blank');
      }
    } catch (e) {
      window.open(buildGoogleRecurringURL(), '_blank');
    } finally {
      setReminderLoading(false);
    }
  };

  // AI/Automation handlers
  const handleGenerateIG = async () => {
    try {
      setIgGenerating(true);
      const topics = igTopics.split(',').map(s => s.trim()).filter(Boolean);
      const { data } = await base44.functions.invoke('generateInstagramContent', {
        type: igType,
        topics,
        languages: ['he', 'en']
      });
      setIgResult(data?.result || null);
    } catch (e) {
      alert('Error: ' + (e?.message || e));
    } finally {
      setIgGenerating(false);
    }
  };

  const handleCreateSample = async () => {
    try {
      setSampleLoading(true);
      const { data } = await base44.functions.invoke('createSampleData', {});
      alert(language === 'he'
        ? `נוצרו נתוני דוגמה: ספקים ${data?.created?.suppliers}, פריטים ${data?.created?.items}, הזמנות ${data?.created?.orders}, שבוע ${data?.created?.schedule}`
        : `Sample created: suppliers ${data?.created?.suppliers}, items ${data?.created?.items}, orders ${data?.created?.orders}, schedule ${data?.created?.schedule}`);
    } catch (e) {
      alert('Error: ' + (e?.message || e));
    } finally {
      setSampleLoading(false);
    }
  };

  const handleSuggest = async () => {
    try {
      setOptLoading(true);
      const { data } = await base44.functions.invoke('suggestOptimizations', {});
      setOptResult(data?.suggestions || null);
    } catch (e) {
      alert('Error: ' + (e?.message || e));
    } finally {
      setOptLoading(false);
    }
  };

  const downloadText = (filename, text) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCaption = (lang) => {
    const g = igResult?.generated?.[lang];
    if (!g) return;
    const txt = [g?.title, g?.caption, (g?.hashtags||[]).join(' '), igType==='reel' ? (g?.voiceover_script || '') : '']
      .filter(Boolean).join('\n\n');
    downloadText(`smartplate_${igType}_${lang}.txt`, txt);
  };

  const handleGenerateCoverImage = async () => {
    try {
      setCoverGenerating(true);
      setCoverUrl('');
      const topics = igTopics.split(',').map(s => s.trim()).filter(Boolean);
      const prompt = `Minimal, clean social media cover image for a restaurant operations app (SmartPlate Basic). Theme: ${topics.join(', ')}. Use bold typography, white background, accent purple/blue, subtle iconography (calendar, box, wifi). No text over Hebrew/English required (graphic only).`;
      const { url } = await base44.integrations.Core.GenerateImage({ prompt });
      setCoverUrl(url);
    } catch (e) {
      alert('Image generation failed: ' + (e?.message || e));
    } finally {
      setCoverGenerating(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!coverUrl) return;
    const a = document.createElement('a');
    a.href = coverUrl;
    a.download = `smartplate_${igType}_cover.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

   if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('user_profile')}</h1>
          <p className="text-gray-600 mt-2">{t('manage_your_profile')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('account_information')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="full_name">{t('full_name')} *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">{t('email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder={t('phone')}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('phone_for_whatsapp_notifications')}</p>
                </div>

                <div>
                  <Label htmlFor="business_name">{t('business_name')}</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                    placeholder={t('business_name')}
                  />
                </div>

                <div>
                  <Label htmlFor="business_tax_id">{language === 'he' ? 'מספר עוסק/חברה (מס הכנסה)' : 'Business/IRS Number'}</Label>
                  <Input
                    id="business_tax_id"
                    value={formData.business_tax_id || ''}
                    onChange={(e) => setFormData({...formData, business_tax_id: e.target.value})}
                    placeholder={language === 'he' ? 'לדוגמה: 123456789' : 'e.g., 123456789'}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>
                    {language === 'he' ? 'לוגו המסעדה' : 'Restaurant Logo'}
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    {language === 'he'
                      ? 'העלה את הלוגו של המסעדה שלך - יופיע בסיידבר ליד לוגו האפליקציה'
                      : 'Upload your restaurant logo - it will appear in the sidebar next to the app logo'}
                  </p>
                  <div className="flex items-center gap-4">
                    {formData.restaurant_logo ? (
                      <div className="relative">
                        <img 
                          src={formData.restaurant_logo} 
                          alt="Restaurant Logo" 
                          className="h-16 w-16 object-contain rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, restaurant_logo: ""})}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        <Upload className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setUploadingLogo(true);
                          try {
                            const { file_url } = await base44.integrations.Core.UploadFile({ file });
                            setFormData({...formData, restaurant_logo: file_url});
                          } catch (error) {
                            console.error("Error uploading logo:", error);
                            alert(language === 'he' ? 'שגיאה בהעלאת הלוגו' : 'Error uploading logo');
                          } finally {
                            setUploadingLogo(false);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('logo-upload').click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <Loader className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {language === 'he' ? 'העלה לוגו' : 'Upload Logo'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="business_address">{t('business_address')}</Label>
                  <Input
                    id="business_address"
                    value={formData.business_address}
                    onChange={(e) => setFormData({...formData, business_address: e.target.value})}
                    placeholder={t('business_address')}
                  />
                </div>

                <div className="md:col-span-2 border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {language === 'he' ? 'פרטי איש קשר לקבלת אספקה' : 'Supply Receiving Contact'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {language === 'he'
                      ? 'הגדר את פרטי האדם שאחראי לקבל אספקה מספקים (יופיע בהזמנות)'
                      : 'Set the contact details for the person responsible for receiving supplies (will appear on orders)'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="supply_receiving_contact">
                    {language === 'he' ? 'שם מקבל האספקה' : 'Supply Receiving Contact Name'}
                  </Label>
                  <Input
                    id="supply_receiving_contact"
                    value={formData.supply_receiving_contact || ''}
                    onChange={(e) => setFormData({...formData, supply_receiving_contact: e.target.value})}
                    placeholder={language === 'he' ? 'לדוגמה: משה כהן' : 'e.g., John Doe'}
                  />
                </div>

                <div>
                  <Label htmlFor="supply_receiving_phone">
                    {language === 'he' ? 'טלפון מקבל האספקה' : 'Supply Receiving Phone'}
                  </Label>
                  <Input
                    id="supply_receiving_phone"
                    type="tel"
                    inputMode="tel"
                    value={formData.supply_receiving_phone || ''}
                    onChange={(e) => setFormData({...formData, supply_receiving_phone: e.target.value})}
                    placeholder={language === 'he' ? '050-1234567' : '050-1234567'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'he'
                      ? 'טלפון זה יופיע בהזמנות לספקים לתיאום אספקה'
                      : 'This phone will appear on orders for suppliers to coordinate deliveries'}
                  </p>
                </div>

                <div className="md:col-span-2 border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {language === 'he' ? 'הגדרות אימייל' : 'Email Settings'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {language === 'he'
                      ? 'התאם אישית את השם שמופיע כשולח באימיילים שנשלחים מהמערכת'
                      : 'Customize the sender name that appears on emails sent from the system'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="email_sender_name">
                    {language === 'he' ? 'שם השולח באימייל' : 'Email Sender Name'}
                  </Label>
                  <Input
                    id="email_sender_name"
                    value={formData.email_sender_name || ''}
                    onChange={(e) => setFormData({...formData, email_sender_name: e.target.value})}
                    placeholder={formData.business_name || formData.full_name || 'My Restaurant'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'he'
                      ? 'לדוגמה: "מסעדת השף" או "יוסי כהן"'
                      : 'Example: "Chef\'s Restaurant" or "John Smith"'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="reply_to_email">
                    {language === 'he' ? 'אימייל למענה' : 'Reply-To Email'}
                  </Label>
                  <Input
                    id="reply_to_email"
                    type="email"
                    value={formData.reply_to_email || ''}
                    onChange={(e) => setFormData({...formData, reply_to_email: e.target.value})}
                    placeholder="your-email@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'he'
                      ? 'אימייל אליו יגיעו תשובות מהנמענים'
                      : 'Email address where replies will be sent'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('save')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Google Drive / Sheets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Files are created in the app owner’s Drive and automatically shared to your Google email below.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <Label htmlFor="drive_email">Google email for sharing</Label>
                <Input id="drive_email" type="email" value={driveEmail} onChange={(e) => setDriveEmail(e.target.value)} placeholder="you@gmail.com" />
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={handleSaveDriveEmail} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
                <Button type="button" variant="outline" onClick={handleCheckDrive} disabled={driveChecking}>
                  {driveChecking ? (<><Loader className="w-4 h-4 mr-2 animate-spin" />Checking...</>) : 'Check connection'}
                </Button>
              </div>
            </div>
            {driveAuthorized !== null && (
              driveAuthorized ? (
                <div className="text-sm mt-3 text-green-700">
                  <div>App connector is active (connected as app owner: {driveAccount?.emailAddress || driveAccount?.displayName || 'Google account'}).</div>
                  <div>Files generated for you will be shared to: { (driveEmail || user?.email || '').trim() }.</div>
                </div>
              ) : (
                <p className="text-sm mt-3 text-red-700">Not connected</p>
              )
            )}
          </CardContent>
        </Card>

        {/* AI & Data Tools (admin only) */}
        {user?.role === 'admin' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{language === 'he' ? 'כלי AI ותוכן' : 'AI & Content Tools'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <Label>{language === 'he' ? 'סוג' : 'Type'}</Label>
                <select className="w-full border rounded-md h-10 px-3" value={igType} onChange={(e)=>setIgType(e.target.value)}>
                  <option value="post">Post</option>
                  <option value="reel">Reel</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>{language === 'he' ? 'נושאים (מופרדים בפסיק)' : 'Topics (comma-separated)'}</Label>
                <Input value={igTopics} onChange={(e)=>setIgTopics(e.target.value)} placeholder="offline mode, scheduling, order management" />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" onClick={handleGenerateIG} disabled={igGenerating} className="bg-purple-600 hover:bg-purple-700">
                {igGenerating ? (<><Loader className="w-4 h-4 mr-2 animate-spin" />{language==='he'?'יוצר...':'Generating...'}</>) : (<><span className="mr-2">✨</span>{language==='he'?'צור תוכן לאינסטגרם':'Generate Instagram Content'}</>)}
              </Button>
              <Button type="button" variant="outline" onClick={handleGenerateCoverImage} disabled={coverGenerating}>
                {coverGenerating ? (<><Loader className="w-4 h-4 mr-2 animate-spin" />{language==='he'?'מייצר תמונה...':'Generating image...'}</>) : (<><Download className="w-4 h-4 mr-2" />{language==='he'?'צור תמונת קאבר':'Generate Cover Image'}</>)}
              </Button>
              <Button type="button" variant="outline" onClick={handleCreateSample} disabled={sampleLoading}>
                {sampleLoading ? (<><Loader className="w-4 h-4 mr-2 animate-spin" />{language==='he'?'יוצר...':'Creating...'}</>) : (<><span className="mr-2">➕</span>{language==='he'?'צור נתוני דוגמה':'Create Sample Data'}</>)}
              </Button>
              <Button type="button" className="bg-gray-900 hover:bg-gray-800" onClick={handleSaveToDrive} disabled={savingDrive}>
                {savingDrive ? (<><Loader className="w-4 h-4 mr-2 animate-spin" />{language==='he'?'שומר...':'Saving...'}</>) : (<>Google Drive</>)}
              </Button>
              <Button type="button" variant="outline" onClick={handleSuggest} disabled={optLoading}>
                {optLoading ? (<><Loader className="w-4 h-4 mr-2 animate-spin" />{language==='he'?'מחשב...':'Analyzing...'}</>) : (<><span className="mr-2">💡</span>{language==='he'?'הצעות לשיפור':'Suggest Improvements'}</>)}
              </Button>
            </div>

            {igResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['he','en'].map(lang => (
                  <div key={lang} className="border rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{lang==='he'?'פוסט/רילס (עברית)':'Post/Reel (English)'}</div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={()=>{
                          const g = igResult?.generated?.[lang];
                          const text = [g?.title, g?.caption, (g?.hashtags||[]).join(' '), igType==='reel' ? (g?.voiceover_script || '') : ''].filter(Boolean).join('\n\n');
                          navigator.clipboard.writeText(text);
                          alert(language==='he'?'הועתק':'Copied');
                        }}>
                          Copy
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={()=>handleDownloadCaption(lang)}>
                          <Download className="w-3 h-3 mr-1" /> TXT
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{igResult?.generated?.[lang]?.caption}</div>
                    {Array.isArray(igResult?.generated?.[lang]?.hashtags) && (
                      <div className="mt-2 text-xs text-gray-600">{igResult.generated[lang].hashtags.join(' ')}</div>
                    )}
                    {igType==='reel' && igResult?.generated?.[lang]?.voiceover_script && (
                      <div className="mt-3 text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded">{igResult.generated[lang].voiceover_script}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {driveLink && (
              <div className="border rounded-lg p-3 bg-white">
                <div className="font-semibold mb-2">{language==='he'?'נשמר ל‑Google Drive':'Saved to Google Drive'}</div>
                <a href={driveLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">{language==='he'?'פתח תיקייה':'Open folder'}</a>
              </div>
            )}

            {coverUrl && (
              <div className="border rounded-lg p-3 bg-white">
                <div className="font-semibold mb-2">{language==='he'?'תמונת קאבר שנוצרה':'Generated Cover Image'}</div>
                <img src={coverUrl} alt="IG Cover" className="w-full rounded" />
                <div className="mt-2 flex gap-2">
                  <Button type="button" variant="outline" onClick={()=>window.open(coverUrl, '_blank')}>{language==='he'?'פתח בטאב חדש':'Open in new tab'}</Button>
                  <Button type="button" onClick={handleDownloadImage}><Download className="w-4 h-4 mr-2" />{language==='he'?'הורד תמונה':'Download Image'}</Button>
                </div>
              </div>
            )}

            {optResult && (
              <div className="border rounded-lg p-3 bg-white">
                <div className="font-semibold mb-2">{language==='he'?'הצעות לשיפור':'Suggestions'}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-1">HE</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {(optResult.he||[]).map((s,i)=>(<li key={i}>{s}</li>))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium mb-1">EN</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {(optResult.en||[]).map((s,i)=>(<li key={i}>{s}</li>))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{language === 'he' ? 'תזכורת חודשית (20 לחודש)' : 'Monthly Reminder (20th)'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {language === 'he'
                ? 'כפתור זה ייצור אירוע יום־שלם חוזר ב־20 לכל חודש ביומן Google האישי שלך. אם יש הרשאה פעילה – ניצור את האירוע אוטומטית; אחרת ייפתח חלון Google Calendar מוכן לשמירה בלחיצה.'
                : 'This creates a recurring all‑day event on the 20th in your Google Calendar. If authorization exists, we create it automatically; otherwise we open Google Calendar pre‑filled for one‑click save.'}
            </p>
            <Button onClick={handleEnableReminder} disabled={reminderLoading} className="bg-green-600 hover:bg-green-700">
              {reminderLoading ? (
                <><Loader className="w-4 h-4 mr-2 animate-spin" />{language === 'he' ? 'מפעיל...' : 'Enabling...'}</>
              ) : (
                <><CalendarPlus className="w-4 h-4 mr-2" />{language === 'he' ? 'הפעל תזכורת חודשית' : 'Enable Monthly Reminder'}</>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              {language === 'he' ? 'האירוע יתוסף ביומן האישי שלך (לא ביומן האדמין). ללא הרשאה – ייפתח מסך Google Calendar מוכן לשמירה.' : 'The event is added to your personal calendar (not the admin\'s). Without authorization, a Google Calendar screen will open ready to save.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}