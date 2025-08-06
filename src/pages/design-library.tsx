/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Upload,
  Palette,
  Image as ImageIcon,
} from "lucide-react";

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

const DesignLibraryPage = () => {
  const { status } = useSession();
  const router = useRouter();
  const [designLibraries, setDesignLibraries] = useState<DesignLibrary[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<DesignLibrary | null>(
    null
  );
  const [showAnalysis, setShowAnalysis] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPromptId: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchDesignLibraries();
      fetchSystemPrompts();
    }
  }, [status, router]);

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

  const fetchSystemPrompts = async () => {
    try {
      const res = await fetch("/api/system-prompts?active=true");
      if (res.ok) {
        const data = await res.json();
        setSystemPrompts(data);
      }
    } catch (error) {
      console.error("Error fetching system prompts:", error);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(",")[1];
        setSelectedImage(base64);
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!selectedImage) {
      setError("Please select an image");
      setIsLoading(false);
      return;
    }

    try {
      const url = editingLibrary
        ? `/api/design-library`
        : "/api/design-library";
      const method = editingLibrary ? "PUT" : "POST";
      const body = editingLibrary
        ? { ...formData, id: editingLibrary._id }
        : { ...formData, imageBase64: selectedImage };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (editingLibrary) {
          setDesignLibraries((prev) =>
            prev.map((lib) => (lib._id === editingLibrary._id ? data : lib))
          );
        } else {
          setDesignLibraries((prev) => [data, ...prev]);
        }
        resetForm();
        setShowCreateForm(false);
      } else {
        const errorData = await res.json();
        setError(errorData.message || "An error occurred");
      }
    } catch (error) {
      console.error("Error saving design library:", error);
      setError("An error occurred while saving");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this design library?")) {
      return;
    }

    try {
      const res = await fetch(`/api/design-library?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDesignLibraries((prev) => prev.filter((lib) => lib._id !== id));
      } else {
        const errorData = await res.json();
        setError(errorData.message || "An error occurred");
      }
    } catch (error) {
      console.error("Error deleting design library:", error);
      setError("An error occurred while deleting");
    }
  };

  const handleEdit = (library: DesignLibrary) => {
    setEditingLibrary(library);
    setFormData({
      name: library.name,
      description: library.description,
      systemPromptId: library.systemPromptId._id,
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      systemPromptId: "",
    });
    setEditingLibrary(null);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const toggleAnalysisVisibility = (id: string) => {
    setShowAnalysis((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const exportCSS = (cssVariables: string) => {
    const blob = new Blob([cssVariables], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design-system.css";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTailwindConfig = (cssVariables: string) => {
    // Convert CSS variables to Tailwind config format
    const variables = cssVariables.match(/--([^:]+):\s*([^;]+);/g) || [];
    const tailwindConfig = {
      theme: {
        extend: {
          colors: {},
          spacing: {},
          fontSize: {},
        },
      },
    };

    variables.forEach((variable) => {
      const match = variable.match(/--([^:]+):\s*([^;]+);/);
      if (match) {
        const [, name, value] = match;
        const cleanValue = value.trim();

        if (cleanValue.includes("#")) {
          // Color variable
          //@ts-expect-error tailwind config
          tailwindConfig.theme.extend.colors[name] = cleanValue;
        } else if (cleanValue.includes("px") || cleanValue.includes("rem")) {
          // Spacing variable
          //@ts-expect-error tailwind config
          tailwindConfig.theme.extend.spacing[name] = cleanValue;
        } else if (cleanValue.includes("font")) {
          // Font variable
          //@ts-expect-error tailwind config
          tailwindConfig.theme.extend.fontSize[name] = cleanValue;
        }
      }
    });

    const blob = new Blob([JSON.stringify(tailwindConfig, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tailwind.config.js";
    a.click();
    URL.revokeObjectURL(url);
  };

  const activePrompts = systemPrompts.filter((prompt) => prompt.isActive);

  return (
    <div className="container mx-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Design Library</h1>
            <p className="text-muted-foreground">
              Upload screenshots and convert them into CSS design variables
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Design Library
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingLibrary
                  ? "Edit Design Library"
                  : "Create New Design Library"}
              </CardTitle>
              <CardDescription>
                Upload a screenshot and select a system prompt to analyze the
                design
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Enter design library name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">System Prompt</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          {formData.systemPromptId
                            ? activePrompts.find(
                                (p) => p._id === formData.systemPromptId
                              )?.name
                            : "Select a system prompt"}
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        {activePrompts.map((prompt) => (
                          <DropdownMenuItem
                            key={prompt._id}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                systemPromptId: prompt._id,
                              }))
                            }
                          >
                            {prompt.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe the design library"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Upload Screenshot
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      {imagePreview ? (
                        <div className="space-y-2">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="mx-auto max-h-48 rounded-lg"
                          />
                          <p className="text-sm text-gray-500">
                            Click to change image
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="text-sm text-gray-500">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-400">
                            PNG, JPG up to 10MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading
                      ? "Processing..."
                      : editingLibrary
                      ? "Update"
                      : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {designLibraries.map((library) => (
            <Card key={library._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{library.name}</CardTitle>
                    <CardDescription>{library.description}</CardDescription>
                    <p className="text-xs text-muted-foreground">
                      System Prompt: {library.systemPromptId.name}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(library)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleAnalysisVisibility(library._id)}
                      >
                        {showAnalysis.has(library._id) ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Hide Analysis
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Show Analysis
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => exportCSS(library.cssVariables)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Export CSS
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          exportTailwindConfig(library.cssVariables)
                        }
                      >
                        <Palette className="mr-2 h-4 w-4" />
                        Export Tailwind Config
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(library._id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {showAnalysis.has(library._id) && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">CSS Variables</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        <code>{library.cssVariables}</code>
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Analysis Result</h4>
                      <div className="bg-gray-100 p-3 rounded text-sm">
                        {library.analysisResult}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {designLibraries.length === 0 && !showCreateForm && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No design libraries yet
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Upload your first screenshot to start building your design
                system
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Design Library
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DesignLibraryPage;
