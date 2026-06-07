import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function WorkerLogin() {
  const urlParams = new URLSearchParams(window.location.search);
  const storeId = urlParams.get("store");
  const role = urlParams.get("role") || "worker"; // "worker" or "manager"
  const isManager = role === "manager";

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasStoreLink = !!storeId;

  const handlePinLogin = async (e) => {
    e.preventDefault();
    if (pin.length !== 8) {
      setError("יש להזין קוד גישה של 8 ספרות");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("verifyRestaurantPin", {
        store_id: storeId,
        pin: pin.trim(),
        role: role,
      });
      const data = res.data;
      if (data?.success) {
        // Store business name so WorkerPortal can display it immediately
        try {
          sessionStorage.setItem('wp_business_name', data.business_name || '');
          sessionStorage.setItem('wp_owner_email', data.owner_email || '');
        } catch {}
        // Redirect directly to the public WorkerPortal — no login needed
        window.location.href = "/WorkerPortal?owner=" + data.store_id;
      } else {
        setError(data?.error || "קוד גישה שגוי");
      }
    } catch (err) {
      setError("שגיאה - נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  const accentColor = isManager ? "blue" : "amber";
  const gradientClass = isManager
    ? "from-blue-50 to-indigo-50"
    : "from-amber-50 to-orange-50";
  const iconBgClass = isManager ? "bg-blue-100" : "bg-amber-100";
  const btnClass = isManager
    ? "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
    : "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300";
  const borderClass = isManager
    ? "focus:border-blue-400"
    : "focus:border-amber-400";
  const noLinkBgClass = isManager
    ? "bg-blue-50 border-blue-200 text-blue-700"
    : "bg-amber-50 border-amber-200 text-amber-700";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-4`} dir="rtl">
      {/* Smart Plate Branding */}
      <div className="flex flex-col items-center mb-6">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg"
          alt="Smart Plate"
          className="h-14 object-contain mb-1"
        />
        <span className="text-base font-bold text-black tracking-wide">SMART PLATE BASIC</span>
        <span className="text-xs text-gray-500 tracking-wider">food cost app</span>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className={`w-16 h-16 ${iconBgClass} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
            <span className="text-3xl">{isManager ? "🗂️" : "🍽️"}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isManager ? "כניסת מנהלים" : "כניסת עובדים"}
          </h1>
          {hasStoreLink ? (
            <p className="text-gray-500 text-sm mt-1">
              הכנס את קוד הגישה של {isManager ? "המנהל" : "העובד"}
            </p>
          ) : (
            <p className="text-gray-500 text-sm mt-1">השתמש בקישור שקיבלת</p>
          )}
        </div>

        {hasStoreLink ? (
          <form onSubmit={handlePinLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                קוד גישה (8 ספרות)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className={`w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-3xl font-bold tracking-widest focus:outline-none ${borderClass} bg-gray-50`}
                placeholder="• • • • • • • •"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length !== 8}
              className={`w-full py-3 ${btnClass} text-white font-bold rounded-xl transition text-base`}
            >
              {loading ? "מאמת..." : "כניסה"}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className={`border rounded-xl p-4 text-sm ${noLinkBgClass}`}>
              בקש מהמנהל לשלוח לך קישור גישה
            </div>
          </div>
        )}
      </div>
    </div>
  );
}