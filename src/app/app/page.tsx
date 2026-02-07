'use client';
import { useState, useActionState, useRef, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { Wand2, Download, Code, Eye, Loader2, Hourglass } from 'lucide-react';
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
];

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
};

// ─── Dashboard Component ───────────────────────────────────────────

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
  const [progress, setProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('Iniciando generación...');

  const isPending = websiteIsPending;

  // Sync state changes
  useEffect(() => {
    setEditedContent(websiteState.websiteContent);
    if (websiteState.error) {
      toast({ variant: 'destructive', title: 'Error', description: websiteState.error });
    }
  }, [websiteState]);

  // Progress simulation
  useEffect(() => {
    if (!isPending) { setProgress(0); return; }
    setProgress(0);
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

  // Auth check
  useEffect(() => {
    if (!authLoading) {
      console.log('🔐 [Dashboard] Auth:', { user: user?.email, authLoading });
    }
  }, [user, authLoading]);

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

  return (
    <div className="flex flex-1 relative">
      {/* Left Panel */}
      <div className="w-[420px] border-r bg-background flex flex-col z-10">
        <div className="p-4 border-b">
          <h2 className="font-headline text-lg font-semibold">Generate Website</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Create landing pages, portfolios, and static sites
          </p>
        </div>

        <div className="flex-1 p-4 space-y-5 overflow-y-auto">
          {/* Templates */}
          <div>
            <h3 className="text-sm font-medium mb-2 font-headline">From a Template</h3>
            <div className="grid grid-cols-2 gap-3">
              {websiteTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={cn('cursor-pointer hover:shadow-lg transition-shadow', selectedTemplate === template.id && 'ring-2 ring-primary')}
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
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
          </div>

          {/* Prompt Form */}
          <form
            action={websiteFormAction}
            ref={formRef}
            onSubmit={handleFormSubmit}
            className="space-y-4"
          >
            <div>
              <h3 className="text-sm font-medium mb-2 font-headline">From a Prompt</h3>
              <Textarea
                name="prompt"
                placeholder="e.g., A personal blog about cooking..."
                className="min-h-[120px] text-sm"
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); setSelectedTemplate(null); }}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
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
        </div>
      </div>

      {/* Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-purple-50 via-purple-100/50 to-purple-200/30 dark:from-purple-950/80 dark:via-purple-900/60 dark:to-purple-950/80 backdrop-blur-md flex items-center justify-center">
          <div className="relative w-full max-w-lg mx-4">
            <div className="relative w-80 h-80 mx-auto">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-200/40 via-purple-300/50 to-purple-400/60 dark:from-purple-800/30 dark:via-purple-700/40 dark:to-purple-600/50 animate-pulse"></div>
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-300/50 via-purple-400/60 to-purple-500/70 dark:from-purple-700/40 dark:via-purple-600/50 dark:to-purple-500/60 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <div className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-400/40 via-purple-500/50 to-purple-600/60 dark:from-purple-600/30 dark:via-purple-500/40 dark:to-purple-700/50 blur-2xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-48 rounded-full bg-gradient-to-b from-purple-600/70 via-purple-700/80 to-purple-800/90 dark:from-purple-700/60 dark:via-purple-800/70 dark:to-purple-900/80 blur-sm transform -rotate-12"></div>
              <div className="absolute top-6 left-10 w-20 h-24 rounded-full bg-purple-300/30 dark:bg-purple-500/20 blur-xl animate-bounce" style={{ animationDuration: '4s' }}></div>
              <div className="absolute bottom-10 right-14 w-24 h-20 rounded-full bg-purple-400/30 dark:bg-purple-600/20 blur-xl animate-bounce" style={{ animationDuration: '5s', animationDelay: '1.5s' }}></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center z-10">
                <div className="relative w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl">
                  <Hourglass className="w-7 h-7 text-purple-600 dark:text-purple-500 animate-spin" style={{ animationDuration: '2s' }} />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-purple-400/50 dark:border-purple-500/50 animate-ping"></div>
              </div>
            </div>
            <div className="mt-10 text-center space-y-4">
              <h3 className="font-headline text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
                Generando tu página web
              </h3>
              <p className="text-base text-purple-700 dark:text-purple-300 font-medium">
                {generationStatus}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col relative">
        <Tabs defaultValue="preview" className="flex-1 flex flex-col">
          <div className="border-b p-2 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="preview"><Eye className="mr-2" />Preview</TabsTrigger>
              <TabsTrigger value="customize"><Code className="mr-2" />Customize</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={isPending}>
                <Download className="mr-2" />Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                disabled={!user || isDefaultContent || isPending}
              >
                <Save className="mr-2" />Save Template
              </Button>
            </div>
          </div>
          <TabsContent value="preview" className="flex-1 bg-white m-0 relative">
            {isPending ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Generando página web...</p>
                </div>
              </div>
            ) : (
              <iframe
                srcDoc={editedContent}
                title="Website Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            )}
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
