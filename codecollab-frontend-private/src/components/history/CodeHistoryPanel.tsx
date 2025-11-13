import { useEffect, useRef, useState } from "react";
import { listFiles, listSnapshots } from "@/services/filesService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as monaco from "monaco-editor";

export default function CodeHistoryPanel({ roomId, currentCode, onApply }: { roomId: string; currentCode: string; onApply: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [fileId, setFileId] = useState<string>("");
  const [snaps, setSnaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const diffRef = useRef<HTMLDivElement | null>(null);
  const diffEditorRef = useRef<any>(null);
  const originalModelRef = useRef<any>(null);
  const modifiedModelRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const res: any = await listFiles(roomId);
        const data = (res?.data ?? res) as any[];
        if (!alive) return;
        setFiles(data || []);
        if (data?.length && !fileId) setFileId(data[0].id);
      } catch {}
    })();
    return () => { alive = false; };
  }, [open, roomId]);

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    listSnapshots(fileId)
      .then((res: any) => {
        const data = (res?.data ?? res) as any[];
        setSnaps(data || []);
      })
      .catch(() => setSnaps([]))
      .finally(() => setLoading(false));
  }, [fileId]);

  // Setup Monaco Diff when dialog opens
  useEffect(() => {
    if (!diffOpen || !selected || !diffRef.current) return;
    try {
      // Clean any prior
      try { diffEditorRef.current?.dispose?.(); } catch {}
      try { originalModelRef.current?.dispose?.(); } catch {}
      try { modifiedModelRef.current?.dispose?.(); } catch {}

      originalModelRef.current = monaco.editor.createModel(String(currentCode || ""), 'javascript');
      modifiedModelRef.current = monaco.editor.createModel(String(selected.code || ""), 'javascript');
      diffEditorRef.current = monaco.editor.createDiffEditor(diffRef.current!, {
        readOnly: true,
        renderSideBySide: true,
        automaticLayout: true,
        scrollbar: { vertical: 'visible', horizontal: 'visible' },
        minimap: { enabled: false },
      });
      diffEditorRef.current.setModel({ original: originalModelRef.current, modified: modifiedModelRef.current });
    } catch {}
    return () => {
      try { diffEditorRef.current?.dispose?.(); } catch {}
      try { originalModelRef.current?.dispose?.(); } catch {}
      try { modifiedModelRef.current?.dispose?.(); } catch {}
      diffEditorRef.current = null;
      originalModelRef.current = null;
      modifiedModelRef.current = null;
    };
  }, [diffOpen, selected, diffRef.current]);

  return (
    <div className="absolute inset-y-0 left-0 z-30 w-80 border-r bg-background flex flex-col" style={{ display: open ? "flex" : "none" }}>
      <div className="p-2 border-b flex items-center justify-between">
        <div className="font-medium">History</div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
      </div>
      <div className="p-2 border-b">
        <select value={fileId} onChange={(e) => setFileId(e.target.value)} className="w-full text-sm border rounded px-2 py-1 bg-background">
          {files.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}
        {snaps.map((s) => (
          <div key={s.id} className="border rounded p-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{new Date(s.createdAt).toLocaleString()}</div>
                {s.description ? <div className="text-muted-foreground">{s.description}</div> : null}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setSelected(s); setDiffOpen(true); }}>View Diff</Button>
              </div>
            </div>
          </div>
        ))}
        {!loading && snaps.length === 0 ? <div className="text-xs text-muted-foreground">No snapshots found.</div> : null}
      </div>
      <Button className="absolute -right-10 top-12" size="sm" variant="secondary" onClick={() => setOpen(!open)}>{open ? "←" : "History"}</Button>

      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-5xl w-[90vw] h-[70vh]">
          <DialogHeader>
            <DialogTitle>Snapshot Diff</DialogTitle>
          </DialogHeader>
          <div ref={diffRef} className="mt-2 w-full h-[calc(70vh-7rem)] rounded border" />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDiffOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (selected) onApply(String(selected.code || "")); setDiffOpen(false); }}>Apply Snapshot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
