'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiService, type Template } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function ViewTemplatePage() {
  const params = useParams();
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
      if (found) setTemplate(found);
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

  const templateCode = template?.code || '';

  if (!template || !templateCode) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <p className="text-white text-xl">Template no encontrado</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <iframe
        srcDoc={templateCode}
        title={template.name}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
