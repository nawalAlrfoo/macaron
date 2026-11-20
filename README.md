# ماكرون — Macaron

تطبيق دردشة لطيف بألوان الباستيل، يدعم العربية والإنجليزية، ومبني على `React` و`Vite` و`Tailwind CSS` و`Firebase`.

## المميزات

- غرف دردشة جماعية ومحادثات خاصة بين شخصين بشكل لحظي عبر `Cloud Firestore`
- تسجيل دخول عبر `Google` مع ملف شخصي (اسم، لقب، صورة)
- إرسال صور، والرد على رسالة، وتعديل وحذف الرسائل
- تفاعلات على الرسائل (👍 ❤️ 😂 😮 😢 🙏) — تفاعل واحد لكل شخص
- مؤشر «يكتب الآن…» داخل الغرف والمحادثات الخاصة
- نقطة للرسائل غير المقروءة بجانب كل غرفة ومحادثة، وعدد غير المقروء في عنوان التبويب
- حالة الاتصال (`online` / `away`) تتغير تلقائياً حسب فتح التبويب أو إغلاقه
- فواصل التاريخ (اليوم، أمس، ...) بين الرسائل
- بحث داخل المحادثة الحالية
- الروابط داخل الرسائل تصبح قابلة للضغط
- الضغط على الرد ينقلك للرسالة الأصلية
- زر نسخ نص الرسالة، وتأكيد قبل الحذف
- مربع كتابة متعدد الأسطر: `Enter` للإرسال و`Shift+Enter` لسطر جديد
- زر «آخر الرسائل» عند وصول رسائل جديدة وأنت تقرأ رسائل قديمة
- الوضع الليلي والنهاري، وتبديل اللغة في أي وقت
- لوحة تحكم للمدير: الألوان والثيمات، إنشاء وحذف الغرف، وإدارة صلاحيات الأعضاء

## التشغيل على جهازك

المتطلبات: `Node.js` إصدار 20 أو أحدث.

```bash
npm install
npm run dev
```

بعدها افتح `http://localhost:3000` في المتصفح.

ملاحظة: ملف `bun.lock` قديم من `AI Studio`، يُفضَّل حذفه قبل `npm install` حتى يُنشأ `package-lock.json` جديد.

## الربط مع Firebase

إعدادات المشروع موجودة في `firebase-applet-config.json`، والمشروع هو `web2-eea61` مع قاعدة بيانات `Firestore` باسم `ai-studio-f887aa25-26d0-4130-90ca-2ee586698302`.

إعدادات `Firebase` للويب ليست سرية، والحماية الحقيقية تأتي من قواعد الأمان في `firestore.rules`.

### نشر قواعد الأمان (ضروري للميزات الجديدة)

الميزات الجديدة (التفاعلات، «يكتب الآن»، غير المقروء) تحتاج نشر قواعد `firestore.rules` الجديدة. بدون نشرها، الشات يشتغل عادي لكن هذه الميزات تبقى متوقفة.

```bash
npm install -g firebase-tools
firebase login
npm run deploy:rules
```

## النشر على الإنترنت (Firebase Hosting)

```bash
npm run deploy:hosting
```

بعد النشر يصبح الموقع على `https://web2-eea61.web.app`.

لربطه بدومين فرعي مثل `macaron.nawal.pro`:

1. من `Firebase Console` ← `Hosting` ← `Add custom domain`
2. أضف سجلات `DNS` التي يعطيك إياها `Firebase` في `GoDaddy`
3. من `Authentication` ← `Settings` ← `Authorized domains` أضف `macaron.nawal.pro` حتى يعمل تسجيل الدخول عبر `Google`

## الرفع على GitHub

```bash
git init
git add .
git commit -m "Macaron v1.2"
git branch -M main
git remote add origin https://github.com/<username>/macaron.git
git push -u origin main
```

## هيكل المشروع

| المسار | الوصف |
| --- | --- |
| `src/App.tsx` | تسجيل الدخول، الملف الشخصي، حالة الاتصال، والاستماع للغرف والأعضاء |
| `src/components/ChatWorkspace.tsx` | الشريط الجانبي، غير المقروء، ورأس المحادثة |
| `src/components/ChatRoomView.tsx` | الرسائل، التفاعلات، «يكتب الآن»، البحث، ومربع الكتابة |
| `src/components/AdminPanel.tsx` | لوحة تحكم المدير |
| `src/i18n/translations.ts` | نصوص الواجهة بالعربية والإنجليزية |
| `src/types/chat.ts` | أنواع البيانات والثوابت |
| `firestore.rules` | قواعد الأمان |
| `security_spec.md` | توثيق قواعد الأمان وحالات الهجوم |

## هيكل قاعدة البيانات

| المجموعة | الاستخدام |
| --- | --- |
| `users_public/{uid}` | الاسم واللقب والصورة وحالة الاتصال |
| `users_private/{uid}` | البريد الإلكتروني (للمالك والمدير فقط) |
| `admins/{uid}` | قائمة المدراء |
| `settings/theme` | ألوان وإعدادات الموقع |
| `rooms/{roomId}/messages` | رسائل الغرف |
| `rooms/{roomId}/typing` | مؤشر «يكتب الآن» في الغرف |
| `direct_chats/{chatId}/messages` | رسائل المحادثات الخاصة |
| `direct_chats/{chatId}/typing` | مؤشر «يكتب الآن» في الخاص |
| `read_states/{uid}` | آخر وقت قرأ فيه المستخدم كل محادثة |

## المطوّرة

نوال الرفوع — [nawal.pro](https://nawal.pro)
