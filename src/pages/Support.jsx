import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import ChatbotPanel from '@/components/support/ChatbotPanel';
import ContactForm from '@/components/support/ContactForm';
import KnowledgeBase from '@/components/support/KnowledgeBase';
import { MessageCircle, Mail, BookOpen } from 'lucide-react';

export default function Support() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">תמיכה טכנית</h1>
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2"><MessageCircle className="h-4 w-4"/> צ'אטבוט</TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2"><Mail className="h-4 w-4"/> פנייה לתמיכה</TabsTrigger>
            <TabsTrigger value="kb" className="flex items-center gap-2"><BookOpen className="h-4 w-4"/> מאגר מידע</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="mt-4">
            <ChatbotPanel />
          </TabsContent>
          <TabsContent value="contact" className="mt-4">
            <ContactForm />
          </TabsContent>
          <TabsContent value="kb" className="mt-4">
            <KnowledgeBase />
          </TabsContent>
        </Tabs>
        <Card className="mt-6">
          <CardContent className="text-sm text-gray-600 p-4">
            טיפ: אם לא נמצאה תשובה בצ'אט או במאגר, שלחו פנייה ונסייע בהקדם.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}