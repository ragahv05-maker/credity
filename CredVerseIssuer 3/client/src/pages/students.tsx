import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search, Upload, Plus, MoreHorizontal, GraduationCap, User, FileCheck, Download,
    Loader2, Eye, Edit, FileText, Award, Mail, Phone, Calendar, MapPin, Smartphone
} from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Student {
    id: string;
    name: string;
    email: string;
    studentId: string;
    program: string;
    enrollmentYear: string;
    status: "Active" | "Alumni" | "Suspended";
}

interface StudentCredential {
    id: string;
    type: string;
    issuedAt: string;
    status: "Active" | "Revoked";
}

export default function Students() {
    const [search, setSearch] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [csvData, setCsvData] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, navigate] = useLocation();

    // Profile/Edit sheet state
    const [profileStudent, setProfileStudent] = useState<Student | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editData, setEditData] = useState<Student | null>(null);

    // Issue credential dialog state
    const [issueStudent, setIssueStudent] = useState<Student | null>(null);
    const [isIssueOpen, setIsIssueOpen] = useState(false);
    const [issueData, setIssueData] = useState({
        templateId: '',
        recipientDid: '',
        sendToDigiLocker: false,
        recipientMobile: '',
    });

    // Form state for adding student
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        studentId: '',
        program: '',
        enrollmentYear: new Date().getFullYear().toString(),
        status: 'Active' as const,
    });

    // Fetch students
    const { data: students = [], isLoading } = useQuery<Student[]>({
        queryKey: ['students'],
        queryFn: async () => {
            const response = await fetch('/api/v1/students', {
                headers: { 'x-api-key': (import.meta as any).env?.VITE_API_KEY || '' },
            });
            if (!response.ok) throw new Error('Failed to fetch students');
            return response.json();
        },
    });

    // Fetch credentials for a student
    const { data: studentCredentials = [] } = useQuery<any[]>({
        queryKey: ['student-credentials', profileStudent?.id],
        queryFn: async () => {
            const response = await fetch('/api/v1/credentials', {
                headers: { 'x-api-key': (import.meta as any).env?.VITE_API_KEY || '' },
            });
            if (!response.ok) return [];
            const all = await response.json();
            // Filter by student ID in recipient data
            return all.filter((c: any) => {
                if (typeof c.recipient === 'object' && c.recipient !== null) {
                    return (c.recipient as any).studentId === profileStudent?.studentId;
                }
                return false;
            });
        },
        enabled: !!profileStudent,
    });

    // Fetch templates for issuing
    const { data: templates = [] } = useQuery<any[]>({
        queryKey: ['templates'],
        queryFn: async () => {
            const response = await fetch('/api/v1/templates', {
                headers: { 'x-api-key': (import.meta as any).env?.VITE_API_KEY || '' },
            });
            if (!response.ok) return [];
            return response.json();
        },
    });

    // Add student mutation
    const addMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await fetch('/api/v1/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': (import.meta as any).env?.VITE_API_KEY || '',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to add student');
            return response.json();
        },
        onSuccess: () => {
            toast({ title: 'Student added', description: 'New student has been added successfully.' });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setIsAddOpen(false);
            setFormData({ name: '', email: '', studentId: '', program: '', enrollmentYear: new Date().getFullYear().toString(), status: 'Active' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'Failed to add student.', variant: 'destructive' });
        },
    });

    // Update student mutation
    const updateMutation = useMutation({
        mutationFn: async (data: Student) => {
            const response = await fetch(`/api/v1/students/${data.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': (import.meta as any).env?.VITE_API_KEY || '',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to update student');
            return response.json();
        },
        onSuccess: () => {
            toast({ title: 'Student updated', description: 'Details have been saved.' });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setIsEditOpen(false);
            setEditData(null);
        },
        onError: () => {
            toast({ title: 'Error', description: 'Failed to update student.', variant: 'destructive' });
        },
    });

    // Issue credential mutation
    const issueMutation = useMutation({
        mutationFn: async () => {
            if (!issueStudent) throw new Error('No student selected');

            const response = await fetch('/api/v1/credentials/issue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': (import.meta as any).env?.VITE_API_KEY || '',
                },
                body: JSON.stringify({
                    templateId: issueData.templateId,
                    recipientDid: issueData.recipientDid || `did:key:${issueStudent.studentId}`,
                    recipientName: issueStudent.name,
                    recipientEmail: issueStudent.email,
                    recipientStudentId: issueStudent.studentId,
                }),
            });
            if (!response.ok) throw new Error('Failed to issue credential');
            const credential = await response.json();

            // Push to DigiLocker if enabled
            if (issueData.sendToDigiLocker) {
                await fetch('/api/v1/digilocker/push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': (import.meta as any).env?.VITE_API_KEY || '',
                    },
                    body: JSON.stringify({
                        credentialId: credential.id,
                        docType: 'CERTIFICATE',
                        recipientMobile: issueData.recipientMobile,
                    }),
                });
            }

            return credential;
        },
        onSuccess: () => {
            const digiNote = issueData.sendToDigiLocker ? ' and pushed to DigiLocker' : '';
            toast({ title: 'Credential issued', description: `Credential has been issued to ${issueStudent?.name}${digiNote}.` });
            queryClient.invalidateQueries({ queryKey: ['credentials'] });
            setIsIssueOpen(false);
            setIssueStudent(null);
            setIssueData({ templateId: '', recipientDid: '', sendToDigiLocker: false, recipientMobile: '' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'Failed to issue credential.', variant: 'destructive' });
        },
    });

    // Import students mutation
    const importMutation = useMutation({
        mutationFn: async (students: any[]) => {
            const response = await fetch('/api/v1/students/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': (import.meta as any).env?.VITE_API_KEY || '',
                },
                body: JSON.stringify({ students }),
            });
            if (!response.ok) throw new Error('Failed to import');
            return response.json();
        },
        onSuccess: (data) => {
            toast({ title: 'Import successful', description: `${data.count} students have been imported.` });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setIsImportOpen(false);
            setCsvData([]);
        },
        onError: () => {
            toast({ title: 'Error', description: 'Failed to import students.', variant: 'destructive' });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/v1/students/${id}`, {
                method: 'DELETE',
                headers: { 'x-api-key': (import.meta as any).env?.VITE_API_KEY || '' },
            });
            if (!response.ok) throw new Error('Failed to delete');
            return response.json();
        },
        onSuccess: () => {
            toast({ title: 'Student removed', description: 'Student has been deleted.' });
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
    });

    // Handle CSV file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            const data = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const obj: any = {};
                headers.forEach((header, i) => {
                    obj[header] = values[i] || '';
                });
                return obj;
            });

            setCsvData(data);
            setIsImportOpen(true);
        };
        reader.readAsText(file);
    };

    // Export students
    const handleExport = async () => {
        const response = await fetch('/api/v1/exports/students/csv', {
            headers: { 'x-api-key': (import.meta as any).env?.VITE_API_KEY || '' },
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Export complete', description: 'Students exported to CSV.' });
    };

    // Download sample CSV
    const handleDownloadSample = async () => {
        const response = await fetch('/api/v1/exports/sample-csv', {
            headers: { 'x-api-key': (import.meta as any).env?.VITE_API_KEY || '' },
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // View Profile action
    const handleViewProfile = (student: Student) => {
        setProfileStudent(student);
        setIsProfileOpen(true);
    };

    // Edit action
    const handleEdit = (student: Student) => {
        setEditData({ ...student });
        setIsEditOpen(true);
    };

    // Issue credential action
    const handleIssueCredential = (student: Student) => {
        setIssueStudent(student);
        setIssueData({
            templateId: templates[0]?.id || '',
            recipientDid: `did:key:${student.studentId}`,
            sendToDigiLocker: false,
            recipientMobile: '',
        });
        setIsIssueOpen(true);
    };

    const filteredStudents = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return students.filter(student =>
            student.name.toLowerCase().includes(lowerSearch) ||
            student.studentId.toLowerCase().includes(lowerSearch) ||
            student.email.toLowerCase().includes(lowerSearch)
        );
    }, [students, search]);

    // Calculate stats
    const stats = useMemo(() => ({
        total: students.length,
        active: students.filter(s => s.status === 'Active').length,
        alumni: students.filter(s => s.status === 'Alumni').length,
    }), [students]);

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-heading font-bold tracking-tight">Student Database</h2>
                        <p className="text-muted-foreground mt-1">Manage student records and track issued credentials.</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            Import CSV
                        </Button>
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Student
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Student</DialogTitle>
                                    <DialogDescription>Enter the student's details below.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="studentId">Student ID</Label>
                                            <Input
                                                id="studentId"
                                                value={formData.studentId}
                                                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                                placeholder="STU-001"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="year">Enrollment Year</Label>
                                            <Input
                                                id="year"
                                                value={formData.enrollmentYear}
                                                onChange={(e) => setFormData({ ...formData, enrollmentYear: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="program">Program</Label>
                                        <Input
                                            id="program"
                                            value={formData.program}
                                            onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                                            placeholder="B.Tech Computer Science"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                    <Button onClick={() => addMutation.mutate(formData)} disabled={addMutation.isPending}>
                                        {addMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Add Student
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Import Preview Dialog */}
                <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Import Preview</DialogTitle>
                            <DialogDescription>Review the data before importing. {csvData.length} records found.</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[400px] overflow-auto border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Student ID</TableHead>
                                        <TableHead>Program/Type</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {csvData.slice(0, 10).map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.email}</TableCell>
                                            <TableCell>{row.studentid || row.studentId}</TableCell>
                                            <TableCell>{row.credentialtype || row.program || row.major}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {csvData.length > 10 && (
                                <p className="text-center text-sm text-muted-foreground py-2">
                                    ... and {csvData.length - 10} more rows
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleDownloadSample}>
                                <Download className="mr-2 h-4 w-4" />
                                Sample CSV
                            </Button>
                            <Button variant="outline" onClick={() => { setIsImportOpen(false); setCsvData([]); }}>
                                Cancel
                            </Button>
                            <Button onClick={() => importMutation.mutate(csvData)} disabled={importMutation.isPending}>
                                {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Import {csvData.length} Students
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Student Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Student Details</DialogTitle>
                            <DialogDescription>Update the student's information.</DialogDescription>
                        </DialogHeader>
                        {editData && (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Full Name</Label>
                                    <Input
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Student ID</Label>
                                        <Input
                                            value={editData.studentId}
                                            onChange={(e) => setEditData({ ...editData, studentId: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Enrollment Year</Label>
                                        <Input
                                            value={editData.enrollmentYear}
                                            onChange={(e) => setEditData({ ...editData, enrollmentYear: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Program</Label>
                                    <Input
                                        value={editData.program}
                                        onChange={(e) => setEditData({ ...editData, program: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={editData.status}
                                        onValueChange={(v) => setEditData({ ...editData, status: v as any })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Alumni">Alumni</SelectItem>
                                            <SelectItem value="Suspended">Suspended</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button onClick={() => editData && updateMutation.mutate(editData)} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Issue Credential Dialog */}
                <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Issue New Credential</DialogTitle>
                            <DialogDescription>
                                Issue a credential to {issueStudent?.name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Template</Label>
                                <Select
                                    value={issueData.templateId}
                                    onValueChange={(v) => setIssueData({ ...issueData, templateId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map((t: any) => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Recipient DID</Label>
                                <Input
                                    value={issueData.recipientDid}
                                    onChange={(e) => setIssueData({ ...issueData, recipientDid: e.target.value })}
                                    placeholder="did:key:..."
                                />
                                <p className="text-xs text-muted-foreground">
                                    Auto-generated from Student ID. Override if needed.
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="h-4 w-4 text-blue-600" />
                                        <Label>Push to DigiLocker</Label>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={issueData.sendToDigiLocker}
                                        onChange={(e) => setIssueData({ ...issueData, sendToDigiLocker: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                </div>
                                {issueData.sendToDigiLocker && (
                                    <div className="grid gap-2 pl-6">
                                        <Label className="text-xs">Mobile Number (optional)</Label>
                                        <Input
                                            value={issueData.recipientMobile}
                                            onChange={(e) => setIssueData({ ...issueData, recipientMobile: e.target.value })}
                                            placeholder="+91 9876543210"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            DigiLocker will notify the student on this number.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsIssueOpen(false)}>Cancel</Button>
                            <Button onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending || !issueData.templateId}>
                                {issueMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                                Issue Credential
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Student Profile Sheet */}
                <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                    <SheetContent className="w-[400px] sm:w-[540px]">
                        <SheetHeader>
                            <SheetTitle>Student Profile</SheetTitle>
                            <SheetDescription>View student details and credentials</SheetDescription>
                        </SheetHeader>
                        {profileStudent && (
                            <div className="mt-6 space-y-6">
                                {/* Profile Header */}
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profileStudent.name}`} />
                                        <AvatarFallback>{profileStudent.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="text-xl font-semibold">{profileStudent.name}</h3>
                                        <p className="text-sm text-muted-foreground">{profileStudent.studentId}</p>
                                        <Badge className={profileStudent.status === 'Active' ? 'bg-green-100 text-green-700' : ''}>
                                            {profileStudent.status}
                                        </Badge>
                                    </div>
                                </div>

                                <Separator />

                                {/* Contact Info */}
                                <div className="grid gap-4">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact</h4>
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{profileStudent.email}</span>
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div className="grid gap-4">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Academic</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3">
                                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Program</p>
                                                <p className="text-sm font-medium">{profileStudent.program}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Enrolled</p>
                                                <p className="text-sm font-medium">{profileStudent.enrollmentYear}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Credentials */}
                                <div className="grid gap-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Credentials</h4>
                                        <Button size="sm" variant="outline" onClick={() => {
                                            setIsProfileOpen(false);
                                            handleIssueCredential(profileStudent);
                                        }}>
                                            <Plus className="mr-1 h-3 w-3" />
                                            Issue New
                                        </Button>
                                    </div>
                                    {studentCredentials.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No credentials issued yet
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {studentCredentials.map((cred: any) => (
                                                <div key={cred.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-4 w-4 text-blue-600" />
                                                        <div>
                                                            <p className="text-sm font-medium">{cred.templateId}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {cred.createdAt ? new Date(cred.createdAt).toLocaleDateString() : 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge variant={cred.revoked ? 'destructive' : 'default'}>
                                                        {cred.revoked ? 'Revoked' : 'Active'}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </SheetContent>
                </Sheet>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
                            <User className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">Across all programs</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
                            <GraduationCap className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.active}</div>
                            <p className="text-xs text-muted-foreground">Currently enrolled</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Alumni</CardTitle>
                            <User className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.alumni}</div>
                            <p className="text-xs text-muted-foreground">Graduated</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Credentials Issued</CardTitle>
                            <FileCheck className="h-4 w-4 text-amber-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">—</div>
                            <p className="text-xs text-muted-foreground">Total documents</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by Name, ID, or Email..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="border rounded-md bg-card shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Program</TableHead>
                                    <TableHead>Enrollment Year</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No students found. Add students or import a CSV.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-mono text-xs">{student.studentId}</TableCell>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{student.email}</TableCell>
                                            <TableCell>{student.program}</TableCell>
                                            <TableCell>{student.enrollmentYear}</TableCell>
                                            <TableCell>
                                                <Badge variant={student.status === "Active" ? "default" : "outline"} className={student.status === "Active" ? "bg-green-100 text-green-700 border-green-200" : ""}>
                                                    {student.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewProfile(student)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleViewProfile(student)}>
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            View Credentials
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleIssueCredential(student)}>
                                                            <Award className="mr-2 h-4 w-4" />
                                                            Issue New Credential
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(student)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => deleteMutation.mutate(student.id)}
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </Layout>
    );
}
