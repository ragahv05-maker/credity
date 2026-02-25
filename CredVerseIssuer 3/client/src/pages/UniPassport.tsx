import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, QrCode, Share2, Download, ExternalLink, CheckCircle2, History } from "lucide-react";
// import logo from "@assets/ChatGPT_Image_Oct_22,_2025,_12_35_14_AM_1764878404699.png";
import { cn } from "@/lib/utils";
import { useStore, type Record } from "@/lib/store";
import { UNIVERSITY_DID } from "@/lib/config";

export default function UniPassport() {
  const { records } = useStore();
  // Filter for a mock logged-in student (Aditi Sharma for demo)
  const myRecords = records.filter((r: Record) => r.name === "Aditi Sharma" || r.status === "Issued").slice(0, 3);
  const [activeCredential, setActiveCredential] = useState<Record | null>(myRecords[0] || null);

  const logo = ""; // Placeholder to fix missing asset
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Mobile-first header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-20 px-4 h-16 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2">
          {/* <img src={logo} alt="Logo" className="w-6 h-6" /> */}
          <span className="font-heading font-bold text-lg">UniPassport</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">AS</span>
        </div>
      </header>

      <div className="container mx-auto max-w-md lg:max-w-5xl lg:grid lg:grid-cols-12 lg:gap-8 lg:p-8">
        
        {/* Left Col: Wallet Cards (Mobile & Desktop) */}
        <div className="col-span-12 lg:col-span-4 space-y-6 p-4 lg:p-0">
           <div className="hidden lg:flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                AS
              </div>
              <div>
                <h1 className="font-heading font-bold text-xl">Aditi Sharma</h1>
                <p className="text-sm text-muted-foreground">Student ID: UNI-2025-001</p>
              </div>
           </div>

           <div>
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">My Credentials</h3>
             <div className="space-y-3">
               {myRecords.map((record) => (
                 <div 
                    key={record.id}
                    onClick={() => setActiveCredential(record)}
                    className={cn(
                      "cursor-pointer rounded-xl p-4 border transition-all duration-200 relative overflow-hidden group",
                      activeCredential?.id === record.id 
                        ? "bg-primary text-primary-foreground border-primary shadow-lg ring-2 ring-primary/20" 
                        : "bg-card hover:border-primary/50 hover:shadow-md"
                    )}
                 >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                       <ShieldCheck className="w-12 h-12" />
                    </div>
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <h4 className="font-bold text-lg leading-tight mb-1">{record.credential}</h4>
                        <p className={cn("text-xs opacity-80", activeCredential?.id === record.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          University of North • {record.date}
                        </p>
                      </div>
                      {record.status === 'Issued' && (
                        <CheckCircle2 className={cn("w-5 h-5", activeCredential?.id === record.id ? "text-green-300" : "text-green-500")} />
                      )}
                    </div>
                 </div>
               ))}
             </div>
           </div>

           <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl overflow-hidden relative">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-medium text-slate-300 uppercase tracking-widest">Student Identity</span>
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex items-end gap-4">
                   <div className="h-20 w-20 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10"></div>
                   <div className="flex-1">
                      <p className="text-lg font-bold font-heading">Aditi Sharma</p>
                      <p className="text-sm text-slate-300">Computer Science</p>
                      <p className="text-xs text-slate-400 mt-1">Valid thru 2026</p>
                   </div>
                </div>
              </CardContent>
           </Card>
        </div>

        {/* Right Col: Detail View (Desktop) / Bottom Sheet (Mobile - simplified here as inline) */}
        <div className="col-span-12 lg:col-span-8 p-4 lg:p-0 pb-20 lg:pb-0">
           {activeCredential ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-heading font-bold hidden lg:block">Credential Details</h2>
                  <div className="flex gap-2 w-full lg:w-auto">
                    <Button className="flex-1 lg:flex-none" variant="outline">
                       <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                    <Button className="flex-1 lg:flex-none">
                       <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                  </div>
                </div>

                <Card className="overflow-hidden border-none shadow-2xl bg-white text-slate-900">
                   <div className="h-3 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600"></div>
                   <CardContent className="p-8 md:p-12 text-center relative">
                      {/* Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                         {/* <img src={logo} className="w-96 h-96" /> */}
                      </div>
                      
                      <div className="relative z-10">
                        <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
                           {/* <img src={logo} className="w-10 h-10" /> */}
                        </div>
                        
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-2">University of North</h1>
                        <p className="text-sm text-slate-500 uppercase tracking-widest mb-8">Official Verified Credential</p>
                        
                        <p className="text-lg text-slate-600 mb-2">This certifies that</p>
                        <h2 className="text-2xl md:text-3xl font-bold text-blue-700 mb-2">{activeCredential.name}</h2>
                        <p className="text-lg text-slate-600 mb-8">
                          has successfully completed all requirements for<br/>
                          <span className="font-bold text-slate-900">{activeCredential.credential}</span>
                        </p>
                        
                        <div className="grid grid-cols-2 gap-8 max-w-md mx-auto text-left border-t border-slate-100 pt-8">
                           <div>
                             <p className="text-xs text-slate-400 uppercase">Issued On</p>
                             <p className="font-medium">{activeCredential.date}</p>
                           </div>
                           <div>
                             <p className="text-xs text-slate-400 uppercase">Credential ID</p>
                             <p className="font-medium font-mono text-xs">{activeCredential.id}</p>
                           </div>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-slate-50 text-center">
                           <p className="text-[10px] text-slate-400 uppercase mb-1">Issuer Blockchain Identity (DID)</p>
                           <p className="font-mono text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded border border-blue-100">
                              {UNIVERSITY_DID}
                           </p>
                        </div>

                        <div className="mt-8 flex justify-center">
                           <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                              <QrCode className="w-24 h-24 text-slate-900" />
                           </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">Scan to verify on blockchain</p>
                      </div>
                   </CardContent>
                   <div className="bg-slate-50 p-4 border-t text-xs text-center text-slate-500 flex items-center justify-center gap-2">
                      <ShieldCheck className="w-3 h-3 text-green-600" />
                      Cryptographically signed and anchored to Polygon Network
                   </div>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Verification History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                       <div className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 bg-blue-100 p-1 rounded-full">
                             <ExternalLink className="w-3 h-3 text-blue-600" />
                          </div>
                          <div>
                             <p className="font-medium">Verified by LinkedIn</p>
                             <p className="text-muted-foreground text-xs">Today at 10:23 AM</p>
                          </div>
                       </div>
                       <div className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 bg-blue-100 p-1 rounded-full">
                             <ExternalLink className="w-3 h-3 text-blue-600" />
                          </div>
                          <div>
                             <p className="font-medium">Verified by Tech Corp Inc.</p>
                             <p className="text-muted-foreground text-xs">Yesterday at 4:15 PM</p>
                          </div>
                       </div>
                    </div>
                  </CardContent>
                </Card>
             </div>
           ) : (
             <div className="h-full flex items-center justify-center text-muted-foreground">
               Select a credential to view details
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
