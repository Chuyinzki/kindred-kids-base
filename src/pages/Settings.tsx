import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const [providerNumber, setProviderNumber] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerAltId, setProviderAltId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setProviderNumber(data.provider_number || "");
        setProviderName(data.provider_name || "");
        setProviderAltId(data.provider_alt_id || "");
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        provider_number: providerNumber || null,
        provider_name: providerName || null,
        provider_alt_id: providerAltId || null,
      })
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-lg">
      <div>
        <h1 className="font-heading text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Provider information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Provider Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Provider #</Label>
            <Input value={providerNumber} onChange={e => setProviderNumber(e.target.value)} placeholder="e.g. 12345" />
          </div>
          <div className="space-y-1">
            <Label>Daycare Name</Label>
            <Input value={providerName} onChange={e => setProviderName(e.target.value)} placeholder="e.g. Little Stars Daycare" />
          </div>
          <div className="space-y-1">
            <Label>Provider Alt ID</Label>
            <Input value={providerAltId} onChange={e => setProviderAltId(e.target.value)} placeholder="Optional" />
          </div>
          <Button onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" /> Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
