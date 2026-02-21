import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MoreVertical,
  FileEdit,
  Copy,
  Trash2,
  Briefcase,
  GraduationCap,
  Activity,
  Layers,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface TemplateDesign {
  id: string;
  name: string;
  category: string;
  type: string;
  status: "Active" | "Draft" | "Archived";
  fields: any[];
  createdAt: string;
  updatedAt: string;
}

export default function Templates() {
  const [category, setCategory] = useState("All");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates from API
  const { data: templates = [], isLoading } = useQuery<TemplateDesign[]>({
    queryKey: ["template-designs"],
    queryFn: async () => {
      const response = await fetch("/api/v1/template-designs", {
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/template-designs/${id}/duplicate`, {
        method: "POST",
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });
      if (!response.ok) throw new Error("Failed to duplicate");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template duplicated",
        description: "A copy has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["template-designs"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate template.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/template-designs/${id}`, {
        method: "DELETE",
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template deleted",
        description: "Template has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["template-designs"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
    },
  });

  const filteredTemplates =
    category === "All"
      ? templates
      : templates.filter((t) => t.category === category);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">
              Template Builder
            </h2>
            <p className="text-muted-foreground mt-1">
              Design dynamic credentials for any industry.
            </p>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => navigate("/template-builder")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Template
          </Button>
        </div>

        <Tabs defaultValue="All" className="w-full" onValueChange={setCategory}>
          <TabsList className="grid w-full max-w-2xl grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="All">All</TabsTrigger>
            <TabsTrigger value="Education" className="gap-2">
              <GraduationCap className="w-4 h-4" />{" "}
              <span className="hidden md:inline">Education</span>
            </TabsTrigger>
            <TabsTrigger value="Healthcare" className="gap-2">
              <Activity className="w-4 h-4" />{" "}
              <span className="hidden md:inline">Healthcare</span>
            </TabsTrigger>
            <TabsTrigger value="Corporate" className="gap-2">
              <Briefcase className="w-4 h-4" />{" "}
              <span className="hidden md:inline">Corporate</span>
            </TabsTrigger>
            <TabsTrigger value="Manufacturing" className="gap-2">
              <Layers className="w-4 h-4" />{" "}
              <span className="hidden md:inline">Industry</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="group overflow-hidden hover:shadow-md transition-all duration-200 border-border/60"
              >
                <div className="aspect-[1.414] bg-muted/30 relative border-b p-4 flex items-center justify-center">
                  {/* Mini Preview */}
                  <div className="w-3/4 aspect-[1.414] bg-white shadow-sm border rounded-[2px] p-2 flex flex-col items-center justify-center gap-1 transition-transform group-hover:scale-105 duration-300">
                    <div className="w-8 h-8 rounded-full bg-primary/10 mb-1 flex items-center justify-center">
                      {template.category === "Healthcare" ? (
                        <Activity className="w-4 h-4 text-primary" />
                      ) : template.category === "Corporate" ? (
                        <Briefcase className="w-4 h-4 text-primary" />
                      ) : (
                        <GraduationCap className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="w-2/3 h-1 bg-gray-200 rounded"></div>
                    <div className="w-1/2 h-1 bg-gray-100 rounded"></div>
                    <div className="w-full mt-auto flex justify-between px-1">
                      <div className="w-4 h-4 border border-gray-100"></div>
                      <div className="w-8 h-2 border-b border-gray-200"></div>
                    </div>
                    {template.fields.length > 0 && (
                      <div className="absolute bottom-2 right-2 text-[10px] bg-blue-100 text-blue-700 px-1 rounded">
                        {template.fields.length} fields
                      </div>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/template-builder?id=${template.id}`)
                          }
                        >
                          <FileEdit className="mr-2 h-4 w-4" /> Edit Design
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => duplicateMutation.mutate(template.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteMutation.mutate(template.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold truncate pr-2">
                      {template.name}
                    </h3>
                    <Badge
                      variant={
                        template.status === "Active" ? "default" : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {template.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {template.type} • {template.category}
                    </span>
                    <span>Edited {formatDate(template.updatedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* New Template Placeholder */}
            <button
              onClick={() => navigate("/template-builder")}
              className="flex flex-col items-center justify-center aspect-[1.414] md:aspect-auto md:h-full border-2 border-dashed border-muted-foreground/25 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors p-6 group"
            >
              <div className="h-12 w-12 rounded-full bg-muted group-hover:bg-white group-hover:shadow-sm flex items-center justify-center mb-3 transition-all">
                <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
              </div>
              <span className="font-medium text-muted-foreground group-hover:text-primary">
                Create from Scratch
              </span>
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
