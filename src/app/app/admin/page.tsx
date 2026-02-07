'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiService, toShortNamespace, type Template } from '@/lib/api';
import { Loader2, Edit, Trash2, Eye, Copy, CheckCircle2, RefreshCw, Share2, ExternalLink, Sparkles, Wand2 } from 'lucide-react';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al cargar templates',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setEditName(template.name);
    setEditCode(template.code || ''); // code is mapped from namespace by getTemplates()
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      // namespace: short id (max 100 chars). code: HTML content
      await apiService.updateTemplate(selectedTemplate.id, {
        name: editName,
        emailDesigner: selectedTemplate.emailDesigner,
        namespace: toShortNamespace(editName),
        code: editCode,
        email: selectedTemplate.email,
        hidden: selectedTemplate.hidden,
      });
      
      toast({
        title: 'Template actualizado',
        description: `Template "${editName}" actualizado exitosamente`,
      });
      
      setShowEditDialog(false);
      loadTemplates();
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

  const handleDelete = async (template: Template) => {
    if (!confirm(`¿Estás seguro de eliminar el template "${template.name}"?`)) {
      return;
    }

    try {
      await apiService.deleteTemplate(template.id);
      toast({
        title: 'Template eliminado',
        description: `Template "${template.name}" eliminado exitosamente`,
      });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al eliminar template',
      });
    }
  };

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleCopyUrl = async (template: Template) => {
    // URL para editar el template
    const editUrl = `${window.location.origin}/app/edit-template/${template.id}`;
    try {
      await navigator.clipboard.writeText(editUrl);
      toast({
        title: 'URL copiada',
        description: 'La URL de edición ha sido copiada al portapapeles',
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

  const handleViewTemplate = (template: Template) => {
    router.push(`/app/edit-template/${template.id}`);
  };

  const handleAIEditor = (template: Template) => {
    router.push(`/app/ai-editor/${template.id}`);
  };

  const handleShareTemplate = async (template: Template) => {
    const shareUrl = `${window.location.origin}/app/view-template/${template.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'URL de compartir copiada',
        description: 'La URL para compartir ha sido copiada al portapapeles',
      });
    } catch (error) {
      console.error('Error copying share URL:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al copiar URL de compartir',
      });
    }
  };

  const handleCopyId = async (id: number) => {
    try {
      await navigator.clipboard.writeText(String(id));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: 'ID copiado',
        description: 'El ID ha sido copiado al portapapeles',
      });
    } catch (error) {
      console.error('Error copying ID:', error);
    }
  };

  const getTemplateSize = (code?: string) => {
    if (!code) return '0 bytes';
    const size = new Blob([code]).size;
    return `${size} bytes`;
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const pendingTemplates = templates.filter(t => !t.code || t.code.trim() === '').length;
  const totalTemplates = templates.length;

  return (
    <div className="flex-1 space-y-6 p-6 bg-gray-900 min-h-screen">
      {/* Header con estadísticas y botón actualizar */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-400">Pendientes de subir: {pendingTemplates}</p>
          <p className="text-sm text-gray-400">Total Templates: {totalTemplates}</p>
        </div>
        <Button 
          onClick={loadTemplates} 
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Actualizar Lista
        </Button>
      </div>

      {/* Grid de templates */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-gray-400">No hay templates guardados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template) => (
            <Card key={template.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
              <CardContent className="p-0">
                {/* Preview del template */}
                <div className="relative bg-white aspect-square flex items-center justify-center border-b border-gray-700">
                  {template.code ? (
                    <iframe
                      srcDoc={template.code}
                      title={template.name}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  ) : (
                    <div className="text-gray-500 text-sm">Sin preview</div>
                  )}
                </div>
                
                {/* Información del template */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-blue-400 font-semibold text-lg">{template.name}</h3>
                    <p className="text-gray-400 text-sm">Template Guardado</p>
                  </div>
                  
                  {/* Estado */}
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">En Servidor</span>
                  </div>
                  
                  {/* Información del archivo */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{getTemplateSize(template.code)} • html</p>
                    <p>{new Date(template.created_at).toLocaleDateString()}</p>
                  </div>
                  
                  {/* Acción principal - AI Editor */}
                  <div className="pt-2 border-t border-gray-700">
                    <Button
                      size="sm"
                      onClick={() => handleAIEditor(template)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Editar con AI
                    </Button>
                  </div>
                  
                  {/* URLs y acciones */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                    >
                      <Edit className="mr-2 h-3 w-3" />
                      Editar Rápido
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      className="bg-gray-700 border-gray-600 text-red-400 hover:bg-gray-600 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de edición */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
            <DialogDescription>
              Edita el template guardado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Código HTML</Label>
              <Textarea
                id="edit-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                className="min-h-[400px] font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Preview del template ID: {selectedTemplate?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedTemplate?.code && (
              <iframe
                srcDoc={selectedTemplate.code}
                title="Template Preview"
                className="w-full h-[600px] border rounded"
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cerrar
            </Button>
            {selectedTemplate && (
              <Button onClick={() => {
                setShowPreview(false);
                handleEdit(selectedTemplate);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
