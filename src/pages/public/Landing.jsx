import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, FileCheck, CreditCard, Users, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import { SCHOOL } from '../../data/mockSchool.js';
import PublicLayout from '../../components/layout/PublicLayout.jsx';

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA1Jp3AHHVfUbFSqzf3O-N5gFgr6s8ML-K8DwGD2GEXOTz15s-4fyzZM4Y1dwZ6vZaWqtLWEKGdZc1bwrXQMzn5bsiPQqN0FxnQdD3b2YNt-S05QXmCsAO0IBilprdNSAsdI39s5hIV7B5YPuyk0f-9esE0RwWHTQT0N5w6Qv9bcBb0Q1upVt_zm2uL6H9KaHy8QbCqOoaRNzNUIsoa0zzl2ZYB9sGHKd1fetYmj5dyKWuq4kD1hxjHmQ';

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function Landing() {
  return (
    <PublicLayout hideFooter className="!bg-[#f8f9ff]">
      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden md:min-h-[calc(100vh-4.5rem)]">
        <div className="absolute inset-0 z-0">
          <img alt="" className="h-full w-full object-cover" src={HERO_IMAGE} />
          <div className="hero-gradient absolute inset-0" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-screen-2xl px-4 py-16 md:px-10 md:py-20">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
              <Sparkles size={14} />
              Admissions Open — {SCHOOL.academicYear}
            </div>
            <h1 className="font-display mb-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-white md:text-5xl">
              Modern School Enrollment,
              <br />
              Built for Premium Education
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/80">
              Complete your child&apos;s admission online. Submit documents, pay fees, and stay
              connected — all in one trusted platform.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/enroll"
                className="sb-link-btn sb-link-btn--light btn-hover-lift sb-btn-pill inline-flex items-center gap-2 bg-white text-sm font-semibold shadow-sm"
              >
                Start Enrollment <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="sb-link-btn sb-link-btn--dark btn-hover-lift sb-btn-pill inline-flex items-center gap-2 border border-white/20 bg-[#091426] text-sm font-semibold shadow-sm transition-premium hover:bg-[#1e293b]"
              >
                Parent Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="programs" className="px-4 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-screen-2xl">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="font-display mb-3 text-3xl font-extrabold tracking-tight text-[#091426]">
              Why Schools Choose SchoolBridge
            </h2>
            <p className="text-[#45474c]">
              A complete platform for admissions, fees, and parent communication.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shield, title: 'Secure & Trusted', desc: 'Role-based access, encrypted data, and audit-ready workflows.' },
              { icon: FileCheck, title: 'Easy Documentation', desc: 'Upload documents online with real-time status tracking.' },
              { icon: CreditCard, title: 'Transparent Fees', desc: 'Clear fee breakdown with digital receipt generation.' },
              { icon: Users, title: 'Stay Connected', desc: 'Chat with teachers and receive classroom photos after admission.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                className="sb-card p-6 transition-premium hover:-translate-y-0.5 hover:shadow-lg"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#dce9ff] text-[#0058be]">
                  <Icon size={22} />
                </div>
                <h3 className="mb-2 text-base font-bold text-[#091426]">{title}</h3>
                <p className="text-sm leading-relaxed text-[#45474c]">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* School CTA */}
      <section id="about" className="bg-[#091426] px-4 py-16 text-center text-white md:px-10 md:py-20">
        <div className="mx-auto max-w-screen-2xl">
          <GraduationCap size={40} className="mx-auto mb-4 opacity-80" />
          <h2 className="font-display mb-3 text-3xl font-extrabold">{SCHOOL.name}</h2>
          <p className="mb-8 text-white/70">{SCHOOL.address}</p>
          <Link
            to="/enroll"
            className="sb-link-btn sb-link-btn--light btn-hover-lift sb-btn-pill inline-flex items-center gap-2 bg-white text-sm font-semibold shadow-md"
          >
            Begin Enrollment Application <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Contact + footer */}
      <section id="contact" className="border-t border-black/5 bg-white px-4 py-10 md:px-10">
        <div className="mx-auto max-w-screen-2xl text-center text-sm text-[#45474c]">
          {SCHOOL.phone} · {SCHOOL.email}
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#091426] px-4 py-6 md:px-10">
        <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-4 md:flex-row">
          <span className="font-display text-lg font-semibold text-white">SchoolBridge</span>
          <p className="text-xs text-white/40">© 2026 SchoolBridge · {SCHOOL.name}</p>
        </div>
      </footer>
    </PublicLayout>
  );
}
