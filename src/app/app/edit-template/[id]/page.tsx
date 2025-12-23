'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiService, type Template } from '@/lib/api';
import { Loader2, Save, Eye, ArrowLeft, Download, Share2, Code } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
  const [namespace, setNamespace] = useState('');
  const [code, setCode] = useState('');

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

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const templates = await apiService.getTemplates();
      const found = templates.find(t => t.id === templateId);
      if (found) {
        setTemplate(found);
        setName(found.name);
        setNamespace(found.namespace);
        setCode(found.code || '');
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
      await apiService.updateTemplate(template.id, {
        name,
        namespace,
        code,
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
              <p className="text-sm text-muted-foreground">Namespace: {namespace}</p>
            </div>
          </div>
          <div className="flex gap-2">
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
              <Label htmlFor="edit-namespace">Namespace</Label>
              <Input
                id="edit-namespace"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Código HTML</Label>
              <Textarea
                id="edit-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="min-h-[300px] font-mono text-xs"
              />
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
                srcDoc={code}
                title="Template Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </TabsContent>
            <TabsContent value="code" className="flex-1 m-0 relative">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="HTML code..."
                className="absolute inset-0 w-full h-full resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-xs bg-[#1e1e1e] text-gray-300 p-4"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

