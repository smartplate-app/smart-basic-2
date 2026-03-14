import React from "react";
import { useLanguage } from "../components/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Grid, PlaySquare, Bookmark, User, Link as LinkIcon, Heart, MessageCircle, Share2, Info } from "lucide-react";

export default function InstagramBlueprint() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';

  const gridPosts = [
    { id: 1, type: 'carousel', title: '3 Mistakes Killing Your Restaurant Margins', bg: 'bg-blue-100', text: 'text-blue-800', icon: <Grid className="w-6 h-6" />, image: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c4d19592434b7f867b2c6/654f8dae6_generated_image.png' },
    { id: 2, type: 'carousel', title: 'How to Calculate Food Cost % (Formula)', bg: 'bg-green-100', text: 'text-green-800', icon: <Grid className="w-6 h-6" />, image: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c4d19592434b7f867b2c6/1e40cf317_generated_image.png' },
    { id: 3, type: 'image', title: 'Meme: When the supplier raises prices again', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Camera className="w-6 h-6" />, image: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c4d19592434b7f867b2c6/95106c27f_generated_image.png' },
    { id: 4, type: 'image', title: 'App UI: See your daily profit in real-time', bg: 'bg-purple-100', text: 'text-purple-800', icon: <Camera className="w-6 h-6" />, image: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c4d19592434b7f867b2c6/4d7799fb7_generated_image.png' },
    { id: 5, type: 'carousel', title: 'Smart Plate vs. MarketMan (Comparison)', bg: 'bg-indigo-100', text: 'text-indigo-800', icon: <Grid className="w-6 h-6" />, image: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c4d19592434b7f867b2c6/f383ed239_generated_image.png' },
    { id: 6, type: 'carousel', title: 'Behind the scenes: Taking inventory in 5 mins', bg: 'bg-pink-100', text: 'text-pink-800', icon: <Grid className="w-6 h-6" />, image: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c4d19592434b7f867b2c6/b9cae71e9_generated_image.png' },
    { id: 7, type: 'image', title: 'Customer Testimonial: "Saved 4% on food cost"', bg: 'bg-orange-100', text: 'text-orange-800', icon: <Camera className="w-6 h-6" /> },
    { id: 8, type: 'image', title: 'Quote: "Profit is made in the prep"', bg: 'bg-teal-100', text: 'text-teal-800', icon: <Camera className="w-6 h-6" /> },
    { id: 9, type: 'reel', title: 'Stop guessing your labor costs. Do this instead.', bg: 'bg-rose-100', text: 'text-rose-800', icon: <PlaySquare className="w-6 h-6" /> },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 p-4 md:p-8 ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Instagram Marketing Blueprint</h1>
          <p className="text-gray-600 mt-2">I cannot physically create the account on Instagram for you, but here is the exact visual blueprint and strategy you should use to build it.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Visual Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-[400px] bg-white border-8 border-gray-900 rounded-[3rem] overflow-hidden shadow-2xl relative h-[800px] flex flex-col">
              {/* Phone Notch */}
              <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-3xl w-1/2 mx-auto z-10"></div>
              
              {/* IG Header */}
              <div className="pt-10 pb-2 px-4 border-b flex items-center justify-between bg-white">
                <span className="font-bold text-lg">smartplate.app</span>
                <div className="flex gap-4">
                  <div className="w-6 h-6 border-2 border-black rounded-lg flex items-center justify-center"><span className="text-xl leading-none mb-1">+</span></div>
                  <div className="space-y-1">
                    <div className="w-6 h-0.5 bg-black"></div>
                    <div className="w-6 h-0.5 bg-black"></div>
                    <div className="w-6 h-0.5 bg-black"></div>
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-1">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center border-2 border-white overflow-hidden">
                      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" alt="Logo" className="w-12 h-12 object-contain" />
                    </div>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div><div className="font-bold text-lg">9</div><div className="text-xs">Posts</div></div>
                    <div><div className="font-bold text-lg">1.2K</div><div className="text-xs">Followers</div></div>
                    <div><div className="font-bold text-lg">45</div><div className="text-xs">Following</div></div>
                  </div>
                </div>

                <div className="mb-4">
                  <h2 className="font-bold text-sm">Smart Plate | Food Cost App</h2>
                  <p className="text-sm whitespace-pre-line">
                    Stop guessing, start profiting. 📉📈
                    The ultimate food & labor cost management app for restaurants. 🍽️
                    Take control of your margins today! 👇
                  </p>
                  <a href="#" className="text-sm text-blue-900 font-medium flex items-center gap-1 mt-1">
                    <LinkIcon className="w-3 h-3" /> foodcostapp.com
                  </a>
                </div>

                <div className="flex gap-2 mb-4">
                  <button className="flex-1 bg-gray-100 text-black font-semibold py-1.5 rounded-lg text-sm">Following</button>
                  <button className="flex-1 bg-gray-100 text-black font-semibold py-1.5 rounded-lg text-sm">Message</button>
                  <button className="flex-1 bg-gray-100 text-black font-semibold py-1.5 rounded-lg text-sm">Contact</button>
                </div>

                {/* Highlights */}
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {['Features', 'Reviews', 'Pricing', 'How To'].map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-14 h-14 rounded-full border border-gray-300 p-0.5">
                        <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                          <Bookmark className="w-5 h-5" />
                        </div>
                      </div>
                      <span className="text-xs">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid Tabs */}
              <div className="flex border-t border-b bg-white">
                <div className="flex-1 py-2 flex justify-center border-b-2 border-black"><Grid className="w-6 h-6" /></div>
                <div className="flex-1 py-2 flex justify-center text-gray-400"><PlaySquare className="w-6 h-6" /></div>
                <div className="flex-1 py-2 flex justify-center text-gray-400"><User className="w-6 h-6" /></div>
              </div>

              {/* Grid Content */}
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="grid grid-cols-3 gap-0.5">
                  {gridPosts.map((post) => (
                    <div key={post.id} className={`aspect-square ${post.bg} relative group cursor-pointer flex items-center justify-center p-2 text-center`}>
                      {post.type === 'reel' && <PlaySquare className="absolute top-1 right-1 w-4 h-4 text-black/50" />}
                      {post.type === 'carousel' && <Grid className="absolute top-1 right-1 w-4 h-4 text-black/50" />}
                      <span className={`text-[10px] font-bold leading-tight ${post.text}`}>{post.title}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Strategy Notes */}
          <div className="lg:col-span-7 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Profile Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <strong className="block text-gray-900">Username (Handle):</strong>
                  <p className="text-gray-600">@smartplate.app OR @foodcostapp</p>
                </div>
                <div>
                  <strong className="block text-gray-900">Display Name (SEO Optimized):</strong>
                  <p className="text-gray-600">Smart Plate | Food Cost App</p>
                  <p className="text-sm text-gray-500 italic mt-1">Why? People search "Food Cost" on Instagram. Having it in your display name makes you searchable.</p>
                </div>
                <div>
                  <strong className="block text-gray-900">Bio Formula:</strong>
                  <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                    <li><strong>Hook:</strong> Stop guessing, start profiting.</li>
                    <li><strong>Value:</strong> The ultimate food & labor cost management app for restaurants.</li>
                    <li><strong>CTA:</strong> Take control of your margins today! 👇</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Content Pillars (What to post)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="font-bold text-blue-900 flex items-center gap-2"><Info className="w-4 h-4"/> Educational (40%)</h3>
                  <p className="text-sm text-blue-800 mt-1">Teach restaurant owners how to run a better business. E.g., "How to calculate prime cost", "Why your food cost is suddenly 40%".</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <h3 className="font-bold text-green-900 flex items-center gap-2"><Camera className="w-4 h-4"/> Product Demo / UI (30%)</h3>
                  <p className="text-sm text-green-800 mt-1">Show the app in action. Screen recordings of taking inventory, seeing profit margins, or receiving supplies.</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <h3 className="font-bold text-orange-900 flex items-center gap-2"><Heart className="w-4 h-4"/> Social Proof (15%)</h3>
                  <p className="text-sm text-orange-800 mt-1">Quotes from chefs and owners using the app. "Smart Plate saved me 10 hours a week on inventory."</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <h3 className="font-bold text-purple-900 flex items-center gap-2"><Share2 className="w-4 h-4"/> Relatable / Memes (15%)</h3>
                  <p className="text-sm text-purple-800 mt-1">Funny, relatable content about the struggles of restaurant life (e.g., suppliers forgetting items, staff calling in sick).</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Growth Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600">1.</span>
                    <span><strong>Reels are King:</strong> Instagram pushes Reels to non-followers. Post at least 2 Reels a week showing quick tips or app features.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600">2.</span>
                    <span><strong>Engage with the Community:</strong> Search hashtags like #RestaurantOwner, #ChefLife, #RestaurantManagement. Like and comment on their posts to draw them to your profile.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600">3.</span>
                    <span><strong>Use Carousels for Education:</strong> Step-by-step guides (like "5 ways to reduce waste") perform best as swipeable carousels because users save them for later.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600">4.</span>
                    <span><strong>Link in Bio:</strong> Use a tool like Linktree or just direct them straight to <code>foodcostapp.com</code>.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Your First 6 Posts (Captions & Hashtags)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-2">Post 1: 3 Mistakes Killing Your Restaurant Margins (Carousel)</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    Are you making these 3 common mistakes? 🤔
                    1. Not tracking inventory weekly.
                    2. Guessing your recipe costs.
                    3. Ignoring labor percentage.
                    If you want to fix this, Smart Plate automates it all for you. Link in bio to see how! 👇
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">#RestaurantOwner #FoodCost #RestaurantManagement #ChefLife #SmartPlate</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-2">Post 2: How to Calculate Food Cost % (Carousel)</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    Knowing your food cost percentage is the first step to profitability! 📊
                    Formula: (Beginning Inventory + Purchases - Ending Inventory) / Food Sales.
                    Sound complicated? Smart Plate does it automatically. 💡
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">#RestaurantBusiness #FoodCostPercentage #RestaurantTips #HospitalityIndustry #SmartPlate</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-2">Post 3: Meme: When the supplier raises prices again (Image)</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    We've all been there... 😅 When the supplier sneaks in a price increase and you only notice it weeks later.
                    With Smart Plate, you get alerted instantly when prices change! 🛑📉
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">#RestaurantMemes #ChefMemes #SupplierProblems #RestaurantLife #SmartPlate</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-2">Post 4: App UI: See your daily profit in real-time (Image)</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    Imagine knowing exactly how much money you made today before you even close the doors. 💸
                    Smart Plate gives you real-time profit tracking so you can make decisions that matter. Click the link in our bio to try it out! 🚀
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">#RestaurantTech #ProfitMargins #RestaurantSoftware #SmartPlateApp #RestaurantOwner</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-2">Post 5: Smart Plate vs. MarketMan (Carousel)</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    Why are restaurants switching to Smart Plate? 🔄
                    It's simple, fast, and built for actual restaurant owners, not accountants. Swipe to see the difference! 👉
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">#RestaurantSoftware #MarketManAlternative #RestaurantOperations #FoodCostApp #SmartPlate</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-2">Post 6: Behind the scenes: Taking inventory in 5 mins (Carousel)</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    Taking inventory doesn't have to take all night. 🕒
                    See how our users cut their inventory time by 80% using Smart Plate's mobile scanner. Work smarter, not harder! 💪
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">#InventoryManagement #RestaurantInventory #WorkSmarter #RestaurantHacks #SmartPlate</p>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </div>
  );
}