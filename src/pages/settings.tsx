import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Key, CheckCircle, XCircle } from "lucide-react";

const SettingsPage = () => {
  const { status } = useSession();
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchSettings();
    }
  }, [status, router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groqApiKey: apiKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setMessageType("success");
        setHasApiKey(data.hasApiKey);
        setApiKey("");
      } else {
        setMessage(data.message || "An error occurred");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("An error occurred while updating settings");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groqApiKey: "" }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setMessageType("success");
        setHasApiKey(false);
      } else {
        setMessage(data.message || "An error occurred");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("An error occurred while removing API key");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Groq API Key
            </CardTitle>
            <CardDescription>
              Add your Groq API key to enable AI-powered features. Your API key is encrypted and stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <div className={`mb-4 p-3 rounded-md flex items-center gap-2 ${
                messageType === "success" 
                  ? "bg-green-50 text-green-800 border border-green-200" 
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {messageType === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {message}
              </div>
            )}

            {hasApiKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">API key is configured</span>
                </div>
                <Button 
                  onClick={handleRemoveApiKey} 
                  disabled={isLoading}
                  variant="destructive"
                >
                  {isLoading ? "Removing..." : "Remove API Key"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
                    Groq API Key
                  </label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your Groq API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-sm text-neutral-500 mt-1">
                    Get your API key from{" "}
                    <a 
                      href="https://console.groq.com/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Groq Console
                    </a>
                  </p>
                </div>
                <Button type="submit" disabled={isLoading || !apiKey.trim()}>
                  {isLoading ? "Testing..." : "Save API Key"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage; 