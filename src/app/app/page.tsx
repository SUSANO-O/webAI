'use client';
import { useState, useActionState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Wand2, Download, Code, Eye, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateWebsiteAction } from '../actions';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Template = {
  id: string;
  name: string;
  prompt: string;
  image: (typeof PlaceHolderImages)[0];
};

const templates: Template[] = [
  { id: 't1', name: 'Personal Portfolio', prompt: 'a modern and minimalist personal portfolio website for a software developer named Alex Doe. Include sections for about, projects, and contact.', image: PlaceHolderImages[0] },
  { id: 't2', name: 'Blog', prompt: 'a clean and minimal blog about travel and photography. The main page should show a list of recent articles with titles, summaries, and featured images.', image: PlaceHolderImages[1] },
  { id: 't3', name: 'Landing Page', prompt: 'a professional landing page for a new SaaS product that helps teams collaborate. It should have a strong hero section with a call-to-action, a features section, and a pricing table.', image: PlaceHolderImages[3] },
  { id: 't4', name: 'Restaurant', prompt: 'A website for a modern Italian restaurant named "La Bella Vita". It should have a hero section with a picture of the restaurant, an "About Us" section, a menu section, and a contact/reservation section.', image: PlaceHolderImages[4] },
  { id: 't5', name: 'Small Business', prompt: 'A professional website for "Oakwood Plumbing Services". It should list their services (e.g., emergency repairs, pipe installation), include customer testimonials, and a clear contact form.', image: PlaceHolderImages[5] },
];

const initialState = {
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

export default function Dashboard() {
  const [state, formAction, isPending] = useActionState(generateWebsiteAction, initialState);
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState(state.websiteContent);

  useEffect(() => {
    setEditedContent(state.websiteContent);
    if(state.error) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: state.error,
      });
    }
  }, [state, toast]);

  const handleTemplateSelect = (template: Template) => {
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

  return (
    <div className="flex flex-1">
      <div className="w-[400px] border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-headline text-lg font-semibold">Controls</h2>
        </div>
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium mb-2 font-headline">From a Template</h3>
            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className={cn("cursor-pointer hover:shadow-lg transition-shadow", selectedTemplate === template.id && "ring-2 ring-primary")}
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
          
          <form action={formAction} className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2 font-headline">From a Prompt</h3>
              <Textarea
                name="prompt"
                placeholder="e.g., A personal blog about cooking..."
                className="min-h-[120px] text-sm"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setSelectedTemplate(null);
                }}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader className="animate-spin" /> : <Wand2 />}
              Generate Website
            </Button>
          </form>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <Tabs defaultValue="preview" className="flex-1 flex flex-col">
          <div className="border-b p-2 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="preview"><Eye className="mr-2" />Preview</TabsTrigger>
              <TabsTrigger value="customize"><Code className="mr-2" />Customize</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={handleDownload}><Download className="mr-2" />Download Code</Button>
          </div>
          <TabsContent value="preview" className="flex-1 bg-white m-0">
            <iframe
              srcDoc={editedContent}
              title="Website Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </TabsContent>
          <TabsContent value="customize" className="flex-1 m-0 relative">
             <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="HTML code..."
              className="absolute inset-0 w-full h-full resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-xs bg-[#1e1e1e] text-gray-300 p-4"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
