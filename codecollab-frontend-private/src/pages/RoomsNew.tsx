import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createRoom } from "@/services/roomsService";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RoomsNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", language: "javascript", description: "" });

  const createMut = useMutation({
    mutationFn: async () => {
      console.log("[NEW 1] Create clicked", { form });
      if (!form.name.trim()) throw new Error("Name is required");
      return await createRoom({ name: form.name.trim(), language: form.language, description: form.description || undefined });
    },
    onSuccess: (room: any) => {
      console.log("[NEW 2] Room created", room);
      if (room?.id) {
        console.log("[NEW 3] Navigating to editor", { id: room.id });
        navigate(`/rooms/${room.id}`);
      } else {
        console.log("[NEW 3A] Missing room id, going dashboard");
        navigate("/dashboard");
      }
    },
    onError: (e) => {
      console.error("[NEW 2E] Create failed", e);
    },
  });

  return (
    <main className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create New Room</h1>
        <p className="text-muted-foreground mt-1">Set up a collaborative coding room</p>
      </div>
      <Card className="max-w-2xl">
        <CardHeader className="p-4 md:p-6">
          <CardTitle>Room details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Room Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Pair Session" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              className="w-full border rounded px-3 py-2 bg-background"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending ? "Creating..." : "Create Room"}
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/dashboard">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
