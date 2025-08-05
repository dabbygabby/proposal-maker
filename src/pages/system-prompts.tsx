import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertCircle, Settings, ChevronDown, Plus, Edit, Trash2, Eye, EyeOff, FileText } from "lucide-react";

interface SystemPrompt {
  _id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const SystemPromptsPage = () => {
  const { status } = useSession();
  const router = useRouter();
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [showPromptText, setShowPromptText] = useState<Set<string>>(new Set());

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    prompt: "",
    category: "presentation",
  });

  const categories = [
    { value: "presentation", label: "Presentation" },
    { value: "document", label: "Document" },
    { value: "general", label: "General" },
    { value: "custom", label: "Custom" },
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchPrompts();
    }
  }, [status, router]);

  const fetchPrompts = async () => {
    try {
      const res = await fetch("/api/system-prompts");
      if (res.ok) {
        const data = await res.json();
        setPrompts(data);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const url = editingPrompt ? `/api/system-prompts` : "/api/system-prompts";
      const method = editingPrompt ? "PUT" : "POST";
      const body = editingPrompt ? { ...formData, id: editingPrompt._id } : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        fetchPrompts();
        resetForm();
        setEditingPrompt(null);
      } else {
        setError(data.message || "An error occurred");
      }
    } catch (error) {
      setError("An error occurred while saving the prompt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    try {
      const res = await fetch(`/api/system-prompts?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchPrompts();
      } else {
        const data = await res.json();
        setError(data.message || "An error occurred");
      }
    } catch (error) {
      setError("An error occurred while deleting the prompt");
    }
  };

  const handleEdit = (prompt: SystemPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description,
      prompt: prompt.prompt,
      category: prompt.category,
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      prompt: "",
      category: "presentation",
    });
    setShowCreateForm(false);
  };

  const togglePromptVisibility = (id: string) => {
    const newSet = new Set(showPromptText);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setShowPromptText(newSet);
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />
            <h1 className="text-3xl font-bold">System Prompts</h1>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Prompt
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-1 text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingPrompt ? "Edit System Prompt" : "Create New System Prompt"}
              </CardTitle>
              <CardDescription>
                {editingPrompt 
                  ? "Modify the system prompt below" 
                  : "Create a new system prompt for AI interactions"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Name
                    </label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter prompt name"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium mb-2">
                      Category
                    </label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {categories.find(c => c.value === formData.category)?.label}
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        {categories.map((category) => (
                          <DropdownMenuItem
                            key={category.value}
                            onClick={() => setFormData({ ...formData, category: category.value })}
                          >
                            {category.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this prompt"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium mb-2">
                    System Prompt
                  </label>
                  <Textarea
                    id="prompt"
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="Enter the system prompt text..."
                    className="min-h-[200px]"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : (editingPrompt ? "Update" : "Create")}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {prompts.map((prompt) => (
            <Card key={prompt._id} className="border-neutral-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold">{prompt.name}</h3>
                      <p className="text-sm text-neutral-600">{prompt.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      prompt.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {prompt.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {prompt.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePromptVisibility(prompt._id)}
                    >
                      {showPromptText.has(prompt._id) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(prompt)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(prompt._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {showPromptText.has(prompt._id) && (
                <CardContent className="pt-0">
                  <div className="bg-neutral-50 p-4 rounded-md">
                    <h4 className="font-medium mb-2">System Prompt:</h4>
                    <pre className="text-sm text-neutral-700 whitespace-pre-wrap">{prompt.prompt}</pre>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {prompts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No system prompts yet</h3>
              <p className="text-neutral-600 mb-4">
                Create your first system prompt to get started
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Prompt
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SystemPromptsPage; 