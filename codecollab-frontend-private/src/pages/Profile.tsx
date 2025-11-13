import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/services/usersService";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const [form, setForm] = useState<{ username?: string; email?: string; avatarUrl?: string; fontSize?: number; theme?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await getProfile();
        const user = (res?.data ?? res) as any;
        setForm({ username: user.username, email: user.email, avatarUrl: user.avatarUrl });
      } catch {}
    })();
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      await updateProfile({ username: form.username, email: form.email, avatarUrl: form.avatarUrl });
    } catch {}
    setSaving(false);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      <div className="space-y-2">
        <label className="block text-sm">Username</label>
        <input className="w-full border rounded px-2 py-1 bg-background" value={form.username || ""} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Email</label>
        <input className="w-full border rounded px-2 py-1 bg-background" value={form.email || ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Avatar URL</label>
        <input className="w-full border rounded px-2 py-1 bg-background" value={form.avatarUrl || ""} onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))} />
      </div>
      <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
    </div>
  );
}
