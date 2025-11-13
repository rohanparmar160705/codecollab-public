import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderCode, Plus, Users, Clock } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { deleteRoom, listRooms, getRoomShare, setRoomVisibility } from "@/services/roomsService";
import { getOverview } from "@/services/analyticsService";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: rooms, isLoading, refetch } = useQuery({ queryKey: ["rooms", "mine"], queryFn: listRooms });
  const { data: overview } = useQuery({ queryKey: ["analytics", "overview"], queryFn: getOverview });
  useEffect(() => {
    console.log("[ROOM 1] Rooms query loaded", { count: Array.isArray(rooms) ? rooms.length : 0 });
  }, [rooms]);
  const delMut = useMutation({
    mutationFn: async (id: string) => {
      console.log("[ROOM 2] Deleting room", { id });
      return await deleteRoom(id);
    },
    onSuccess: () => {
      console.log("[ROOM 3] Delete success, refetching rooms");
      refetch();
    },
    onError: (e) => {
      console.error("[ROOM 3E] Delete failed", e);
    },
  });

  const [shareOpen, setShareOpen] = useState(false);
  const [shareInfo, setShareInfo] = useState<{ id: string; inviteCode?: string; url: string; urlWithCode: string } | null>(null);
  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  async function openShareModal(room: any) {
    try {
      const share = await getRoomShare(room.id);
      const code = share?.inviteCode || "";
      const url = `${origin}/rooms/${room.id}`;
      const urlWithCode = `${url}${code ? `?inviteCode=${code}` : ""}`;
      console.log("[ROOM SHARE]", { id: room.id, fullLink: url, linkWithCode: urlWithCode, inviteCode: code });
      setShareInfo({ id: room.id, inviteCode: code, url, urlWithCode });
      setShareOpen(true);
    } catch (e) {
      console.error("[ROOM SHARE E] Failed to fetch share info", e);
    }
  }

  async function makePublicAndShare(room: any) {
    try {
      const vis = await setRoomVisibility(room.id, true);
      console.log("[ROOM VIS] Made public", vis);
      const code = vis?.inviteCode || "";
      const url = `${origin}/rooms/${room.id}`;
      const urlWithCode = `${url}${code ? `?inviteCode=${code}` : ""}`;
      console.log("[ROOM VIS LINKS]", { fullLink: url, linkWithCode: urlWithCode, inviteCode: code });
      setShareInfo({ id: room.id, inviteCode: code, url, urlWithCode });
      setShareOpen(true);
      refetch();
    } catch (e) {
      console.error("[ROOM VIS E] Failed to make public", e);
    }
  }

  async function copy(text: string, label: string) {
    try { await navigator.clipboard?.writeText(text); console.log("[ROOM COPY] Copied", { label, text }); } catch (e) { console.error("[ROOM COPY E]", e); }
  }

  const roomsCount = Array.isArray(rooms) ? rooms.length : 0;
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your collaborative coding rooms
            </p>
          </div>
          <Button asChild>
            <Link to="/rooms/new">
              <Plus className="mr-2 h-4 w-4" />
              New Room
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rooms</CardTitle>
              <FolderCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totals.totalRooms ?? roomsCount}</div>
              <p className="text-xs text-muted-foreground">Platform rooms total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collaborators</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totals.totalUsers ?? 0}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totals.totalExecutions ?? 0}</div>
              <p className="text-xs text-muted-foreground">Total code runs</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Rooms */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Rooms</CardTitle>
            <CardDescription>
              Your most recently accessed collaborative rooms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading rooms...</div>
            ) : Array.isArray(rooms) && rooms.length > 0 ? (
              <div className="space-y-3">
                {rooms.map((r: any, idx: number) => (
                  <div key={r.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.language} • {new Date(r.createdAt || Date.now()).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          console.log("[ROOM 4] Join clicked", { idx, id: r.id });
                          navigate(`/rooms/${r.id}`);
                        }}
                      >
                        Join
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openShareModal(r)}
                      >
                        Share
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => makePublicAndShare(r)}
                      >
                        Make Public
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => delMut.mutate(r.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderCode className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rooms yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Create your first collaborative coding room to get started with real-time pair programming
                </p>
                <Button asChild>
                  <Link to="/rooms/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Room
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Room</DialogTitle>
            <DialogDescription>
              Share this room using the links below. Anyone with the invite link can access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Full link</div>
              <div className="flex gap-2">
                <input className="flex-1 border rounded px-2 py-1 text-sm bg-background" readOnly value={shareInfo?.url || ""} />
                <Button variant="outline" onClick={() => copy(shareInfo?.url || "", "full")}>Copy</Button>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Link with invite code</div>
              <div className="flex gap-2">
                <input className="flex-1 border rounded px-2 py-1 text-sm bg-background" readOnly value={shareInfo?.urlWithCode || ""} />
                <Button variant="outline" onClick={() => copy(shareInfo?.urlWithCode || "", "withCode")}>Copy</Button>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Invite code only</div>
              <div className="flex gap-2">
                <input className="flex-1 border rounded px-2 py-1 text-sm bg-background" readOnly value={shareInfo?.inviteCode || ""} />
                <Button variant="outline" onClick={() => copy(shareInfo?.inviteCode || "", "code")}>Copy</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShareOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
