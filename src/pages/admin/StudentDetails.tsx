import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ArrowLeft, FileText, Eye, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const HEARD_OPTIONS = ["Instagram", "Facebook", "Google", "Walk in", "Referred by a friend", "Other"];

interface KYCDoc { name: string; url: string; uploadedAt: string; }

const StudentList = () => {
  const [search, setSearch] = useState("");

  const { data: students, isLoading } = useQuery({
    queryKey: ["admin-student-list"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      if (rolesError) throw rolesError;
      const ids = (roles || []).map(r => r.user_id);
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone, enrollment_status")
        .in("id", ids)
        .order("first_name");

      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("student_id, student_code, status")
        .in("student_id", ids);

      const codeMap = new Map<string, string>();
      (enrolls || []).forEach(e => {
        if (!codeMap.has(e.student_id) && e.student_code) codeMap.set(e.student_id, e.student_code);
      });

      return (profiles || []).map(p => ({
        ...p,
        student_code: codeMap.get(p.id) || "—",
      }));
    },
  });

  const filtered = (students || []).filter(s => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.first_name || "").toLowerCase().includes(q) ||
      (s.last_name || "").toLowerCase().includes(q) ||
      (s.phone || "").includes(q) ||
      (s.student_code || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Student Details</h1>
          <p className="text-muted-foreground">All student profile records as entered in their Profile settings</p>
        </div>

        <Card className="p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or student code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              maxLength={100}
            />
          </div>
        </Card>

        <Card>
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="p-12 text-center text-muted-foreground">No students found</p>
          ) : (
            <div className="divide-y">
              {filtered.map(s => (
                <Link
                  key={s.id}
                  to={`/admin/student-details/${s.id}`}
                  className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-muted-foreground">{s.student_code} · {s.phone || "no phone"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{s.enrollment_status || "—"}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

const StudentDetail = ({ id }: { id: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewDoc, setPreviewDoc] = useState<KYCDoc | null>(null);
  const [form, setForm] = useState({
    first_name: "", last_name: "", phone: "", email: "", bio: "",
    date_of_birth: "", date_of_joining: "", address: "",
    heard_about: "", heard_about_other: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-student-detail", id],
    queryFn: async () => {
      const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", id).single();
      if (error) throw error;

      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("*, courses(title), batches(batch_name, time_slot, start_date, end_date)")
        .eq("student_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: files } = await supabase.storage.from("kyc-documents").list(id);
      const docs: KYCDoc[] = (files || []).map(f => ({
        name: f.name,
        url: supabase.storage.from("kyc-documents").getPublicUrl(`${id}/${f.name}`).data.publicUrl,
        uploadedAt: f.created_at || "",
      }));

      return { profile, enrollment, docs };
    },
  });

  useEffect(() => {
    if (data?.profile) {
      const p: any = data.profile;
      setForm({
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        phone: p.phone || "",
        email: p.email || "",
        bio: p.bio || "",
        date_of_birth: p.date_of_birth || "",
        date_of_joining: p.date_of_joining || "",
        address: p.address || "",
        heard_about: p.heard_about || "",
        heard_about_other: p.heard_about_other || "",
      });
    }
  }, [data?.profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        bio: form.bio,
        date_of_birth: form.date_of_birth || null,
        date_of_joining: form.date_of_joining || null,
        address: form.address || null,
        heard_about: form.heard_about || null,
        heard_about_other: form.heard_about === "Other" ? form.heard_about_other : null,
        updated_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-student-detail", id] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Admin" />
        <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </div>
    );
  }

  const enrollment: any = data?.enrollment;

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin/student-details")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Student Details
        </Button>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input value={form.first_name} maxLength={100} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={form.last_name} maxLength={100} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
            <div>
              <Label>Mobile Number</Label>
              <Input value={form.phone} maxLength={20} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} disabled />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            </div>
            <div>
              <Label>Date of Joining</Label>
              <Input type="date" value={form.date_of_joining} onChange={e => setForm(f => ({ ...f, date_of_joining: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea value={form.address} maxLength={500} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label>Heard about Knead & Frost through</Label>
              <Select value={form.heard_about} onValueChange={v => setForm(f => ({ ...f, heard_about: v }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {HEARD_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.heard_about === "Other" && (
              <div>
                <Label>Specify Other</Label>
                <Input value={form.heard_about_other} maxLength={100} onChange={e => setForm(f => ({ ...f, heard_about_other: e.target.value }))} />
              </div>
            )}
            <div className="md:col-span-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} maxLength={500} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Enrollment Summary</h2>
          {!enrollment ? (
            <p className="text-muted-foreground">No active enrollment.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Student Code:</span> <span className="font-medium">{enrollment.student_code || "—"}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="capitalize">{enrollment.status}</Badge></div>
              <div><span className="text-muted-foreground">Course:</span> <span className="font-medium">{enrollment.courses?.title || "—"}</span></div>
              <div><span className="text-muted-foreground">Batch:</span> <span className="font-medium">{enrollment.batches?.batch_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Time Slot:</span> <span className="font-medium">{enrollment.batches?.time_slot || "—"}</span></div>
              <div><span className="text-muted-foreground">Progress:</span> <span className="font-medium">{enrollment.progress ?? 0}%</span></div>
              <div><span className="text-muted-foreground">Enrolled:</span> <span className="font-medium">{enrollment.enrollment_date ? format(new Date(enrollment.enrollment_date), "MMM d, yyyy") : "—"}</span></div>
              <div><span className="text-muted-foreground">Attendance:</span> <span className="font-medium">{enrollment.attended_classes ?? 0} / {enrollment.total_classes ?? 0}</span></div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">KYC Documents</h2>
          {(data?.docs || []).length === 0 ? (
            <p className="text-muted-foreground">No KYC documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {data!.docs.map(d => (
                <div key={d.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{d.name}</p>
                      {d.uploadedAt && <p className="text-xs text-muted-foreground">{format(new Date(d.uploadedAt), "MMM d, yyyy")}</p>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setPreviewDoc(d)}>
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {previewDoc && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-3 flex items-center justify-between border-b">
                <p className="font-medium truncate">{previewDoc.name}</p>
                <Button size="sm" variant="ghost" onClick={() => setPreviewDoc(null)}>Close</Button>
              </div>
              {previewDoc.name.toLowerCase().endsWith(".pdf") ? (
                <iframe src={previewDoc.url} className="w-full h-[80vh]" title={previewDoc.name} />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.name} className="max-h-[80vh] mx-auto" />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const StudentDetailsPage = () => {
  const { id } = useParams<{ id?: string }>();
  return id ? <StudentDetail id={id} /> : <StudentList />;
};

export default StudentDetailsPage;
