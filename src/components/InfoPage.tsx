import React, { useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Language } from '@/src/types/chat';
import { MacaronLogo } from './MacaronLogo';

export type InfoPageId = 'about' | 'privacy' | 'terms';

interface Section {
  title: string;
  body: string[];
}

interface PageContent {
  title: string;
  intro: string;
  sections: Section[];
}

const UPDATED = '2026-11-20';

const CONTENT: Record<Language, Record<InfoPageId, PageContent>> = {
  ar: {
    about: {
      title: 'عن ماكرون',
      intro:
        'ماكرون مجتمع للتعلم والأسئلة: غرف للأسئلة العامة والبرمجة والدراسة والمشاريع والتدريب، ومحادثات خاصة بطلب، بالعربي والإنجليزي.',
      sections: [
        {
          title: 'شو بتقدر تعمل؟',
          body: [
            'تسأل وتجاوب بغرف التعلم: الأسئلة العامة، البرمجة، الدراسة، المشاريع، والتدريب والوظائف.',
            'تبحث عن أي شخص باسم المستخدم (@) وتبعتله طلب محادثة برسالة وحدة، وبعد ما يقبل بتكمّلوا الحديث.',
            'ترسل صور، ترد على رسائل، تعدّل أو تحذف رسائلك، وتتفاعل بالإيموجي.',
            'تشوف مين عم يكتب هلأ، ووين في رسائل جديدة ما قرأتها.',
          ],
        },
        {
          title: 'مين ورا ماكرون؟',
          body: [
            'ماكرون مشروع شخصي صممته وطورته نوال الرفوع، مطوّرة برمجيات من الأردن.',
            'للتواصل أو الاقتراحات: nawal.pro',
          ],
        },
      ],
    },
    privacy: {
      title: 'سياسة الخصوصية',
      intro: 'خصوصيتك مهمة. هون بنوضح شو المعلومات اللي بنحفظها، ومين بيشوفها، وليش.',
      sections: [
        {
          title: 'شو المعلومات اللي بنحفظها؟',
          body: [
            'حساب Google: بنستخدم تسجيل الدخول من Google بس للتعرّف عليك، وما بنوصل لكلمة سرك.',
            'ملفك: الاسم، اسم المستخدم (@)، الصورة، وبريدك الإلكتروني.',
            'رسائلك والصور اللي بترسلها، والتفاعلات على الرسائل.',
            'معلومات استخدام بسيطة: إذا كنت متصل أو لا، إذا عم تكتب هلأ، وآخر وقت فتحت فيه كل محادثة (حتى نعرض الرسائل غير المقروءة).',
          ],
        },
        {
          title: 'مين بيشوف معلوماتك؟',
          body: [
            'اسمك واسم المستخدم وصورتك بتظهر للأعضاء اللي بتحكي معهم أو اللي بيبحثوا عنك.',
            'ما في قائمة مفتوحة بالأعضاء؛ الناس بيلاقوك بس إذا بحثوا عن اسم المستخدم تبعك، وما حدا بيقدر يكمّل محادثة معك إلا إذا قبلت طلبه.',
            'بريدك الإلكتروني خاص، ما بيشوفه إلا إنت وإدارة الموقع.',
            'رسائل الغرف الجماعية بيشوفها كل الأعضاء، والمحادثات الخاصة بيشوفها طرفيها بس.',
          ],
        },
        {
          title: 'وين بتنحفظ البيانات؟',
          body: [
            'كل البيانات محفوظة على خدمة Firebase من Google، ومحمية بقواعد أمان بتمنع أي حدا يوصل لإشي مش إله.',
            'ما بنبيع بياناتك ولا بنشاركها مع أي جهة إعلانية.',
          ],
        },
        {
          title: 'حقوقك',
          body: [
            'بتقدر تعدّل اسمك واسم المستخدم وصورتك وبريدك بأي وقت من «تعديل الملف».',
            'بتقدر تحذف أي رسالة إنت بعتها.',
            'إذا بدك تحذف حسابك وكل بياناتك، تواصل معنا عبر nawal.pro وبنحذفها.',
          ],
        },
      ],
    },
    terms: {
      title: 'شروط الاستخدام',
      intro: 'باستخدامك ماكرون إنت موافق على هالشروط البسيطة، حتى تضل المساحة لطيفة وآمنة للكل.',
      sections: [
        {
          title: 'الاحترام أولاً',
          body: [
            'ممنوع الإساءة أو التنمر أو خطاب الكراهية أو التحرش بأي شكل.',
            'ممنوع نشر محتوى غير لائق أو عنيف أو مخالف للقانون.',
            'ممنوع الإزعاج أو الرسائل المتكررة (سبام) أو انتحال شخصية حدا ثاني.',
          ],
        },
        {
          title: 'محتواك',
          body: [
            'إنت مسؤول عن الرسائل والصور اللي بتنشرها.',
            'لا تنشر معلومات شخصية حساسة إلك أو لغيرك (أرقام هواتف، عناوين، كلمات سر...).',
          ],
        },
        {
          title: 'الإدارة',
          body: [
            'إدارة الموقع بتقدر تحذف أي رسالة أو غرفة مخالفة، وتوقف أي حساب بيخالف الشروط.',
            'ماكرون مشروع شخصي ومقدّم «كما هو»، وممكن تتغير ميزاته أو هالشروط مع الوقت.',
          ],
        },
      ],
    },
  },
  en: {
    about: {
      title: 'About Macaron',
      intro:
        'Macaron is a community for learning and questions: rooms for general Q&A, programming, study, projects and careers, plus request-based private chats, in Arabic and English.',
      sections: [
        {
          title: 'What can you do?',
          body: [
            'Ask and answer in learning rooms: general Q&A, programming, study, projects, and internships & careers.',
            'Find anyone by @username and send a one-message chat request; once accepted, keep talking.',
            'Send photos, reply to messages, edit or delete your own messages, and react with emoji.',
            'See who is typing right now and where you have unread messages.',
          ],
        },
        {
          title: 'Who is behind Macaron?',
          body: [
            'Macaron is a personal project designed and built by Nawal Alrfoo, a software developer from Jordan.',
            'Contact and suggestions: nawal.pro',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      intro: 'Your privacy matters. Here is what we store, who can see it, and why.',
      sections: [
        {
          title: 'What we store',
          body: [
            'Google account: Google sign-in is only used to identify you; we never see your password.',
            'Your profile: name, @username, photo, and email address.',
            'Your messages, the photos you send, and reactions.',
            'Basic activity: whether you are online, whether you are typing, and when you last opened each conversation (for unread indicators).',
          ],
        },
        {
          title: 'Who can see it',
          body: [
            'Your name, username and photo are visible to people you chat with or who search for you.',
            'There is no open member list; people only find you by your exact username, and nobody can keep chatting with you unless you accept their request.',
            'Your email is private: only you and the site admins can see it.',
            'Group room messages are visible to all members; private chats are visible only to the two participants.',
          ],
        },
        {
          title: 'Where data is stored',
          body: [
            "All data is stored on Google's Firebase and protected by security rules that block access to anything that is not yours.",
            'We never sell your data or share it with advertisers.',
          ],
        },
        {
          title: 'Your rights',
          body: [
            'You can change your name, username, photo and email anytime from "Edit profile".',
            'You can delete any message you sent.',
            'To delete your account and all your data, contact us via nawal.pro.',
          ],
        },
      ],
    },
    terms: {
      title: 'Terms of Use',
      intro: 'By using Macaron you agree to these simple terms, so the space stays kind and safe for everyone.',
      sections: [
        {
          title: 'Respect first',
          body: [
            'No abuse, bullying, hate speech, or harassment of any kind.',
            'No inappropriate, violent, or illegal content.',
            'No spam, flooding, or impersonating someone else.',
          ],
        },
        {
          title: 'Your content',
          body: [
            'You are responsible for the messages and photos you post.',
            "Don't share sensitive personal information about yourself or others (phone numbers, addresses, passwords...).",
          ],
        },
        {
          title: 'Moderation',
          body: [
            'Site admins may remove any message or room that breaks these terms and suspend accounts that do.',
            'Macaron is a personal project provided "as is"; its features and these terms may change over time.',
          ],
        },
      ],
    },
  },
};

interface InfoPageProps {
  page: InfoPageId;
  language: Language;
  backLabel: string;
  onClose: () => void;
}

export const InfoPage: React.FC<InfoPageProps> = ({ page, language, backLabel, onClose }) => {
  const c = CONTENT[language][page];
  const isRtl = language === 'ar';
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="min-h-dvh w-full px-4 py-6 sm:py-10">
      <article className="msg-in glass-strong max-w-2xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-6 sm:p-10 space-y-6 text-slate-700 dark:text-slate-200">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <BackIcon className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </button>
          <span className="inline-flex rounded-[0.75rem] shadow-md rotate-[-6deg]">
            <MacaronLogo size={40} />
          </span>
        </div>

        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gradient">{c.title}</h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{c.intro}</p>
        </header>

        {c.sections.map((sec) => (
          <section key={sec.title} className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{sec.title}</h2>
            <ul className="space-y-1.5 text-sm leading-relaxed list-disc ps-5 marker:text-violet-400">
              {sec.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}

        <footer className="pt-4 border-t border-slate-200/70 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <span>
            {isRtl ? 'آخر تحديث' : 'Last updated'}: <span dir="ltr">{UPDATED}</span>
          </span>
          <nav className="flex items-center gap-3">
            <a href="#/about" className="hover:text-violet-600">{CONTENT[language].about.title}</a>
            <a href="#/privacy" className="hover:text-violet-600">{CONTENT[language].privacy.title}</a>
            <a href="#/terms" className="hover:text-violet-600">{CONTENT[language].terms.title}</a>
          </nav>
        </footer>
      </article>
    </div>
  );
};
