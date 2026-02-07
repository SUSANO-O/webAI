'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiService, toShortNamespace, type Template } from '@/lib/api';
import { 
  Loader2, 
  Send, 
  ArrowLeft, 
  Download, 
  Share2, 
  Save, 
  Check, 
  X,
  Sparkles,
  MessageSquare,
  Code,
  Eye,
  Globe,
  Undo,
  History,
  Lightbulb,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { refineTemplateDirectAction } from '@/app/refine-actions';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  code?: string;
  changesSummary?: string;
  suggestions?: string[];
  timestamp: Date;
}

interface HistoryEntry {
  code: string;
  message: string;
  timestamp: Date;
}

export default function AIEditorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const templateId = parseInt(params.id as string);
  
  // Template state
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [originalCode, setOriginalCode] = useState('');
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // History for undo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Publish dialog
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishDomain, setPublishDomain] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Preview state
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pendingSummary, setPendingSummary] = useState<string>('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load template
  useEffect(() => {
    if (user && templateId) {
      loadTemplate();
    }
  }, [user, templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      console.log('🔍 [AI-Editor] Loading template with ID:', templateId);
      const templates = await apiService.getTemplates();
      console.log('🔍 [AI-Editor] Found templates:', templates.length);
      const found = templates.find(t => t.id === templateId);
      console.log('🔍 [AI-Editor] Found template:', found ? {
        id: found.id,
        name: found.name,
        hasCode: !!found.code,
        codeLength: found.code?.length || 0,
        codePreview: found.code?.substring(0, 200),
      } : 'NOT FOUND');
      
      if (found) {
        const templateCode = found.code || '';
        setTemplate(found);
        setCurrentCode(templateCode);
        setOriginalCode(templateCode);
        console.log('🔍 [AI-Editor] Set currentCode length:', templateCode.length);
        
        // Add initial system message
        setMessages([{
          id: 'system-1',
          role: 'system',
          content: `Hola! Soy tu asistente de diseño web. Estoy listo para ayudarte a mejorar el template "${found.name}". 

Puedes pedirme cosas como:
• "Cambia el color del header a azul oscuro"
• "Agrega una sección de testimonios"
• "Haz el botón más grande y llamativo"
• "Mejora la tipografía y el espaciado"

¿Qué te gustaría cambiar?`,
          timestamp: new Date(),
        }]);
        
        // Initialize history
        setHistory([{
          code: found.code || '',
          message: 'Versión original',
          timestamp: new Date(),
        }]);
        setHistoryIndex(0);
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    // Build conversation history
    const conversationHistory = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    try {
      const result = await refineTemplateDirectAction(
        currentCode,
        userMessage.content,
        conversationHistory
      );

      if (result.success && result.refinedCode) {
        // Store pending changes for user approval
        setPendingCode(result.refinedCode);
        setPendingSummary(result.changesSummary || 'Cambios aplicados');
        setShowAcceptDialog(true);

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.changesSummary || 'He realizado los cambios solicitados.',
          code: result.refinedCode,
          changesSummary: result.changesSummary,
          suggestions: result.suggestions,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Lo siento, hubo un error: ${result.error || 'Error desconocido'}. Por favor intenta de nuevo.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error refining template:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error al procesar tu solicitud: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptChanges = () => {
    if (pendingCode) {
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({
        code: pendingCode,
        message: pendingSummary,
        timestamp: new Date(),
      });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      // Apply changes
      setCurrentCode(pendingCode);
      setPendingCode(null);
      setPendingSummary('');
      setShowAcceptDialog(false);

      toast({
        title: 'Cambios aplicados',
        description: 'Los cambios han sido aceptados. Recuerda guardar cuando termines.',
      });
    }
  };

  const handleRejectChanges = () => {
    setPendingCode(null);
    setPendingSummary('');
    setShowAcceptDialog(false);

    const rejectMessage: ChatMessage = {
      id: `system-reject-${Date.now()}`,
      role: 'system',
      content: 'Cambios rechazados. ¿Qué te gustaría modificar diferente?',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, rejectMessage]);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentCode(history[newIndex].code);
      toast({
        title: 'Deshacer',
        description: `Volviste a: ${history[newIndex].message}`,
      });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentCode(history[newIndex].code);
      toast({
        title: 'Rehacer',
        description: `Avanzaste a: ${history[newIndex].message}`,
      });
    }
  };

  const handleSave = async () => {
    if (!template) return;

    setSaving(true);
    try {
      // namespace: short id (max 100 chars). code: HTML content
      await apiService.updateTemplate(template.id, {
        name: template.name,
        emailDesigner: template.emailDesigner,
        namespace: toShortNamespace(template.name),
        code: currentCode,
        email: template.email,
        hidden: template.hidden,
      });
      
      setOriginalCode(currentCode);
      
      toast({
        title: 'Template guardado',
        description: `Template "${template.name}" actualizado exitosamente`,
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al guardar',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!template || !publishDomain.trim()) return;

    setIsPublishing(true);
    try {
      // First save the template - namespace: short id, code: HTML
      await apiService.updateTemplate(template.id, {
        name: template.name,
        emailDesigner: template.emailDesigner,
        namespace: toShortNamespace(template.name),
        code: currentCode,
        email: template.email,
        hidden: template.hidden,
      });

      // Here you would integrate with your domain/hosting service
      // For now, we'll simulate the publish process
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: 'Sitio publicado',
        description: `Tu sitio está disponible en: ${publishDomain}`,
      });

      setShowPublishDialog(false);
      setPublishDomain('');
    } catch (error) {
      console.error('Error publishing:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al publicar',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template?.name || 'website'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const applySuggestion = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const hasUnsavedChanges = currentCode !== originalCode;

  if (authLoading || loading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
          <p className="text-purple-200">Cargando editor AI...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/app/admin')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h1 className="text-lg font-bold text-white">{template.name}</h1>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                  Sin guardar
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <Undo className="mr-1 h-4 w-4" />
              Deshacer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <Download className="mr-1 h-4 w-4" />
              Descargar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Guardar
            </Button>
            <Button
              onClick={() => setShowPublishDialog(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            >
              <Globe className="mr-1 h-4 w-4" />
              Publicar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel */}
        <div className="w-[400px] flex flex-col border-r border-gray-800 bg-gray-900">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-400" />
              <h2 className="font-semibold text-white">Chat con AI</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Describe los cambios que quieres hacer
            </p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : message.role === 'system'
                        ? 'bg-gray-800 text-gray-300 border border-gray-700'
                        : 'bg-gray-800 text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="flex items-center gap-1 text-xs text-purple-400 mb-2">
                          <Lightbulb className="h-3 w-3" />
                          Sugerencias:
                        </div>
                        <div className="space-y-1">
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => applySuggestion(suggestion)}
                              className="block w-full text-left text-xs text-gray-400 hover:text-purple-300 p-2 rounded bg-gray-900/50 hover:bg-gray-900 transition-colors"
                            >
                              → {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Procesando cambios...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe los cambios que quieres..."
                className="min-h-[60px] max-h-[120px] bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                disabled={isProcessing}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="bg-purple-600 hover:bg-purple-700 h-auto"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500 hover:text-purple-400"
                onClick={() => applySuggestion('Mejora los colores y el diseño')}
              >
                <Zap className="h-3 w-3 mr-1" />
                Mejorar diseño
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500 hover:text-purple-400"
                onClick={() => applySuggestion('Hazlo más moderno y minimalista')}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Modernizar
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="preview" className="flex-1 flex flex-col">
            <div className="border-b border-gray-800 bg-gray-900 p-2">
              <TabsList className="bg-gray-800">
                <TabsTrigger value="preview" className="data-[state=active]:bg-purple-600">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="data-[state=active]:bg-purple-600">
                  <Code className="mr-2 h-4 w-4" />
                  Código
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">
                  <History className="mr-2 h-4 w-4" />
                  Historial ({history.length})
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="preview" className="flex-1 m-0 bg-white">
              <iframe
                srcDoc={pendingCode || currentCode}
                title="Template Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </TabsContent>
            
            <TabsContent value="code" className="flex-1 m-0">
              <Textarea
                value={currentCode}
                onChange={(e) => setCurrentCode(e.target.value)}
                className="w-full h-full resize-none border-0 rounded-none bg-[#1a1a2e] text-gray-300 font-mono text-xs p-4 focus-visible:ring-0"
              />
            </TabsContent>

            <TabsContent value="history" className="flex-1 m-0 overflow-auto bg-gray-900 p-4">
              <div className="space-y-2">
                {history.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      idx === historyIndex
                        ? 'bg-purple-900/30 border-purple-500'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => {
                      setHistoryIndex(idx);
                      setCurrentCode(entry.code);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">{entry.message}</span>
                      <span className="text-xs text-gray-500">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {idx === historyIndex && (
                      <Badge className="mt-2 bg-purple-600">Actual</Badge>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Accept/Reject Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Cambios Generados
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {pendingSummary}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-300">
              Los cambios están siendo mostrados en la vista previa. 
              ¿Quieres aplicarlos o rechazarlos?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleRejectChanges}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <X className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
            <Button
              onClick={handleAcceptChanges}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="mr-2 h-4 w-4" />
              Aceptar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-400" />
              Publicar Sitio Web
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Publica tu template como un sitio web completo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Dominio / Subdominio
              </label>
              <Input
                value={publishDomain}
                onChange={(e) => setPublishDomain(e.target.value)}
                placeholder="mi-sitio.tudominio.com"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h4 className="text-sm font-medium text-white mb-2">El sitio incluirá:</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>✓ Estructura HTML completa</li>
                <li>✓ Estilos Tailwind CSS optimizados</li>
                <li>✓ JavaScript funcional</li>
                <li>✓ Diseño responsive</li>
                <li>✓ Imágenes optimizadas</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!publishDomain.trim() || isPublishing}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Publicar Ahora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
