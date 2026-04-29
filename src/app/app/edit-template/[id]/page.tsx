'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiService, toShortNamespace, type Template } from '@/lib/api';
import { Loader2, Save, Eye, ArrowLeft, Download, Share2, Code, Upload } from 'lucide-react';

const MAX_IMAGE_FILE_BYTES = 2 * 1024 * 1024;

function formatHtmlForEditor(rawHtml: string): string {
  const source = rawHtml.trim();
  if (!source) return '';
  if (source.includes('\n') || source.length < 800) return source;

  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
    'param', 'source', 'track', 'wbr', '!doctype',
  ]);

  const tokens = source.replace(/>\s*</g, '><').replace(/></g, '>\n<').split('\n');
  let indent = 0;

  return tokens
    .map((line) => {
      const token = line.trim();
      const isClosingTag = /^<\//.test(token);
      const tagMatch = token.match(/^<\/?([a-zA-Z0-9!:-]+)/);
      const tagName = tagMatch?.[1]?.toLowerCase() ?? '';
      const isSelfClosing = /\/>$/.test(token) || voidTags.has(tagName) || /^<!/.test(token);

      if (isClosingTag) {
        indent = Math.max(indent - 1, 0);
      }

      const formatted = `${'  '.repeat(indent)}${token}`;

      if (!isClosingTag && !isSelfClosing && /^<[^/!][^>]*>$/.test(token)) {
        indent += 1;
      }

      return formatted;
    })
    .join('\n');
}

export default function EditTemplatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const templateId = parseInt(params.id as string);
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [directTextMode, setDirectTextMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewImageTargetRef = useRef<HTMLImageElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const [imageEditOpen, setImageEditOpen] = useState(false);
  const [imageEditSrc, setImageEditSrc] = useState('');
  const [imageEditAlt, setImageEditAlt] = useState('');
  const [imageFileReading, setImageFileReading] = useState(false);

  const serializeIframeDocument = (doc: Document) => {
    const doctype = doc.doctype?.name ? `<!DOCTYPE ${doc.doctype.name}>` : '<!DOCTYPE html>';
    return `${doctype}\n${doc.documentElement.outerHTML}`;
  };

  const applyVisualEditableState = (doc: Document, enabled: boolean) => {
    const editableSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'span', 'a', 'li', 'button', 'label',
      'strong', 'em', 'small', 'td', 'th',
    ];

    const elements = doc.querySelectorAll<HTMLElement>(editableSelectors.join(','));
    elements.forEach((el) => {
      const hasDirectText = el.childElementCount === 0 && (el.textContent?.trim()?.length ?? 0) > 0;
      if (hasDirectText) {
        if (enabled) {
          el.setAttribute('contenteditable', 'true');
          el.setAttribute('spellcheck', 'false');
        } else {
          el.removeAttribute('contenteditable');
          el.removeAttribute('spellcheck');
        }
      }
    });
  };

  const preventNavigationWhileEditing = useCallback((event: MouseEvent) => {
    if (!directTextMode) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('a')) {
      event.preventDefault();
    }
  }, [directTextMode]);

  const handleImageClick = useCallback((event: MouseEvent) => {
    if (!directTextMode) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const image = target.closest('img') as HTMLImageElement | null;
    if (!image) return;

    event.preventDefault();
    event.stopPropagation();

    previewImageTargetRef.current = image;
    setImageEditSrc(image.getAttribute('src') || '');
    setImageEditAlt(image.getAttribute('alt') || '');
    setImageEditOpen(true);
  }, [directTextMode]);

  const handleImageEditApply = () => {
    const img = previewImageTargetRef.current;
    if (!img) {
      setImageEditOpen(false);
      return;
    }

    const trimmed = imageEditSrc.trim();
    if (trimmed) {
      img.setAttribute('src', trimmed);
    }
    img.setAttribute('alt', imageEditAlt.trim());

    setImageEditOpen(false);
    previewImageTargetRef.current = null;

    toast({
      title: 'Imagen actualizada',
      description: 'Usa "Aplicar cambios visuales" y luego "Guardar" para persistir.',
    });
  };

  const handleImageEditDialogOpenChange = (open: boolean) => {
    setImageEditOpen(open);
    if (!open) {
      previewImageTargetRef.current = null;
    }
  };

  const handlePickLocalImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Archivo no valido',
        description: 'Elige un archivo de imagen (jpg, png, webp, gif, svg, etc.).',
      });
      return;
    }

    if (file.size > MAX_IMAGE_FILE_BYTES) {
      toast({
        variant: 'destructive',
        title: 'Imagen demasiado grande',
        description: `Maximo ${Math.round(MAX_IMAGE_FILE_BYTES / (1024 * 1024))} MB. Reduce el tamano o usa una URL.`,
      });
      return;
    }

    setImageFileReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setImageEditSrc(result);
      setImageFileReading(false);
      toast({
        title: 'Imagen cargada',
        description: 'Se incrustara como data URL en el HTML al aplicar.',
      });
    };
    reader.onerror = () => {
      setImageFileReading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo leer el archivo.',
      });
    };
    reader.readAsDataURL(file);
  };

  const syncDirectModeInIframe = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Evitamos designMode global porque en algunos templates bloquea eventos.
    doc.designMode = 'off';
    if (doc.body) {
      doc.body.contentEditable = directTextMode ? 'true' : 'false';
    }
    applyVisualEditableState(doc, directTextMode);

    let styleTag = doc.getElementById('direct-text-mode-style');
    if (directTextMode && !styleTag) {
      styleTag = doc.createElement('style');
      styleTag.id = 'direct-text-mode-style';
      styleTag.textContent = `
        [contenteditable="true"]:hover { outline: 1px dashed rgba(180, 70, 50, 0.45) !important; }
        [contenteditable="true"]:focus { outline: 2px solid rgba(180, 70, 50, 0.75) !important; }
        img:hover { cursor: pointer !important; }
      `;
      doc.head.appendChild(styleTag);
    } else if (!directTextMode && styleTag) {
      styleTag.remove();
    }

    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.document.removeEventListener('click', preventNavigationWhileEditing, true);
      win.document.removeEventListener('click', handleImageClick, true);
      if (directTextMode) {
        win.document.addEventListener('click', preventNavigationWhileEditing, true);
        win.document.addEventListener('click', handleImageClick, true);
      } else {
        win.document.removeEventListener('click', preventNavigationWhileEditing, true);
        win.document.removeEventListener('click', handleImageClick, true);
      }
    }
  };

  const handleApplyDirectTextChanges = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    setCode(formatHtmlForEditor(serializeIframeDocument(doc)));
    toast({
      title: 'Texto sincronizado',
      description: 'Los cambios visuales fueron aplicados al código HTML.',
    });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && templateId) {
      loadTemplate();
    }
  }, [user, templateId]);

  useEffect(() => {
    syncDirectModeInIframe();
  }, [directTextMode, code]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const templates = await apiService.getTemplates();
      const found = templates.find(t => t.id === templateId);
      if (found) {
        setTemplate(found);
        setName(found.name);
        setCode(formatHtmlForEditor(found.code || ''));
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Template no encontrado',
        });
        router.push('/app/admin');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al cargar template',
      });
      router.push('/app/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;

    setSaving(true);
    try {
      // namespace: short id (max 100 chars). code: HTML content
      await apiService.updateTemplate(template.id, {
        name,
        emailDesigner: template.emailDesigner,
        namespace: toShortNamespace(name),
        code,
        email: template.email,
        hidden: template.hidden,
      });
      
      toast({
        title: 'Template actualizado',
        description: `Template "${name}" actualizado exitosamente`,
      });
      
      // Recargar el template
      loadTemplate();
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al actualizar template',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'template'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/app/view-template/${templateId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'URL copiada',
        description: 'La URL de compartir ha sido copiada al portapapeles',
      });
    } catch (error) {
      console.error('Error copying URL:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al copiar URL',
      });
    }
  };

  if (authLoading || loading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/40">
      <Dialog open={imageEditOpen} onOpenChange={handleImageEditDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar imagen</DialogTitle>
            <DialogDescription>
              Pega una URL o sube un archivo desde tu equipo. Las imagenes locales se guardan como data URL dentro del HTML.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="image-src-url">URL o data URL (src)</Label>
              <Input
                id="image-src-url"
                value={imageEditSrc}
                onChange={(ev) => setImageEditSrc(ev.target.value)}
                placeholder="https://..."
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Archivo local</Label>
              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePickLocalImage}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={imageFileReading}
                onClick={() => imageFileInputRef.current?.click()}
              >
                {imageFileReading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Subir imagen
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-alt">Texto alternativo (alt)</Label>
              <Input
                id="image-alt"
                value={imageEditAlt}
                onChange={(ev) => setImageEditAlt(ev.target.value)}
                placeholder="Descripcion de la imagen"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleImageEditDialogOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleImageEditApply} disabled={!imageEditSrc.trim()}>
              Aplicar a la imagen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/app/admin')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-headline font-bold">{name}</h1>
              <p className="text-sm text-muted-foreground">ID: {template?.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleApplyDirectTextChanges}
            >
              Aplicar cambios visuales
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Compartir
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panel izquierdo - Edición */}
        <div className="w-[400px] border-r bg-background flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-headline text-lg font-semibold">Editar Template</h2>
          </div>
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-1">
                  <Label htmlFor="direct-visual-switch">Edicion visual en Preview</Label>
                  <p className="text-xs text-muted-foreground">
                    Activa para editar textos e imagenes sobre el layout.
                  </p>
                </div>
                <Switch
                  id="direct-visual-switch"
                  checked={directTextMode}
                  onCheckedChange={setDirectTextMode}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho - Preview */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="preview" className="flex-1 flex flex-col">
            <div className="border-b p-2">
              <TabsList>
                <TabsTrigger value="preview">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code">
                  <Code className="mr-2 h-4 w-4" />
                  Código
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="preview" className="flex-1 bg-white m-0">
              <iframe
                ref={iframeRef}
                srcDoc={code}
                title="Template Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
                onLoad={syncDirectModeInIframe}
              />
            </TabsContent>
            <TabsContent value="code" className="flex-1 m-0 relative">
              <Editor
                height="100%"
                defaultLanguage="html"
                value={code}
                onChange={(value) => setCode(value ?? '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 13,
                  automaticLayout: true,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  formatOnPaste: true,
                  formatOnType: true,
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

