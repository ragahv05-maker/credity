import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

export default function BulkIssuance() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Simple CSV parser for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n");
        const headers = lines[0].split(",");
        const data = lines
          .slice(1, 6)
          .map((line) => {
            const values = line.split(",");
            return headers.reduce((obj, header, index) => {
              obj[header.trim()] = values[index]?.trim();
              return obj;
            }, {} as any);
          })
          .filter((row) => Object.keys(row).length > 1); // Filter empty rows
        setPreview(data);
      };
      reader.readAsText(selectedFile);
    }
  };

  const issueMutation = useMutation({
    mutationFn: async () => {
      // In a real app, we'd upload the file or parse it fully and send JSON
      // Here we simulate sending the parsed preview data
      const res = await fetch("/api/v1/credentials/bulk-issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": (import.meta as any).env?.VITE_API_KEY || "",
        },
        body: JSON.stringify({
          templateId: "tmpl_123", // Mock template
          issuerId: "did:ethr:issuer",
          recipientsData: preview,
        }),
      });
      if (!res.ok) throw new Error("Failed to issue credentials");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Bulk Issuance Started",
        description: `Processing ${preview.length} credentials. You will be notified when complete.`,
        className: "bg-green-600 text-white border-none",
      });
      setFile(null);
      setPreview([]);
    },
    onError: () => {
      toast({
        title: "Issuance Failed",
        description: "There was an error processing your CSV file.",
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">
            Bulk Issuance
          </h2>
          <p className="text-muted-foreground mt-1">
            Upload a CSV file to issue credentials to thousands of recipients at
            once.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>
                File must contain headers: name, email, course, graduationDate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-secondary/50 transition-colors">
                <Input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-upload"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-medium">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-muted-foreground">
                    CSV files only (max 10MB)
                  </span>
                </label>
              </div>

              {file && (
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setPreview([]);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}

              <Button
                className="w-full"
                disabled={!file || issueMutation.isPending}
                onClick={() => issueMutation.mutate()}
              >
                {issueMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Issue Credentials
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview Data</CardTitle>
                <CardDescription>Showing first 5 rows</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-secondary text-muted-foreground font-medium">
                      <tr>
                        {Object.keys(preview[0]).map((header) => (
                          <th key={header} className="px-4 py-2 capitalize">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.map((row, i) => (
                        <tr key={i} className="bg-card">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-4 py-2">
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
