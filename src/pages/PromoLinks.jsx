import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../components/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Check, Trash2, Gift } from "lucide-react";

export default function PromoLinks() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  const [formData, setFormData] = useState({
    recipient_name: "",
    recipient_email: "",
    offer_type: "3_months_free",
    notes: ""
  });

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.PromoLink.filter({}, "-created_date");
      setLinks(data);
    } catch (error) {
      console.error("Error loading promo links:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'VIP-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.recipient_name) return;
    
    try {
      const code = generateCode();
      await base44.entities.PromoLink.create({
        ...formData,
        code,
        is_used: false
      });
      
      setShowForm(false);
      setFormData({ recipient_name: "", recipient_email: "", offer_type: "3_months_free", notes: "" });
      loadLinks();
    } catch (error) {
      console.error("Error creating link:", error);
      alert("Error creating promo link");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this promo link?")) return;
    try {
      await base44.entities.PromoLink.delete(id);
      loadLinks();
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  };

  const copyToClipboard = (code, id) => {
    const url = `${window.location.origin}/#/pages/Register?promo=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getOfferLabel = (type) => {
    switch(type) {
      case '1_month_free': return '1 Month Free';
      case '3_months_free': return '3 Months Free';
      case 'lifetime_free': return 'Lifetime Free';
      default: return type;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 p-4 md:p-8 ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Gift className="w-8 h-8 text-purple-600" />
              VIP Promo Links
            </h1>
            <p className="text-gray-600 mt-2">Generate special access links for industry friends and chefs.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> New Promo Link
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8 border-purple-200 shadow-md">
            <CardHeader className="bg-purple-50 rounded-t-lg border-b border-purple-100">
              <CardTitle className="text-purple-900">Create New VIP Link</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recipient Name (Chef/Owner)</label>
                    <Input 
                      required
                      placeholder="e.g. Gordon Ramsay"
                      value={formData.recipient_name}
                      onChange={(e) => setFormData({...formData, recipient_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recipient Email (Optional)</label>
                    <Input 
                      type="email"
                      placeholder="gordon@restaurant.com"
                      value={formData.recipient_email}
                      onChange={(e) => setFormData({...formData, recipient_email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Offer Type</label>
                    <Select 
                      value={formData.offer_type} 
                      onValueChange={(val) => setFormData({...formData, offer_type: val})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3_months_free">3 Months Free (Recommended)</SelectItem>
                        <SelectItem value="1_month_free">1 Month Free</SelectItem>
                        <SelectItem value="lifetime_free">Lifetime Free (Founding Member)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Internal Notes</label>
                    <Textarea 
                      placeholder="e.g. Met at NYC food show"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Generate Link</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading links...</div>
            ) : links.length === 0 ? (
              <div className="p-12 text-center">
                <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No promo links yet</h3>
                <p className="text-gray-500 mt-1">Create your first VIP link to share with a friend.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className={`p-4 font-medium text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>Recipient</th>
                      <th className={`p-4 font-medium text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>Offer</th>
                      <th className={`p-4 font-medium text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>Code</th>
                      <th className={`p-4 font-medium text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>Status</th>
                      <th className={`p-4 font-medium text-sm text-gray-500 ${isRTL ? 'text-left' : 'text-right'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {links.map((link) => (
                      <tr key={link.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{link.recipient_name}</div>
                          {link.notes && <div className="text-xs text-gray-500">{link.notes}</div>}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {getOfferLabel(link.offer_type)}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-sm">{link.code}</td>
                        <td className="p-4">
                          {link.is_used ? (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Redeemed
                              </span>
                              <div className="text-xs text-gray-500 mt-1">{link.used_by_email}</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className={`p-4 ${isRTL ? 'text-left' : 'text-right'}`}>
                          <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => copyToClipboard(link.code, link.id)}
                              className={copiedId === link.id ? "bg-green-50 text-green-600 border-green-200" : ""}
                            >
                              {copiedId === link.id ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                              {copiedId === link.id ? "Copied!" : "Copy Link"}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(link.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}