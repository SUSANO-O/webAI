'use client';
import { useState, useActionState, useRef, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { Wand2, Download, Code, Eye, Loader2, Hourglass, Monitor, Tablet, Smartphone, History, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateWebsiteAction } from '../actions';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { apiService, toShortNamespace, type CreateTemplateData } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

// ─── Template Options ──────────────────────────────────────────────

type TemplateOption = {
  id: string;
  name: string;
  prompt: string;
  image: (typeof PlaceHolderImages)[0];
};

const websiteTemplates: TemplateOption[] = [
  { id: 't1', name: 'Personal Portfolio', prompt: 'a modern and minimalist personal portfolio website for a software developer named Alex Doe. Include sections for about, projects, and contact.', image: PlaceHolderImages[0] },
  { id: 't2', name: 'Blog', prompt: 'a clean and minimal blog about travel and photography. The main page should show a list of recent articles with titles, summaries, and featured images.', image: PlaceHolderImages[1] },
  { id: 't3', name: 'Landing Page', prompt: 'a professional landing page for a new SaaS product that helps teams collaborate. It should have a strong hero section with a call-to-action, a features section, and a pricing table.', image: PlaceHolderImages[3] },
  { id: 't4', name: 'Restaurant', prompt: 'A website for a modern Italian restaurant named "La Bella Vita". It should have a hero section with a picture of the restaurant, an "About Us" section, a menu section, and a contact/reservation section.', image: PlaceHolderImages[4] },
  { id: 't5', name: 'Small Business', prompt: 'A professional website for "Oakwood Plumbing Services". It should list their services (e.g., emergency repairs, pipe installation), include customer testimonials, and a clear contact form.', image: PlaceHolderImages[5] },
  { id: 't6', name: 'Tech Startup', prompt: 'Design a world-class, venture-capital-ready landing page for a cutting-edge AI-powered SaaS startup called "NexaFlow". The page must convey authority, innovation, and trust. Include: (1) A bold hero section with a compelling headline like "The Future of Intelligent Automation" and a subheadline explaining the core value proposition, with a primary CTA button "Start Free Trial" and a secondary "Watch Demo" button; (2) A social-proof bar showing logos of notable companies (Fortune 500 style); (3) A features section with 3 cards highlighting AI automation, real-time analytics, and enterprise security — each with an icon, title, and two-line description; (4) A "How It Works" section with 3 numbered steps; (5) A pricing section with 3 tiers (Starter, Pro, Enterprise) with feature lists and CTAs; (6) A testimonials section with 3 quotes from CTOs and VPs; (7) A final full-width CTA banner; and (8) A footer with navigation links, social media icons, and a newsletter signup. Use a dark, modern color palette with deep navy, electric blue accents, and bright white typography. The design must be pixel-perfect, fully responsive, and feel like a $10M product.', image: PlaceHolderImages[2] },
];

// ─── Generation History ────────────────────────────────────────────

interface GenerationHistoryEntry {
  id: string;
  prompt: string;
  content: string;
  timestamp: number;
}

const HISTORY_KEY = 'webai_gen_history';
const MAX_HISTORY = 5;

function loadHistory(): GenerationHistoryEntry[] {
  try {
    return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(entries: GenerationHistoryEntry[]) {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

// ─── Initial States ────────────────────────────────────────────────

const initialWebsiteState = {
  websiteContent: `
<div class="h-full w-full bg-gray-100 flex items-center justify-center">
  <div class="text-center text-gray-500">
    <h2 class="text-2xl font-semibold font-headline">Your website will appear here</h2>
    <p class="mt-2">Enter a prompt or select a template to get started.</p>
  </div>
</div>
`,
  error: null,
  usedFallback: false,
};

// ─── Dashboard Component ───────────────────────────────────────────

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export default function Dashboard() {
  // Website state
  const [websiteState, websiteFormAction, websiteIsPending] = useActionState(generateWebsiteAction, initialWebsiteState);
  const [editedContent, setEditedContent] = useState(websiteState.websiteContent);

  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [openingInEditor, setOpeningInEditor] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('Iniciando generación...');
  const [showDone, setShowDone] = useState(false);

  // Responsive preview
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');

  // Generation history
  const [genHistory, setGenHistory] = useState<GenerationHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const isPending = websiteIsPending;

  // Load history on mount
  useEffect(() => {
    setGenHistory(loadHistory());
  }, []);

  // Sync state changes
  useEffect(() => {
    setEditedContent(websiteState.websiteContent);
    if (websiteState.error) {
      toast({ variant: 'destructive', title: 'Error', description: websiteState.error });
    }
    if (websiteState.usedFallback) {
      toast({
        title: 'Usando modelo alternativo',
        description: 'Gemini no estaba disponible. Se usó Hugging Face como fallback.',
      });
    }
  }, [websiteState]);

  // Save to history when content is generated
  useEffect(() => {
    const isDefault = websiteState.websiteContent === initialWebsiteState.websiteContent;
    if (!isPending && !websiteState.error && !isDefault && prompt) {
      const entry: GenerationHistoryEntry = {
        id: Date.now().toString(),
        prompt: prompt.slice(0, 120),
        content: websiteState.websiteContent,
        timestamp: Date.now(),
      };
      const updated = [entry, ...loadHistory()].slice(0, MAX_HISTORY);
      saveHistory(updated);
      setGenHistory(updated);
    }
  }, [websiteState.websiteContent, isPending]);

  // Progress simulation
  useEffect(() => {
    if (!isPending) {
      if (progress > 0) {
        // Animate to 100% then show done
        setProgress(100);
        setGenerationStatus('¡Listo!');
        setShowDone(true);
        const t = setTimeout(() => {
          setProgress(0);
          setShowDone(false);
        }, 1200);
        return () => clearTimeout(t);
      }
      return;
    }
    setProgress(0);
    setShowDone(false);
    setGenerationStatus('Generando tu página web...');

    const statuses = ['Analizando tu prompt...', 'Diseñando estructura...', 'Aplicando estilos...', 'Generando contenido...', 'Optimizando responsive...', 'Finalizando...'];

    let statusIndex = 0;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8 + 2;
      });
      if (statusIndex < statuses.length) {
        setGenerationStatus(statuses[statusIndex]);
        statusIndex++;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPending]);

  const handleTemplateSelect = (template: TemplateOption) => {
    setPrompt(template.prompt);
    setSelectedTemplate(template.id);
  };

  const handleDownload = () => {
    const blob = new Blob([editedContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveTemplate = async () => {
    if (!saveTemplateName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingresa un nombre para el template' });
      return;
    }
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes estar autenticado' });
      return;
    }

    setSaving(true);
    try {
      const templateData: CreateTemplateData = {
        name: saveTemplateName,
        namespace: toShortNamespace(saveTemplateName),
        code: editedContent,
        emailDesigner: user.email,
        email: user.email,
        hidden: false,
      };

      await apiService.createTemplate(templateData);
      toast({ title: 'Template guardado', description: `"${saveTemplateName}" guardado exitosamente` });
      setShowSaveDialog(false);
      setSaveTemplateName('');
    } catch (error) {
      console.error('Error guardando template:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenInEditor = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Login Required', description: 'You must be logged in.' });
      router.push('/login');
      return;
    }
    setOpeningInEditor(true);
    try {
      const name = `Generado - ${new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
      const templateData: CreateTemplateData = {
        name,
        namespace: toShortNamespace(name),
        code: editedContent,
        emailDesigner: user.email,
        email: user.email,
        hidden: false,
      };
      const created = await apiService.createTemplate(templateData);
      toast({ title: 'Abriendo editor...', description: `Template guardado como "${name}"` });
      router.push(`/app/ai-editor/${created.id}`);
    } catch (error) {
      console.error('Error opening in editor:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'No se pudo abrir el editor' });
    } finally {
      setOpeningInEditor(false);
    }
  };

  const handleRestoreFromHistory = (entry: GenerationHistoryEntry) => {
    setEditedContent(entry.content);
    setPrompt(entry.prompt);
    setShowHistory(false);
    toast({ title: 'Restaurado', description: 'Se restauró la generación anterior' });
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!user || !storedUser) {
      e.preventDefault();
      toast({ variant: 'destructive', title: 'Login Required', description: 'You must be logged in.' });
      router.push('/login');
      return;
    }
    if (!prompt.trim()) {
      e.preventDefault();
      toast({ variant: 'destructive', title: 'Prompt Required', description: 'Please enter a prompt or select a template.' });
      return;
    }
  };

  const isDefaultContent = editedContent === initialWebsiteState.websiteContent;

  const iframeWidthClass = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[390px]',
  }[deviceMode];

  return (
    <div className="flex flex-1 relative p-4 gap-4">
      {/* Left Panel */}
      <div className="w-[420px] flex flex-col z-10 rounded-2xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-sm border border-white/50">
        {/* Panel header bar - orange→teal gradient */}
        <div className="section-bar p-4">
          <h2 className="font-headline text-lg font-bold text-white drop-shadow">🎨 Generate Website</h2>
          <p className="text-xs text-white/80 mt-1">
            Create landing pages, portfolios, and static sites
          </p>
        </div>

        <div className="flex-1 p-4 space-y-5 overflow-y-auto">
          {/* Templates section header */}
          <div>
            <div className="section-bar rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
              <span className="text-white font-bold text-sm font-headline">📐 From a Template</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {websiteTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={cn('cursor-pointer hover:shadow-xl transition-all hover:-translate-y-0.5 border-2', selectedTemplate === template.id ? 'ring-2 ring-orange-400 border-orange-300 shadow-orange-200 shadow-lg' : 'border-transparent')}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-0">
                    <Image src={template.image.imageUrl} alt={template.name} width={200} height={133} data-ai-hint={template.image.imageHint} className="rounded-t-lg aspect-[3/2] object-cover" />
                    <p className="text-xs font-medium p-2">{template.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-teal-200"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-teal-500 font-semibold">Or</span></div>
          </div>

          {/* Prompt Form */}
          <form
            action={websiteFormAction}
            ref={formRef}
            onSubmit={handleFormSubmit}
            className="space-y-4"
          >
            <div>
              <div className="section-bar rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                <span className="text-white font-bold text-sm font-headline">✏️ From a Prompt</span>
              </div>
              <Textarea
                name="prompt"
                placeholder="e.g., A personal blog about cooking..."
                className="min-h-[120px] text-sm border-teal-200 focus-visible:ring-orange-400"
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); setSelectedTemplate(null); }}
              />
            </div>
            <Button
              type="submit"
              className="w-full gradient-primary text-white font-bold shadow-lg hover:opacity-90 hover:shadow-xl transition-all hover:-translate-y-0.5 border-0"
              disabled={isPending || authLoading || !user}
              onClick={(e) => {
                const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
                if (!user || !storedUser) {
                  e.preventDefault();
                  e.stopPropagation();
                  toast({ variant: 'destructive', title: 'Login Required', description: 'You must be logged in.' });
                  router.push('/login');
                  return false;
                }
              }}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Wand2 />}
              {authLoading ? 'Loading...' : !user ? 'Login Required' : isPending ? 'Generando...' : 'Generate Website'}
            </Button>
          </form>

          {/* Generation History */}
          {genHistory.length > 0 && (
            <div>
              <button
                className="w-full flex items-center justify-between text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors py-1"
                onClick={() => setShowHistory(v => !v)}
              >
                <span className="flex items-center gap-1">
                  <History className="h-3 w-3" />
                  Historial reciente ({genHistory.length})
                </span>
                {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1">
                  {genHistory.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => handleRestoreFromHistory(entry)}
                      className="w-full text-left text-xs p-2 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-100 transition-colors"
                    >
                      <span className="text-gray-700 line-clamp-2">{entry.prompt}</span>
                      <span className="text-gray-400 text-[10px] mt-0.5 block">
                        {new Date(entry.timestamp).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {(isPending || showDone) && (
        <div className="fixed inset-0 z-[100] backdrop-blur-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(141,164,74,0.85) 0%, rgba(46,196,196,0.85) 100%)' }}>
          <div className="relative w-full max-w-lg mx-4">
            <div className="relative w-80 h-80 mx-auto">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-300/40 via-yellow-300/50 to-teal-400/60 animate-pulse"></div>
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-orange-400/50 via-teal-300/60 to-teal-500/70 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <div className="absolute inset-12 rounded-full bg-gradient-to-br from-orange-400/40 via-teal-500/50 to-teal-600/60 blur-2xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-48 rounded-full bg-gradient-to-b from-orange-500/70 via-teal-500/80 to-teal-700/90 blur-sm transform -rotate-12"></div>
              <div className="absolute top-6 left-10 w-20 h-24 rounded-full bg-orange-300/30 blur-xl animate-bounce" style={{ animationDuration: '4s' }}></div>
              <div className="absolute bottom-10 right-14 w-24 h-20 rounded-full bg-teal-400/30 blur-xl animate-bounce" style={{ animationDuration: '5s', animationDelay: '1.5s' }}></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center z-10">
                <div className="relative w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl">
                  {showDone
                    ? <span className="text-2xl">✓</span>
                    : <Hourglass className="w-7 h-7 text-orange-500 animate-spin" style={{ animationDuration: '2s' }} />
                  }
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-orange-400/50 animate-ping"></div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 mx-8">
              <div className="w-full bg-white/30 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-white transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-white/80 text-xs mt-1">{Math.round(progress)}%</p>
            </div>
            <div className="mt-6 text-center space-y-2">
              <h3 className="font-headline text-3xl font-bold text-white drop-shadow-lg">
                {showDone ? '¡Página lista!' : 'Generando tu página web'}
              </h3>
              <p className="text-base text-white/90 font-medium drop-shadow">
                {generationStatus}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col relative rounded-2xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-sm border border-white/50">
        <Tabs defaultValue="preview" className="flex-1 flex flex-col">
          <div className="section-bar p-2 px-3 flex items-center justify-between">
            <TabsList className="bg-white/20 border border-white/30">
              <TabsTrigger value="preview" className="data-[state=active]:bg-white data-[state=active]:text-orange-500 text-white font-medium"><Eye className="mr-2 h-4 w-4" />Preview</TabsTrigger>
              <TabsTrigger value="customize" className="data-[state=active]:bg-white data-[state=active]:text-teal-500 text-white font-medium"><Code className="mr-2 h-4 w-4" />Customize</TabsTrigger>
            </TabsList>

            {/* Device toggle */}
            <div className="flex items-center gap-1 bg-white/20 rounded-lg p-0.5 border border-white/30">
              <button
                onClick={() => setDeviceMode('desktop')}
                className={cn('p-1.5 rounded-md transition-all', deviceMode === 'desktop' ? 'bg-white text-orange-500' : 'text-white hover:bg-white/20')}
                title="Desktop"
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeviceMode('tablet')}
                className={cn('p-1.5 rounded-md transition-all', deviceMode === 'tablet' ? 'bg-white text-orange-500' : 'text-white hover:bg-white/20')}
                title="Tablet"
              >
                <Tablet className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeviceMode('mobile')}
                className={cn('p-1.5 rounded-md transition-all', deviceMode === 'mobile' ? 'bg-white text-orange-500' : 'text-white hover:bg-white/20')}
                title="Mobile"
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              {!isDefaultContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInEditor}
                  disabled={isPending || openingInEditor}
                  className="bg-white/20 border-white/40 text-white hover:bg-white/30 font-medium"
                >
                  {openingInEditor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                  Abrir en Editor
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={isPending} className="bg-white/20 border-white/40 text-white hover:bg-white/30 font-medium">
                <Download className="mr-2 h-4 w-4" />Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                disabled={!user || isDefaultContent || isPending}
                className="bg-white/20 border-white/40 text-white hover:bg-white/30 font-medium"
              >
                <Save className="mr-2 h-4 w-4" />Save
              </Button>
            </div>
          </div>
          <TabsContent value="preview" className="flex-1 bg-gray-100 m-0 relative overflow-auto flex items-start justify-center">
            <div className={cn('h-full transition-all duration-300', iframeWidthClass, deviceMode !== 'desktop' && 'shadow-2xl mt-4 mb-4 rounded-lg overflow-hidden')}>
              <iframe
                srcDoc={editedContent}
                title="Website Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </TabsContent>
          <TabsContent value="customize" className="flex-1 m-0 relative">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="HTML code..."
              className="absolute inset-0 w-full h-full resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-xs bg-[#1e1e1e] text-gray-300 p-4"
              disabled={isPending}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar Website</DialogTitle>
            <DialogDescription>
              Guarda el sitio web como template para edición posterior
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nombre</Label>
              <Input
                id="template-name"
                placeholder="Mi sitio web"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTemplate} disabled={saving || !saveTemplateName}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
