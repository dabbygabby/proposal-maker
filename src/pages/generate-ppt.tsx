/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertCircle, Settings, ChevronDown, ChevronRight, FileText, Loader2, Palette, Copy, Eye, Download } from "lucide-react";

interface Slide {
  id: string;
  title: string;
  content: string;
  type: 'title' | 'content' | 'bullet' | 'image' | 'mixed';
  bullets?: string[];
  imagePlaceholder?: string;
}

interface SystemPrompt {
  _id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  isActive: boolean;
}

interface DesignLibrary {
  _id: string;
  name: string;
  description: string;
  cssVariables: string;
  analysisResult: string;
  systemPromptId: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface JsonResponse {
  slides: Slide[];
  totalSlides: number;
  presentationTitle: string;
}

interface HtmlResponse {
  html: string;
  designLibraryName: string;
  presentationTitle: string;
  totalSlides: number;
}

const GeneratePPTPage = () => {
  const { status } = useSession();
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-120b");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [designLibraries, setDesignLibraries] = useState<DesignLibrary[]>([]);
  const [selectedDesignLibrary, setSelectedDesignLibrary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false);
  const [jsonResult, setJsonResult] = useState<JsonResponse | null>(null);
  const [htmlResult, setHtmlResult] = useState<HtmlResponse | null>(null);
  const [error, setError] = useState("");
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set());
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);

  const models = [
    { value: "openai/gpt-oss-20b", label: "GPT-Oss-20B (Faster)" },
    { value: "openai/gpt-oss-120b", label: "GPT-Oss-120B (More Capable)" }
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchSystemPrompts();
      fetchDesignLibraries();
    }
  }, [status, router]);

  const fetchSystemPrompts = async () => {
    try {
      const res = await fetch("/api/system-prompts?category=presentation&active=true");
      if (res.ok) {
        const data = await res.json();
        setSystemPrompts(data);
      }
    } catch (error) {
      console.error("Error fetching system prompts:", error);
    }
  };

  const fetchDesignLibraries = async () => {
    try {
      const res = await fetch("/api/design-library");
      if (res.ok) {
        const data = await res.json();
        setDesignLibraries(data);
      }
    } catch (error) {
      console.error("Error fetching design libraries:", error);
    }
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to convert");
      return;
    }

    setIsGenerating(true);
    setError("");
    setJsonResult(null);
    setHtmlResult(null);

    try {
      const res = await fetch("/api/text-to-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: inputText,
          model: selectedModel,
          systemPromptId: selectedPrompt || undefined
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setJsonResult(data);
        // Expand all slides by default
        const slideIds = new Set(data.slides.map((slide: Slide) => slide.id));
        setExpandedSlides(slideIds as Set<string>);
      } else {
        setError(data.message || "An error occurred");
      }
    } catch (error: any) {
      console.error("Error generating JSON:", error);
      setError("An error occurred while generating JSON");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateHtml = async () => {
    if (!jsonResult || !selectedDesignLibrary) {
      setError("Please generate JSON first and select a design library");
      return;
    }

    setIsGeneratingHtml(true);
    setError("");

    try {
      const res = await fetch("/api/generate-html-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonData: jsonResult,
          designLibraryId: selectedDesignLibrary
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setHtmlResult(data);
      } else {
        setError(data.message || "An error occurred while generating HTML");
      }
    } catch (error: any) {
      console.error("Error generating HTML:", error);
      setError("An error occurred while generating HTML");
    } finally {
      setIsGeneratingHtml(false);
    }
  };

  const copyHtmlToClipboard = async () => {
    if (!htmlResult?.html) return;
    
    try {
      await navigator.clipboard.writeText(htmlResult.html);
      // You could add a toast notification here
      alert("HTML copied to clipboard!");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      setError("Failed to copy HTML to clipboard");
    }
  };

  const downloadHtml = () => {
    if (!htmlResult?.html) return;
    
    const blob = new Blob([htmlResult.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${htmlResult.presentationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSlideExpansion = (slideId: string) => {
    const newExpanded = new Set(expandedSlides);
    if (newExpanded.has(slideId)) {
      newExpanded.delete(slideId);
    } else {
      newExpanded.add(slideId);
    }
    setExpandedSlides(newExpanded);
  };

  const getSlideTypeIcon = (type: string) => {
    switch (type) {
      case 'title': return '📋';
      case 'content': return '📄';
      case 'bullet': return '📝';
      case 'image': return '🖼️';
      case 'mixed': return '🔀';
      default: return '📄';
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-4 mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Generate PowerPoint Presentation</h1>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-1 text-red-700">{error}</p>
              {error.includes("API key") && (
                <Button 
                  onClick={() => router.push("/settings")}
                  className="mt-3"
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure API Key
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Convert Text to PowerPoint JSON</CardTitle>
            <CardDescription>
              Enter your text content and select a model to generate structured JSON for PowerPoint presentation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="model" className="block text-sm font-medium mb-2">
                  AI Model
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {models.find(m => m.value === selectedModel)?.label}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    {models.map((model) => (
                      <DropdownMenuItem
                        key={model.value}
                        onClick={() => setSelectedModel(model.value)}
                        className={selectedModel === model.value ? "bg-neutral-100" : ""}
                      >
                        {model.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div>
                <label htmlFor="systemPrompt" className="block text-sm font-medium mb-2">
                  System Prompt
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedPrompt 
                        ? systemPrompts.find(p => p._id === selectedPrompt)?.name || "Custom Prompt"
                        : "Default Prompt"
                      }
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuItem
                      onClick={() => setSelectedPrompt("")}
                      className={!selectedPrompt ? "bg-neutral-100" : ""}
                    >
                      Default Prompt
                    </DropdownMenuItem>
                    {systemPrompts.map((prompt) => (
                      <DropdownMenuItem
                        key={prompt._id}
                        onClick={() => setSelectedPrompt(prompt._id)}
                        className={selectedPrompt === prompt._id ? "bg-neutral-100" : ""}
                      >
                        {prompt.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div>
              <label htmlFor="inputText" className="block text-sm font-medium mb-2">
                Input Text
              </label>
              <Textarea
                id="inputText"
                placeholder="Enter your text content here. The AI will analyze it and create a structured JSON with slides containing titles, content, bullet points, and image placeholders as needed."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[200px]"
                disabled={isGenerating}
              />
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !inputText.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating JSON...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate JSON
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {jsonResult && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Design Language</CardTitle>
                <CardDescription>
                  Choose a design library to apply to your presentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="designLibrary" className="block text-sm font-medium mb-2">
                    Design Library
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedDesignLibrary 
                          ? designLibraries.find(d => d._id === selectedDesignLibrary)?.name || "Select Design Library"
                          : "Select Design Library"
                        }
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      {designLibraries.map((library) => (
                        <DropdownMenuItem
                          key={library._id}
                          onClick={() => setSelectedDesignLibrary(library._id)}
                          className={selectedDesignLibrary === library._id ? "bg-neutral-100" : ""}
                        >
                          {library.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button 
                  onClick={handleGenerateHtml} 
                  disabled={isGeneratingHtml || !selectedDesignLibrary}
                  className="w-full"
                >
                  {isGeneratingHtml ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating HTML...
                    </>
                  ) : (
                    <>
                      <Palette className="h-4 w-4 mr-2" />
                      Generate HTML Presentation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generated JSON Structure</CardTitle>
                <CardDescription>
                  {jsonResult.presentationTitle} - {jsonResult.totalSlides} slides generated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jsonResult.slides.map((slide, index) => (
                    <Card key={slide.id} className="border-neutral-200">
                      <CardHeader className="pb-3">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleSlideExpansion(slide.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getSlideTypeIcon(slide.type)}</span>
                            <span className="font-medium">Slide {index + 1}: {slide.title}</span>
                            <span className="text-sm text-neutral-500">({slide.type})</span>
                          </div>
                          {expandedSlides.has(slide.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </CardHeader>
                      {expandedSlides.has(slide.id) && (
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div>
                              <span className="font-medium text-sm">Content:</span>
                              <p className="text-sm text-neutral-600 mt-1">{slide.content}</p>
                            </div>
                            
                            {slide.bullets && slide.bullets.length > 0 && (
                              <div>
                                <span className="font-medium text-sm">Bullet Points:</span>
                                <ul className="list-disc list-inside text-sm text-neutral-600 mt-1 space-y-1">
                                  {slide.bullets.map((bullet, idx) => (
                                    <li key={idx}>{bullet}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {slide.imagePlaceholder && (
                              <div>
                                <span className="font-medium text-sm">Image Placeholder:</span>
                                <p className="text-sm text-neutral-600 mt-1 italic">{slide.imagePlaceholder}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {htmlResult && (
          <Card>
            <CardHeader>
              <CardTitle>Generated HTML Presentation</CardTitle>
              <CardDescription>
                {htmlResult.presentationTitle} - {htmlResult.totalSlides} slides using {htmlResult.designLibraryName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={copyHtmlToClipboard} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy HTML
                </Button>
                <Button onClick={downloadHtml} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download HTML
                </Button>
                <Button 
                  onClick={() => setShowHtmlPreview(!showHtmlPreview)} 
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showHtmlPreview ? "Hide Preview" : "Show Preview"}
                </Button>
              </div>

              {showHtmlPreview && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="text-sm text-gray-600 mb-2">HTML Preview:</div>
                  <iframe
                    srcDoc={htmlResult.html}
                    className="w-full h-96 border rounded"
                    title="HTML Preview"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GeneratePPTPage; 