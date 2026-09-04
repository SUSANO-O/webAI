'use client';

import {
  Rocket,
  Sparkles,
  MonitorSmartphone,
  PencilRuler,
  Wand2,
  LayoutTemplate,
  Eye,
  Code2,
  ArrowRight,
  Download,
  Save,
  Globe,
} from 'lucide-react';
import { A360Slot } from '@/components/a360/Advertising360Script';
import { formatRewardLabel } from '@/lib/omniRewards';

const MARCA = 'startapp360';
const SOLUCION = 'web360';

type Props = {
  onEnter: () => void;
};

const features = [
  {
    icon: Wand2,
    title: 'Generación con IA',
    description: 'Describe tu sitio y obtén HTML listo para previsualizar y guardar.',
    line: 'from-[#FFEB3B] via-[#FF9800] to-[#F57C00]',
    iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    icon: MonitorSmartphone,
    title: 'Preview responsive',
    description: 'Revisa desktop, tablet y móvil antes de publicar tu template.',
    line: 'from-[#FF9800] via-[#26A69A] to-[#00BCD4]',
    iconBg: 'bg-teal-50 text-teal-600',
  },
  {
    icon: PencilRuler,
    title: 'Editor AI',
    description: 'Ajusta templates guardados con asistencia inteligente en el editor.',
    line: 'from-[#26A69A] via-[#00BCD4] to-[#FF9800]',
    iconBg: 'bg-cyan-50 text-cyan-600',
  },
];

const previewTiles = [
  { icon: Sparkles, label: 'Prompt', border: 'border-amber-400/70' },
  { icon: LayoutTemplate, label: 'Templates', border: 'border-orange-400/70' },
  { icon: Eye, label: 'Preview', border: 'border-teal-400/70' },
  { icon: Code2, label: 'Editor', border: 'border-cyan-400/70' },
  { icon: Download, label: 'Export', border: 'border-amber-500/70' },
];

const rewards = [
  { taskId: 'wai-generate' as const, icon: Wand2, label: 'Generar' },
  { taskId: 'wai-save' as const, icon: Save, label: 'Guardar' },
  { taskId: 'wai-download' as const, icon: Download, label: 'Descargar' },
  { taskId: 'wai-publish' as const, icon: Globe, label: 'Publicar' },
];

export default function InformativeSplash({ onEnter }: Props) {
  const scrollToFeatures = () => {
    document.getElementById('web360-features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-white font-sans text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6">
        <A360Slot slot="premium" marca={MARCA} solucion={SOLUCION} />
      </div>

      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/90 via-orange-50/40 to-white">
        <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-amber-300/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-32 h-64 w-64 rounded-full bg-teal-300/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-300/25 blur-3xl" />

        <Rocket className="pointer-events-none absolute left-[8%] top-28 hidden h-8 w-8 animate-bounce text-amber-500/70 lg:block" />
        <Sparkles className="pointer-events-none absolute right-[10%] top-40 hidden h-7 w-7 animate-bounce text-teal-500/70 lg:block [animation-delay:400ms]" />

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 pb-20 pt-14 text-center sm:px-6 sm:pt-20">
          <div className="mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#FFEB3B] via-[#FF9800] to-[#00BCD4] p-[3px] shadow-lg shadow-orange-500/25">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-web360.png" alt="WEB 360" className="h-14 w-14 object-contain" />
            </div>
          </div>

          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#26A69A]">
            Website Builder AI
          </p>

          <h1 className="mb-4 text-4xl font-black tracking-tighter text-slate-900 sm:text-5xl md:text-6xl">
            WEB{' '}
            <span className="bg-gradient-to-r from-[#FFEB3B] via-[#FF9800] to-[#00BCD4] bg-clip-text text-transparent">
              360
            </span>
          </h1>

          <p className="mb-6 max-w-xl text-base text-slate-500 sm:text-lg">
            Genera sitios web con IA: prompt, preview responsive y editor listo para publicar.
          </p>

          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {rewards.map((r) => (
              <span
                key={r.taskId}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-950 shadow-sm"
              >
                <r.icon className="h-3.5 w-3.5 text-amber-700" />
                {r.label} · {formatRewardLabel(r.taskId)}
              </span>
            ))}
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onEnter}
              className="w-full rounded-2xl bg-gradient-to-r from-[#FFEB3B] via-[#FF9800] to-[#F57C00] px-8 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_rgba(255,152,0,0.35)] transition hover:brightness-105 active:scale-[0.98] sm:w-auto"
            >
              Entrar a WEB 360
            </button>
            <button
              type="button"
              onClick={scrollToFeatures}
              className="w-full rounded-2xl border-2 border-[#26A69A]/50 bg-white/70 px-8 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-[#26A69A] transition hover:border-[#26A69A] hover:bg-teal-50/80 sm:w-auto"
            >
              Ver landing
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg viewBox="0 0 1440 80" className="block h-12 w-full sm:h-16" preserveAspectRatio="none">
            <path
              fill="#ffffff"
              d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"
            />
          </svg>
        </div>
      </section>

      <section id="web360-features" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
            >
              <div className={`mb-4 inline-flex rounded-xl p-2.5 ${f.iconBg}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">{f.title}</h3>
              <p className="mb-5 text-sm leading-relaxed text-slate-500">{f.description}</p>
              <div className={`h-0.5 w-full rounded-full bg-gradient-to-r ${f.line}`} />
            </article>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <A360Slot slot="featured" marca={MARCA} solucion={SOLUCION} />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="mb-2 text-center text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Preview
        </h2>
        <p className="mx-auto mb-8 max-w-lg text-center text-sm text-slate-500 sm:text-base">
          Del prompt al sitio publicado en pocos pasos.
        </p>
        <div className="mb-8 flex flex-wrap justify-center gap-3 sm:gap-4">
          {previewTiles.map((t) => (
            <div
              key={t.label}
              className={`flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-white shadow-sm sm:h-28 sm:w-28 ${t.border}`}
            >
              <t.icon className="h-6 w-6 text-slate-700" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {t.label}
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onEnter}
          className="mx-auto flex items-center gap-2 text-sm font-black uppercase tracking-[0.25em] text-[#26A69A] transition hover:text-[#1e8a80]"
        >
          Ir a WEB 360 <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <A360Slot slot="sectors" marca={MARCA} solucion={SOLUCION} />
      </div>
    </div>
  );
}
