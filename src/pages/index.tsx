import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Settings } from "lucide-react";

interface Proposal {
  _id: string;
  name: string;
  shareableLink: string;
  views: number;
  viewDetails: {
    ip: string;
    location: string;
    timestamp: string;
  }[];
}

const ProposalsPage = () => {
  const { status } = useSession();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [name, setName] = useState("");
  const [html, setHtml] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("status", status);
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProposals();
    }
  }, [status, router]);

  const fetchProposals = async () => {
    const res = await fetch("/api/proposals");
    if (res.ok) {
      const data = await res.json();
      setProposals(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, html }),
      });

      if (res.ok) {
        fetchProposals();
        setName("");
        setHtml("");
      } else {
        const data = await res.json();
        setError(data.message || "An error occurred");
      }
    } catch {
      setError("An error occurred while creating the proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5">My Proposals</h1>
      
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

      <Card className="mb-10">
        <CardHeader>
          <CardTitle>Create New Proposal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Input
                placeholder="Proposal Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="mb-4">
              <Textarea
                placeholder="HTML Content"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-5">Existing Proposals</h2>
        <div className="grid gap-4">
          {proposals.map((proposal) => (
            <Card key={proposal._id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{proposal.name}</p>
                  <a
                    href={`/proposal/${proposal.shareableLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {`${window.location.origin}/proposal/${proposal.shareableLink}`}
                  </a>
                </div>
                <div className="flex items-center gap-4">
                  <p>{proposal.views || 0} views</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ProposalsPage;
