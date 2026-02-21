import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Share2,
  RotateCw,
  History,
  Globe,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { MOCK_CREDENTIALS } from "@/types/credential";
import { motion } from "framer-motion";

export default function DigitalID() {
  // Sort credentials by date descending for history
  const history = [...MOCK_CREDENTIALS].sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  Digital Passport
                </h1>
                <p className="text-muted-foreground">
                  Your universal, portable digital identity.
                </p>
              </div>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" /> Share Passport
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: The Card */}
              <div className="space-y-6">
                <div className="relative group perspective-1000">
                  <div className="relative w-full aspect-[1.586/1] rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 transform-style-3d group-hover:rotate-y-180">
                    {/* Front */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 flex flex-col justify-between backface-hidden border border-white/10">
                      {/* Holographic Overlay Effect */}
                      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.1)_25%,transparent_30%)] pointer-events-none" />

                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-sm">
                            <Globe className="w-5 h-5 text-blue-300" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg leading-none tracking-wide">
                              CredVerse
                            </h3>
                            <p className="text-[10px] opacity-70 uppercase tracking-widest">
                              Universal Passport
                            </p>
                          </div>
                        </div>
                        <div className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded text-[10px] font-bold uppercase text-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </div>
                      </div>

                      <div className="flex items-end gap-5 relative z-10">
                        <div className="w-24 h-32 bg-slate-200 rounded-lg overflow-hidden border-2 border-white/20 shadow-inner">
                          <img
                            src="https://github.com/shadcn.png"
                            className="w-full h-full object-cover"
                            alt="Passport Photo"
                          />
                        </div>
                        <div className="space-y-3 pb-1 flex-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-0.5">
                              <p className="text-[9px] opacity-60 uppercase tracking-wider">
                                Given Name
                              </p>
                              <p className="font-medium text-base">John</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] opacity-60 uppercase tracking-wider">
                                Family Name
                              </p>
                              <p className="font-medium text-base">Doe</p>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-[9px] opacity-60 uppercase tracking-wider">
                              Digital ID (DID)
                            </p>
                            <p className="font-mono text-xs opacity-90 truncate bg-white/10 p-1 rounded">
                              did:ethr:0x71C...9A2
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-0.5">
                              <p className="text-[9px] opacity-60 uppercase tracking-wider">
                                Nationality
                              </p>
                              <p className="font-medium text-sm">
                                Global Citizen
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] opacity-60 uppercase tracking-wider">
                                Dob
                              </p>
                              <p className="font-medium text-sm">15 May 2001</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Back (QR) */}
                    <div className="absolute inset-0 bg-white p-8 flex flex-col items-center justify-center backface-hidden rotate-y-180">
                      <div className="p-4 bg-white border-4 border-black rounded-xl">
                        <QrCode className="w-32 h-32 text-black" />
                      </div>
                      <p className="mt-6 text-xs text-center text-slate-500 uppercase tracking-wider font-bold">
                        Scan to Verify Identity
                      </p>
                      <p className="mt-2 font-mono text-[10px] text-slate-400">
                        Issuer: CredVerse Authority
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center text-xs text-muted-foreground">
                  <RotateCw className="w-3 h-3 mr-1" /> Hover card to flip
                </div>
              </div>

              {/* Right Column: History Timeline */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">Identity History</h3>
                </div>

                <div className="relative pl-4 border-l-2 border-muted space-y-8">
                  {history.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative"
                    >
                      <div
                        className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-card ${item.status === "verified" ? "bg-green-500" : "bg-amber-500"}`}
                      />

                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-medium mb-0.5 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> {item.issueDate}
                        </span>
                        <h4 className="text-sm font-semibold">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {item.issuer}
                        </p>

                        <div className="flex gap-2 mt-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-normal capitalize"
                          >
                            {item.type}
                          </Badge>
                          {item.status === "verified" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                            >
                              Verified On-Chain
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
                    <h4 className="text-sm font-medium text-primary">
                      Passport Created
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Jan 10, 2020
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
