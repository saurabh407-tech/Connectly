import { Link } from 'react-router-dom';
import { MessageCircle, Video, ShieldCheck, Lock, Check, CheckCheck, ArrowUpRight } from 'lucide-react';
import Navbar from '../components/layout/Navbar.jsx';
import Footer from '../components/layout/Footer.jsx';
import { buttonClasses } from '../components/common/Button.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

const features = [
  { icon: MessageCircle, title: 'Real-time chat', text: 'Messages arrive the moment they are sent, with typing indicators and read receipts so everyone stays in sync.' },
  { icon: Video, title: 'Audio and video calls', text: 'Switch from text to a call in one tap. Clear conversations right inside the app.' },
  { icon: ShieldCheck, title: 'Secure communication', text: 'Protected sign-in, access controls and secure connections help keep conversations private.' },
];

function Bubble({ mine, children, meta }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-[18px] px-4 py-3 text-sm leading-6 ${mine ? 'rounded-br-md bg-[#B87959] text-[#FFF9F3]' : 'rounded-bl-md bg-[#E8E3DA] text-[#292A27]'}`}>
        <p>{children}</p>
        {meta && <p className="mt-1 flex items-center justify-end gap-1 text-[11px] opacity-70">{meta}</p>}
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="w-full max-w-md rounded-[28px] border border-[#D8D1C6] bg-[#FBF9F5] p-5 shadow-[0_28px_70px_rgba(41,42,39,0.12)]">
      <div className="flex items-center gap-3 border-b border-[#DED8CE] pb-4">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#53665A] text-sm font-semibold text-[#F4F1EA]">AM</span>
        <div>
          <p className="text-sm font-semibold text-[#292A27]">Aarav Mehta</p>
          <p className="text-xs text-[#53665A]">Available</p>
        </div>
        <Video size={18} className="ml-auto text-[#77786F]" />
      </div>
      <div className="space-y-3 py-5">
        <Bubble>Are we still on for the launch review at 4?</Bubble>
        <Bubble mine meta={<>10:24 <CheckCheck size={13} /></>}>Yes. I'll share the build link in a minute.</Bubble>
        <Bubble>Perfect. Jump on a call when it's ready.</Bubble>
        <Bubble mine meta={<>10:25 <Check size={13} /></>}>Calling you now.</Bubble>
      </div>
      <div className="rounded-xl border border-[#DED8CE] bg-[#F4F1EA] px-4 py-3 text-sm text-[#929188]">Write a message</div>
    </div>
  );
}

export default function Home() {
  useDocumentTitle();

  return (
    <div className="min-h-screen bg-[#F4F1EA] font-sans text-[#292A27]">
      <Navbar />
      <main>
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 overflow-hidden px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
          <div className="relative z-10">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#9C6B4E]">A little closer, every day</p>
            <h1 className="max-w-xl font-heading text-4xl font-semibold leading-[1.12] tracking-tight text-[#292A27] sm:text-5xl lg:text-6xl">
              Conversation is what connects us.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[#77786F]">
              Connectly brings messaging, voice and video together in a calm, considered space for the people you talk to every day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={buttonClasses({ size: 'lg' })}>Get started <ArrowUpRight className="ml-2 inline" size={16} /></Link>
              <Link to="/login" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>Log in</Link>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-[#77786F]">
              <span className="h-2 w-2 rounded-full bg-[#53665A]" />
              Messages, calls and shared files in one place
            </div>
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-[#D8C4B5]/40 blur-2xl" />
            <ChatPreview />
          </div>
        </section>

        <section id="features" className="border-y border-[#D8D1C6] bg-[#EAE5DC] py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9C6B4E]">Built for everyday connection</p>
            <h2 className="mt-3 max-w-xl font-heading text-3xl font-semibold tracking-tight text-[#292A27] sm:text-4xl">Everything you need. Nothing in the way.</h2>
            <p className="mt-3 max-w-xl leading-7 text-[#77786F]">One app for quick replies, face-to-face calls and everything in between.</p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, text }, index) => (
                <article key={title} className="rounded-2xl border border-[#D8D1C6] bg-[#FBF9F5] p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#292A27]/5">
                  <span className={`grid h-12 w-12 place-items-center rounded-xl ${index === 1 ? 'bg-[#DCE3DA] text-[#53665A]' : 'bg-[#EFE1D7] text-[#9C6B4E]'}`}>
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 font-heading text-lg font-semibold text-[#292A27]">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#77786F]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="py-16 md:py-24">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#DCE3DA] text-[#53665A]"><Lock size={22} /></span>
              <div>
                <h2 className="font-heading text-2xl font-semibold text-[#292A27]">Privacy is part of the design.</h2>
                <p className="mt-2 max-w-xl leading-7 text-[#77786F]">Passwords are hashed, sessions are token-based and traffic is rate-limited and protected with security headers.</p>
              </div>
            </div>
            <Link to="/register" className={buttonClasses({ size: 'lg' })}>Create your account</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
