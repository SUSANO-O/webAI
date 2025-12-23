'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiService, type Template } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function ViewTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = parseInt(params.id as string);
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const templates = await apiService.getTemplates();
      const found = templates.find(t => t.id === templateId);
      if (found) {
        setTemplate(found);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!template || !template.code) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Template no encontrado</p>
          <Button onClick={() => router.push('/app/admin')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-4">
        <Button
          variant="outline"
          onClick={() => router.push('/app/admin')}
          className="mb-4 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div className="text-white mb-4">
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-gray-400">Namespace: {template.namespace}</p>
        </div>
      </div>
      <div className="w-full h-[calc(100vh-120px)]">
        <iframe
          srcDoc={template.code}
          title={template.name}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}

