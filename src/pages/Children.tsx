import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Baby } from "lucide-react";
import { format, differenceInYears, differenceInMonths } from "date-fns";

interface Child {
  id: string;
  child_id_number: string;
  name: string;
  dob: string;
  family_number: string;
  family_alt_id: string | null;
  parent_name: string;
  specialist_tech_no: string | null;
  family_pin: string;
  provider_id: string;
}

const emptyForm = {
  child_id_number: "",
  name: "",
  dob: "",
  family_number: "",
  family_alt_id: "",
  parent_name: "",
  specialist_tech_no: "",
  family_pin: "",
};

const parseLocalDate = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split("-").map((v) => Number(v));
  if (!y || !m || !d) return new Date(isoDate);
  return new Date(y, m - 1, d);
};

const Children = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchChildren = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("provider_id", user.id)
      .order("name");
    if (error) toast.error(error.message);
    else setChildren(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchChildren(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.family_pin.length !== 4 || !/^\d{4}$/.test(form.family_pin)) {
      toast.error("Family PIN must be exactly 4 digits");
      return;
    }

    const samePinChildren = children.filter(
      (c) => c.family_pin === form.family_pin && c.id !== editingId
    );
    if (samePinChildren.length > 0) {
      const sharedFamilyNumbers = Array.from(new Set(samePinChildren.map((c) => c.family_number)));
      const pinMatchesFamily = sharedFamilyNumbers.includes(form.family_number);
      if (!pinMatchesFamily) {
        const proceed = confirm(
          `This PIN is already used by ${samePinChildren.length} child(ren) in family # ${sharedFamilyNumbers.join(", ")}.\n\n` +
          `You entered family # ${form.family_number}. Continue anyway?`
        );
        if (!proceed) return;
      }
    }

    const payload = {
      ...form,
      family_alt_id: form.family_alt_id || null,
      specialist_tech_no: form.specialist_tech_no || null,
      provider_id: user.id,
    };

    if (editingId) {
      const { error } = await supabase.from("children").update(payload).eq("id", editingId);
      if (error) toast.error(error.message);
      else toast.success("Child updated");
    } else {
      const { error } = await supabase.from("children").insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Child added");
    }

    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(false);
    fetchChildren();
  };

  const handleEdit = (child: Child) => {
    setForm({
      child_id_number: child.child_id_number,
      name: child.name,
      dob: child.dob,
      family_number: child.family_number,
      family_alt_id: child.family_alt_id || "",
      parent_name: child.parent_name,
      specialist_tech_no: child.specialist_tech_no || "",
      family_pin: child.family_pin,
    });
    setEditingId(child.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will also delete all attendance records.")) return;
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Child removed"); fetchChildren(); }
  };

  const getAge = (dob: string) => {
    const birthDate = parseLocalDate(dob);
    const years = differenceInYears(new Date(), birthDate);
    const months = differenceInMonths(new Date(), birthDate) % 12;
    if (years === 0) return `${months}mo`;
    return `${years}y ${months}mo`;
  };

  const filtered = children.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.parent_name.toLowerCase().includes(search.toLowerCase()) ||
    c.child_id_number.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Children</h1>
          <p className="text-muted-foreground">{children.length} enrolled</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm(emptyForm); setEditingId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Child</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">{editingId ? "Edit Child" : "Add Child"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
                </div>
                <div className="space-y-1">
                  <Label>Child ID # *</Label>
                  <Input value={form.child_id_number} onChange={e => setForm(f => ({...f, child_id_number: e.target.value}))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date of Birth *</Label>
                  <Input type="date" value={form.dob} onChange={e => setForm(f => ({...f, dob: e.target.value}))} required />
                </div>
                <div className="space-y-1">
                  <Label>Family PIN (4 digits) *</Label>
                  <Input value={form.family_pin} onChange={e => setForm(f => ({...f, family_pin: e.target.value.replace(/\D/g, "").slice(0,4)}))} maxLength={4} required placeholder="0000" />
                  {form.family_pin.length === 4 && children.some(c => c.family_pin === form.family_pin && c.id !== editingId) && (
                    <p className="text-[11px] text-amber-600">
                      PIN already exists for another child. Confirm family number before saving.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Family # *</Label>
                  <Input value={form.family_number} onChange={e => setForm(f => ({...f, family_number: e.target.value}))} required />
                </div>
                <div className="space-y-1">
                  <Label>Alt ID</Label>
                  <Input value={form.family_alt_id} onChange={e => setForm(f => ({...f, family_alt_id: e.target.value}))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Parent Name *</Label>
                <Input value={form.parent_name} onChange={e => setForm(f => ({...f, parent_name: e.target.value}))} required />
              </div>
              <div className="space-y-1">
                <Label>Specialist/Tech #</Label>
                <Input value={form.specialist_tech_no} onChange={e => setForm(f => ({...f, specialist_tech_no: e.target.value}))} />
              </div>
              <Button type="submit" className="w-full">{editingId ? "Update" : "Add"} Child</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, parent, or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Baby className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-heading font-semibold text-lg mb-1">
              {children.length === 0 ? "No children enrolled" : "No results found"}
            </h3>
            <p className="text-muted-foreground">
              {children.length === 0 ? "Add your first child to get started" : "Try adjusting your search"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(child => (
            <Card key={child.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-heading font-bold text-primary text-lg">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{child.name}</p>
                      <p className="text-xs text-muted-foreground">Age: {getAge(child.dob)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(child)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(child.id)} className="text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Parent:</span> {child.parent_name}</p>
                  <p><span className="font-medium text-foreground">ID:</span> {child.child_id_number} · <span className="font-medium text-foreground">Family:</span> {child.family_number}</p>
                  <p><span className="font-medium text-foreground">DOB:</span> {format(parseLocalDate(child.dob), "MMM d, yyyy")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Children;
