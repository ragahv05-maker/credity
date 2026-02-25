import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileSpreadsheet, FileCheck, AlertCircle, Loader2, ShieldCheck, Building2 } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
// import logo from "@assets/ChatGPT_Image_Oct_22,_2025,_12_35_14_AM_1764878404699.png";
import { UNIVERSITY_DID } from "@/lib/config";

export default function Issuance() {
  const logo = ""; // Placeholder to fix missing asset
  const { toast } = useToast();
  const { addRecord } = useStore();

  // Form State
  const [formData, setFormData] = useState({
    sector: "education",
    name: "",
    email: "",
    studentId: "",
    credentialType: "template-1",
    credentialName: "Bachelor of Technology",
    major: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (val: string) => {
    let credName = "Bachelor of Technology";
    if (val === 'template-2') credName = "Semester Grade Card";
    if (val === 'template-3') credName = "Certificate of Completion";
    if (val === 'template-4') credName = "Medical Lab Report";
    if (val === 'template-5') credName = "ISO 9001:2015 Certificate";
    if (val === 'template-6') credName = "Employee Work Authorization";

    setFormData(prev => ({ ...prev, credentialType: val, credentialName: credName }));
  };

  const handleSectorChange = (val: string) => {
    const defaultTemplate = val === 'education' ? 'template-1' : val === 'healthcare' ? 'template-4' : val === 'corporate' ? 'template-6' : 'template-5';
    setFormData(prev => ({ ...prev, sector: val, credentialType: defaultTemplate, credentialName: 'Select Template' }));
  };

  const issueMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/credentials/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": (import.meta as any).env?.VITE_API_KEY || ""
        },
        body: JSON.stringify({
          templateId: formData.credentialType,
          issuerId: "issuer-1",
          recipient: {
            name: formData.name,
            email: formData.email,
            id: formData.studentId
          },
          credentialData: {
            credentialName: formData.credentialName,
            major: formData.major,
            sector: formData.sector
          }
        })
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = body?.message || "Failed to issue credential";
        const err: any = new Error(msg);
        err.body = body;
        throw err;
      }
      return body;
    },
    onSuccess: async (data) => {
      // Also add to local store for immediate UI update
      const newRecord = {
        id: formData.studentId,
        credentialId: data.id, // Store the actual credential UUID
        name: formData.name,
        credential: formData.credentialName + (formData.major ? ` in ${formData.major}` : ""),
        date: format(new Date(), "MMM dd, yyyy"),
        status: "Issued" as const,
        issuer: "Admin User",
        department: formData.sector === "education" ? "Engineering" : formData.sector === "healthcare" ? "Pathology" : "HR",
        txHash: data.txHash || ("0x" + Math.random().toString(16).slice(2, 10) + "..." + Math.random().toString(16).slice(2, 6))
      };
      addRecord(newRecord);

      // Auto-create offer for easy wallet import
      try {
        const offerRes = await fetch(`/api/v1/credentials/${data.id}/offer`, {
          method: 'POST',
          headers: { 'x-api-key': (import.meta as any).env?.VITE_API_KEY || '' },
        });
        if (offerRes.ok) {
          const offerData = await offerRes.json();
          await navigator.clipboard.writeText(offerData.offerUrl);

          const anchorStatus = data?.anchor?.status || (data?.txHash ? 'anchored' : 'pending');
          const tx = data?.anchor?.txHash || data?.txHash;
          toast({
            title: anchorStatus === 'anchored' ? "Credential Issued & Anchored" : "Credential Issued (Anchoring Pending)",
            description: (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Trust/Audit: issuance is recorded; anchoring may complete asynchronously.</span>
                <span>TX: <code className="text-xs">{tx ? `${String(tx).slice(0, 12)}...` : 'pending'}</code></span>
                <div className="bg-muted p-2 rounded mt-1">
                  <p className="text-xs font-semibold mb-1">Wallet URL (copied!):</p>
                  <code className="text-xs break-all">{offerData.offerUrl}</code>
                </div>
                <span className="text-xs text-muted-foreground">Paste this in Wallet → Receive</span>
              </div>
            ),
            duration: 20000,
          });
        }
      } catch (e) {
        const anchorStatus = data?.anchor?.status || (data?.txHash ? 'anchored' : 'pending');
        toast({
          title: anchorStatus === 'anchored' ? "Credential Issued & Anchored" : "Credential Issued",
          description: (
            <div className="flex flex-col gap-1">
              <span className="text-sm">{anchorStatus === 'anchored' ? 'Credential anchored to blockchain.' : 'Credential created. Blockchain anchoring may be pending.'}</span>
              <span className="font-mono text-xs opacity-80">ID: {data.id}</span>
            </div>
          ),
          duration: 6000,
        });
      }

      // Reset form partially
      setFormData(prev => ({ ...prev, name: "", email: "", studentId: "" }));
    },
    onError: (err: any) => {
      const body = err?.body;
      const code = body?.code;
      const errors: any[] = Array.isArray(body?.errors) ? body.errors : [];
      const detail = errors.length
        ? errors.slice(0, 3).map((e) => `${e.path}: ${e.message}`).join("\n")
        : (body?.message || err?.message || "There was an error issuing the credential.");

      toast({
        title: code ? `Issuance Failed (${code})` : "Issuance Failed",
        description: (
          <div className="whitespace-pre-line text-sm">
            {detail}
            {body?.schemaHint?.required?.length ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Template required fields: {body.schemaHint.required.join(", ")}
              </div>
            ) : null}
          </div>
        ),
        variant: "destructive",
        duration: 12000,
      });
    }
  });

  const handleIssue = () => {
    if (!formData.name || !formData.studentId) {
      toast({
        title: "Missing Information",
        description: "Please fill in the recipient name and ID.",
        variant: "destructive"
      });
      return;
    }
    issueMutation.mutate();
  };

  const isProcessing = issueMutation.isPending;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Issue Credentials</h2>
          <p className="text-muted-foreground mt-1">Generate new verifiable credentials for any sector.</p>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="single">Single Issuance</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-sm md:col-span-1">
                <CardHeader>
                  <CardTitle>Recipient Details</CardTitle>
                  <CardDescription>
                    Enter the recipient's information manually.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sector">Industry Sector</Label>
                    <Select defaultValue="education" onValueChange={handleSectorChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Sector" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="education">Education (University)</SelectItem>
                        <SelectItem value="healthcare">Healthcare (Hospitals/Labs)</SelectItem>
                        <SelectItem value="corporate">Corporate (HR/Admin)</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing (Quality/Safety)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="template">Credential Template</Label>
                    <Select onValueChange={handleSelectChange} value={formData.credentialType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.sector === 'education' && (
                          <>
                            <SelectItem value="template-1">Degree Certificate 2025</SelectItem>
                            <SelectItem value="template-2">Semester Grade Card</SelectItem>
                            <SelectItem value="template-3">Course Completion</SelectItem>
                          </>
                        )}
                        {formData.sector === 'healthcare' && (
                          <>
                            <SelectItem value="template-4">Medical Lab Report</SelectItem>
                          </>
                        )}
                        {formData.sector === 'corporate' && (
                          <>
                            <SelectItem value="template-6">Employee ID Card</SelectItem>
                          </>
                        )}
                        {formData.sector === 'manufacturing' && (
                          <>
                            <SelectItem value="template-5">ISO 9001 Compliance</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="name">Recipient Name</Label>
                    <Input id="name" placeholder="e.g. Aditi Sharma" value={formData.name} onChange={handleInputChange} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="e.g. aditi.s@domain.com" value={formData.email} onChange={handleInputChange} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="studentId">ID / Reference No.</Label>
                      <Input id="studentId" placeholder="UNI-2025-001" value={formData.studentId} onChange={handleInputChange} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cgpa">Meta Data / Grade</Label>
                      <Input id="cgpa" placeholder="A+" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="major">Sub-Title / Major</Label>
                    <Input id="major" placeholder="Computer Science Engineering" value={formData.major} onChange={handleInputChange} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Internal Notes (Optional)</Label>
                    <Textarea id="notes" placeholder="Any verification notes..." />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={handleIssue} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Anchoring to Chain...
                      </>
                    ) : (
                      <>
                        <FileCheck className="mr-2 h-4 w-4" />
                        Issue Credential
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <div className="md:col-span-1 space-y-6">
                <Card className="shadow-sm border-dashed border-2 bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-base">Live Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center min-h-[300px]">
                    <div className="w-full aspect-[1.414] bg-white shadow-lg rounded-sm p-6 relative overflow-hidden flex flex-col items-center text-center border border-border/50 transition-all">
                      {/* Mock Certificate Preview */}
                      <div className={`absolute top-0 left-0 w-full h-2 ${formData.sector === 'healthcare' ? 'bg-red-500' : formData.sector === 'corporate' ? 'bg-slate-800' : 'bg-primary/80'}`}></div>
                      <div className="mt-8 mb-4">
                        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-2">
                          {/* <img src={logo} className="w-16 h-16 object-contain" /> */}
                        </div>
                      </div>
                      <h3 className="font-serif text-xl font-bold text-slate-900 mb-1">
                        {formData.sector === 'education' ? 'University of North' :
                          formData.sector === 'healthcare' ? 'City General Hospital' :
                            formData.sector === 'corporate' ? 'TechCorp Inc.' : 'Global Manufacturing Ltd.'}
                      </h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-6">{formData.credentialName}</p>

                      <p className="text-xs text-slate-600 mb-1">This is to certify that</p>
                      <h4 className="font-serif text-lg text-primary font-bold mb-1">{formData.name || "Recipient Name"}</h4>
                      <p className="text-xs text-slate-600 px-8 leading-relaxed">
                        {formData.sector === 'education' ? `Has successfully completed the requirements for ${formData.major || "Major"}.` :
                          formData.sector === 'healthcare' ? `Has been tested and verified for the above medical procedure.` :
                            `Has been authorized for ${formData.major || "Role/Department"}.`}
                      </p>

                      <div className="mt-auto w-full flex justify-between items-end px-4 pt-4">
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-8 border-b border-slate-400 mb-1"></div>
                          <span className="text-[8px] text-slate-400 uppercase">
                            {formData.sector === 'education' ? 'Dean' : 'Director'}
                          </span>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="w-12 h-12 border border-slate-200 flex items-center justify-center rounded-full bg-amber-50/50">
                            <div className="w-8 h-8 bg-amber-400/20 rounded-full border border-amber-200/50"></div>
                          </div>
                          <div className="text-[6px] text-slate-400 font-mono uppercase tracking-tight max-w-[80px] truncate text-center">
                            Issuer ID: {UNIVERSITY_DID.slice(0, 12)}...
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-8 border-b border-slate-400 mb-1"></div>
                          <span className="text-[8px] text-slate-400 uppercase">
                            {formData.sector === 'education' ? 'Registrar' : 'Authorized Sig.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold mb-1">Blockchain Anchoring</p>
                    <p>Credentials are automatically hashed and anchored to the Polygon blockchain for immutable verification.</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="mt-6">
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">Drag and drop CSV file</h3>
                  <p className="text-sm text-muted-foreground">
                    Or click to browse your computer
                  </p>
                </div>
                <Button variant="secondary">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Select File
                </Button>
                <p className="text-xs text-muted-foreground pt-4">
                  Download <span className="text-primary underline cursor-pointer">sample_template.csv</span> for format guide.
                </p>
              </CardContent>
            </Card>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Previous Batches</h3>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 p-4 border-b bg-muted/50 text-sm font-medium">
                  <div className="col-span-2">Batch Name</div>
                  <div>Date</div>
                  <div>Records</div>
                  <div className="text-right">Status</div>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-5 p-4 border-b last:border-0 text-sm hover:bg-muted/20 transition-colors">
                    <div className="col-span-2 font-medium flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      Batch_2025_May_{i}.csv
                    </div>
                    <div className="text-muted-foreground">May 1{i}, 2025</div>
                    <div>{120 * i} students</div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
