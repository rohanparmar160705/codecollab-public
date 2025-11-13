import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getRoom, joinRoom, leaveRoom, setRoomVisibility, getRoomShare } from "@/services/roomsService";
import { getSocket } from "@/sockets/socketClient";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { executeCode, getExecution } from "@/services/executionService";
import { saveRoomContent } from "@/services/roomsService";
import * as monaco from "monaco-editor";
import "monaco-editor/min/vs/editor/editor.main.css";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import ChatDrawer from "@/components/chat/ChatDrawer";
import CodeHistoryPanel from "@/components/history/CodeHistoryPanel";
import { useTheme } from "@/providers/ThemeProvider";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { USER_COLORS } from "@/styles/theme";
import { toast } from "@/hooks/use-toast";
import { getProfile } from "@/services/usersService";

export default function RoomEditor() {
  const { id } = useParams();
  const roomId = id as string;
  const { search } = useLocation();
  const inviteCode = useMemo(() => {
    try { return new URLSearchParams(search).get("inviteCode") || undefined; } catch { return undefined; }
  }, [search]);
  const [content, setContent] = useState<string>("");
  const lastRemote = useRef<number>(0);
  const socket = useMemo(() => getSocket(), []);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const monacoEditorRef = useRef<any>(null);
  const [output, setOutput] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [outputHeight, setOutputHeight] = useState<number>(180);
  const resizingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const autosave404Ref = useRef<boolean>(false);
  const { actualTheme } = useTheme();
  const [presentUsers, setPresentUsers] = useState<string[]>([]);
  const cursorDecorationsRef = useRef<Record<string, string[]>>({});
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const yOutputRef = useRef<Y.Map<any> | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const awarenessDecorationsRef = useRef<Record<number, string[]>>({});
  const [yUsers, setYUsers] = useState<{ id: string; name: string; color: string }[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const cursorSendTimerRef = useRef<any>(null);
  const lastCursorSendRef = useRef<number>(0);
  const [presenceRoles, setPresenceRoles] = useState<Record<string, string>>({});

  function hslVarToHex(name: string): string {
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      // raw like: "222 47% 11%"
      const [h, s, l] = raw.split(/\s+/);
      const H = parseFloat(h);
      const S = parseFloat(s.replace('%',''))/100;
      const L = parseFloat(l.replace('%',''))/100;
      const c = (1 - Math.abs(2*L - 1)) * S;
      const x = c * (1 - Math.abs(((H/60)%2) - 1));
      const m = L - c/2;
      let r=0,g=0,b=0;
      if (H < 60) { r=c; g=x; b=0; }
      else if (H < 120) { r=x; g=c; b=0; }
      else if (H < 180) { r=0; g=c; b=x; }
      else if (H < 240) { r=0; g=x; b=c; }
      else if (H < 300) { r=x; g=0; b=c; }
      else { r=c; g=0; b=x; }
      const toHex = (v:number) => Math.round((v+m)*255).toString(16).padStart(2,'0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch { return "#111827"; }
  }

  function applyMonacoTheme() {
    const bg = hslVarToHex('--background');
    const fg = hslVarToHex('--foreground');
    const primary = hslVarToHex('--primary');
    const mutedFg = hslVarToHex('--muted-foreground');
    const selection = hslVarToHex('--accent');
    const id = actualTheme === 'dark' ? 'cc-dark' : 'cc-light';
    monaco.editor.defineTheme(id, {
      base: actualTheme === 'dark' ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [],
      colors: {
        // Transparent to let the aurora gradient show through the container
        'editor.background': '#00000000',
        'editor.foreground': fg,
        'editorCursor.foreground': primary,
        'editorLineNumber.foreground': mutedFg,
        'editorLineNumber.activeForeground': fg,
        'editor.selectionBackground': selection + '80',
        'editor.inactiveSelectionBackground': selection + '40',
        'editorWidget.background': bg,
        'editorBracketMatch.border': primary,
      },
    });
    try { monaco.editor.setTheme(id); } catch {}
    try { monacoEditorRef.current?.updateOptions?.({ theme: id }); } catch {}
  }

  function colorForUser(userId: string) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
    return USER_COLORS[hash % USER_COLORS.length];
  }

  async function copyShareLink() {
    try {
      // Prefer backend share endpoint if present
      let url: string | undefined;
      try { const r: any = await getRoomShare(roomId); url = (r?.url || r?.data?.url); } catch {}
      if (!url) {
        const origin = window.location.origin;
        const path = `/rooms/${roomId}`;
        const qs = inviteCode ? `?inviteCode=${encodeURIComponent(inviteCode)}` : "";
        url = `${origin}${path}${qs}`;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: isPublic ? "Public link copied." : "Invite link copied." });
    } catch {
      toast({ title: "Copy failed", description: "Unable to copy link.", variant: "destructive" });
    }
  }

  async function togglePublic() {
    try {
      const next = !isPublic;
      await setRoomVisibility(roomId, next);
      setIsPublic(next);
      toast({ title: next ? "Room is now public" : "Room is private", description: next ? "Anyone with link can view." : "Only invited users can access." });
    } catch {
      toast({ title: "Update failed", description: "Could not change visibility.", variant: "destructive" });
    }
  }

  const { data: room, isLoading } = useQuery({ queryKey: ["room", roomId, inviteCode], queryFn: () => getRoom(roomId, inviteCode), enabled: !!roomId });

  // Seed editor from server content when available
  useEffect(() => {
    const serverContent = (room as any)?.content;
    const serverPublic = (room as any)?.public;
    const localKey = `room:${roomId}:content`;
    const localContent = localStorage.getItem(localKey) || "";
    if (typeof serverContent === "string" && serverContent.length && !content) {
      setContent(serverContent);
    } else if (localContent && !content) {
      setContent(localContent);
    }
    if (typeof serverPublic === "boolean") setIsPublic(!!serverPublic);
  }, [room]);

  useEffect(() => {
    if (!roomId) return;
    const userId = localStorage.getItem("userId") || "me";
    const username = localStorage.getItem("username") || userId;
    // Try to fetch my role once for tooltip detail
    (async () => {
      try {
        const prof: any = await getProfile();
        const data = (prof?.data ?? prof) as any;
        const roles = Array.isArray(data?.userRoles) ? data.userRoles : [];
        const roleName = roles[0]?.role?.name || "Member";
        setPresenceRoles((m) => ({ ...m, [userId]: roleName }));
      } catch {}
    })();
    joinRoom({ roomId, userId, inviteCode }).catch(() => {});
    // Join collab room (Socket.IO presence logs, optional)
    const roomOwnerId = (room as any)?.owner?.id;
    socket.emit("join-room", { userId, username, roomId, roomOwnerId });
    console.log("[COLLAB] join-room", { userId, username, roomId });

    // Presence updates
    const onPresence = (users: string[]) => {
      console.log("[COLLAB] presence-update", { users });
      setPresentUsers(users);
    };
    socket.on("presence-update", onPresence);

    // Live code updates from others
    const onCodeUpdate = (payload: { code: string }) => {
      if (typeof payload?.code === "string") {
        lastRemote.current = Date.now();
        setContent(payload.code);
      }
    };
    socket.on("code-update", onCodeUpdate);

    // Remote cursors
    const onCursorUpdate = (payload: { userId: string; cursor: any }) => {
      const ed = monacoEditorRef.current;
      if (!ed) return;
      const otherId = payload.userId;
      if (otherId === userId) return;
      const color = colorForUser(otherId);
      const pos = payload.cursor?.position;
      if (!pos) return;
      const range = new (monaco as any).Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
      const opts = [{
        range,
        options: {
          className: "",
          isWholeLine: false,
          afterContentClassName: "",
          overviewRuler: {
            color,
            position: (monaco as any).editor.OverviewRulerLane.Right,
          },
          linesDecorationsClassName: "",
          minimap: { color, position: 1 },
          glyphMarginClassName: "",
          classNameAffectsLetterSpacing: false,
          inlineClassName: "",
        },
      }];
      // Simple colored ruler marker; for richer caret, custom CSS can be added
      const old = cursorDecorationsRef.current[otherId] || [];
      const newDecos = ed.deltaDecorations(old, opts);
      cursorDecorationsRef.current[otherId] = newDecos;
    };
    socket.on("cursor-update", onCursorUpdate);

    // Shared execution results (legacy fallback event from peers)
    const onExecResult = (payload: { roomId: string; output: string; status: string }) => {
      if (payload.roomId === roomId) {
        console.log("[COLLAB] execution-result", payload);
        setOutput(String(payload.output || ""));
      }
    };
    socket.on("execution-result", onExecResult);

    // Live backend streaming via QueueEvents bridge
    const onExecStatus = (payload: { executionId: string; jobId: string; status: string; progress?: number }) => {
      console.log("[COLLAB] execution:status", payload);
      if (typeof payload?.progress === "number") {
        setRunning(true);
        setOutput((prev) => {
          const pct = Math.max(0, Math.min(100, Math.round(payload.progress!)));
          const base = prev && prev !== "Queued..." ? prev.split("\n")[0] : "Running...";
          return `${base}\nProgress: ${pct}%`;
        });
      }
      if (payload?.status === "COMPLETED" || payload?.status === "FAILED") {
        setRunning(false);
      }
    };
    const onExecOutput = (payload: { executionId: string; jobId: string; status: string; output?: string }) => {
      console.log("[COLLAB] execution:output", payload);
      setOutput(String(payload?.output || ""));
      setRunning(false);
    };
    socket.on("execution:status", onExecStatus);
    socket.on("execution:output", onExecOutput);

    return () => {
      socket.off("presence-update", onPresence);
      socket.off("code-update", onCodeUpdate);
      socket.off("cursor-update", onCursorUpdate);
      socket.off("execution-result", onExecResult);
      socket.off("execution:status", onExecStatus);
      socket.off("execution:output", onExecOutput);
      leaveRoom({ roomId, userId }).catch(() => {});
      socket.emit("leave-room", { userId, username, roomId });
      console.log("[COLLAB] leave-room", { userId, username, roomId });
    };
  }, [roomId, socket, room, inviteCode]);

  // If Yjs is active, it handles code sync. Fallback to socket only if provider not ready.
  useEffect(() => {
    if (providerRef.current) return; // Yjs active
    const now = Date.now();
    if (now - lastRemote.current < 100) return;
    const t = setTimeout(() => {
      socket.emit("code-change", { roomId, code: content });
    }, 200);
    return () => clearTimeout(t);
  }, [content, roomId, socket]);

  // Monaco mount
  useEffect(() => {
    if (!containerRef.current) return;
    if (monacoEditorRef.current) return;
    try {
      const lang = (room as any)?.language || "javascript";
      const languageMap: Record<string, string> = {
        javascript: "javascript",
        typescript: "typescript",
        nodejs: "javascript",
        python: "python",
        cpp: "cpp",
        cplusplus: "cpp",
        java: "java",
      };
      const monacoLang = languageMap[String(lang).toLowerCase()] || "javascript";
      monacoEditorRef.current = monaco.editor.create(containerRef.current, {
        value: content,
        language: monacoLang,
        automaticLayout: true,
        theme: actualTheme === "dark" ? "cc-dark" : "cc-light",
        minimap: { enabled: false },
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "off",
        smoothScrolling: true,
        scrollbar: { vertical: "visible", horizontal: "visible" },
        tabSize: 2,
      });
      const disposables: any[] = [];
      // Track listener disposables to avoid leaks when unmounting
      disposables.push(
        monacoEditorRef.current.onDidChangeModelContent(() => {
          const val = monacoEditorRef.current.getValue();
          setContent(val);
        }),
      );
      // Local cursor broadcast
      disposables.push(
        monacoEditorRef.current.onDidChangeCursorPosition((e: any) => {
          const userId = localStorage.getItem("userId") || "me";
          const position = e.position;
          if (!providerRef.current) {
            socket.emit("cursor-move", { roomId, userId, cursor: { position } });
          } else {
            const now = Date.now();
            const send = () => {
              try {
                const awareness = providerRef.current!.awareness as any;
                const sel = monacoEditorRef.current.getSelection();
                awareness.setLocalStateField("cursor", {
                  position,
                  selection: sel ? {
                    startLineNumber: sel.startLineNumber,
                    startColumn: sel.startColumn,
                    endLineNumber: sel.endLineNumber,
                    endColumn: sel.endColumn,
                  } : undefined,
                });
                lastCursorSendRef.current = Date.now();
              } catch {}
            };
            if (now - lastCursorSendRef.current > 50) {
              send();
            } else {
              clearTimeout(cursorSendTimerRef.current);
              cursorSendTimerRef.current = setTimeout(send, 50);
            }
          }
        }),
      );
      try {
        disposables.push(
          monacoEditorRef.current.onDidChangeCursorSelection((e: any) => {
            if (!providerRef.current) return;
            try {
              const position = e.selection?.getPosition ? e.selection.getPosition() : e.selection?.getEndPosition?.();
              const sel = e.selection;
              const awareness = providerRef.current.awareness as any;
              const now = Date.now();
              const send = () => {
                awareness.setLocalStateField("cursor", position ? {
                  position,
                  selection: sel ? {
                    startLineNumber: sel.startLineNumber,
                    startColumn: sel.startColumn,
                    endLineNumber: sel.endLineNumber,
                    endColumn: sel.endColumn,
                  } : undefined,
                } : undefined);
                lastCursorSendRef.current = Date.now();
              };
              if (now - lastCursorSendRef.current > 50) {
                send();
              } else {
                clearTimeout(cursorSendTimerRef.current);
                cursorSendTimerRef.current = setTimeout(send, 50);
              }
            } catch {}
          }),
        );
      } catch {}
      try { monacoEditorRef.current.focus(); } catch {}
      applyMonacoTheme();
      // Cleanup to prevent memory leaks: dispose all Monaco listeners and editor instance
      // Safe because Monaco provides disposables and editor.dispose tears down DOM listeners.
      return () => {
        try { disposables.forEach((d) => d?.dispose?.()); } catch {}
        try { monacoEditorRef.current?.dispose?.(); } catch {}
        monacoEditorRef.current = null;
      };
    } catch (e) {
      
    }
  }, [room, content, actualTheme]);

  // Initialize Yjs provider and MonacoBinding (once editor exists)
  useEffect(() => {
    if (!monacoEditorRef.current || !roomId) return;
    if (providerRef.current) return; // already initialized

    const ydoc = new Y.Doc();
    const token = localStorage.getItem("accessToken") || "";
    const wsBase = (import.meta.env.VITE_YJS_WS_URL || import.meta.env.VITE_SOCKET_URL || "ws://localhost:4000").replace(/^http/, "ws");
    const wsUrl = `${wsBase}/yjs`;

    const provider = new WebsocketProvider(wsUrl, roomId, ydoc, {
      connect: true,
      params: {
        token,
        ...(inviteCode ? { inviteCode } : {}),
      },
    });
    const yText = ydoc.getText("code");
    const yOutput = ydoc.getMap("output");

    const awareness = provider.awareness;
    const userId = localStorage.getItem("userId") || "me";
    const username = localStorage.getItem("username") || userId;
    awareness.setLocalStateField("user", { id: userId, name: username, color: colorForUser(userId) });

    const onAwarenessUpdate = () => {
      const states = awareness.getStates() as Map<number, any>;
      const meId = awareness.clientID as number;
      const arr = Array.from(states.values())
        .map((s: any) => s?.user)
        .filter((u: any) => u && typeof u.id === "string");
      setYUsers(arr);
      const ed = monacoEditorRef.current;
      if (!ed) return;
      const nextDecos: Record<number, string[]> = {};
      states.forEach((st, cid) => {
        if (cid === meId) return;
        const user = st?.user;
        const cur = st?.cursor;
        if (!user || !cur?.position) return;
        const color = user.color || colorForUser(String(user.id || cid));
        const pos = cur.position;
        const caretRange = new (monaco as any).Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
        const opts: any[] = [
          {
            range: caretRange,
            options: {
              overviewRuler: { color, position: (monaco as any).editor.OverviewRulerLane.Right },
              minimap: { color, position: 1 },
              isWholeLine: false,
              hoverMessage: { value: String(user.name || user.id) },
            },
          },
        ];
        const sel = cur.selection;
        if (sel) {
          const selRange = new (monaco as any).Range(sel.startLineNumber, sel.startColumn, sel.endLineNumber, sel.endColumn);
          opts.push({
            range: selRange,
            options: {
              overviewRuler: { color, position: (monaco as any).editor.OverviewRulerLane.Full },
              isWholeLine: false,
              hoverMessage: { value: String(user.name || user.id) },
            },
          });
        }
        const old = awarenessDecorationsRef.current[cid] || [];
        const newDecos = ed.deltaDecorations(old, opts);
        nextDecos[cid] = newDecos;
      });
      Object.keys(awarenessDecorationsRef.current).forEach((k) => {
        const cid = Number(k);
        if (!(cid in nextDecos)) {
          try { const old = awarenessDecorationsRef.current[cid] || []; monacoEditorRef.current.deltaDecorations(old, []); } catch {}
        }
      });
      awarenessDecorationsRef.current = nextDecos;
    };
    awareness.on("update", onAwarenessUpdate);
    onAwarenessUpdate();

    const model = monacoEditorRef.current.getModel();
    const binding = new MonacoBinding(yText, model, new Set([monacoEditorRef.current]), awareness);

    const onOutputUpdate = () => {
      const out = String(yOutput.get("text") || "");
      setOutput(out);
    };
    yOutput.observe(onOutputUpdate);

    // Optional: seed content once
    try {
      if ((room as any)?.content && yText.length === 0) {
        yText.insert(0, (room as any).content);
      }
    } catch {}

    ydocRef.current = ydoc;
    providerRef.current = provider;
    yTextRef.current = yText;
    yOutputRef.current = yOutput;
    bindingRef.current = binding;

    return () => {
      try { yOutput.unobserve(onOutputUpdate); } catch {}
      try { binding.destroy(); } catch {}
      try { awareness.off("update", onAwarenessUpdate); } catch {}
      try {
        const ed = monacoEditorRef.current;
        if (ed) {
          Object.values(awarenessDecorationsRef.current).forEach((ids) => {
            try { ed.deltaDecorations(ids, []); } catch {}
          });
        }
        awarenessDecorationsRef.current = {};
      } catch {}
      try { provider.destroy(); } catch {}
      try { ydoc.destroy(); } catch {}
      ydocRef.current = null;
      providerRef.current = null;
      yTextRef.current = null;
      yOutputRef.current = null;
      bindingRef.current = null;
    };
  }, [monacoEditorRef.current, roomId, inviteCode, room]);

  // Switch theme dynamically when user toggles theme to keep Monaco in sync with CSS tokens
  useEffect(() => {
    applyMonacoTheme();
  }, [actualTheme]);

  // Keep Monaco value in sync with remote updates
  useEffect(() => {
    const ed = monacoEditorRef.current;
    if (!ed) return;
    if (Date.now() - lastRemote.current < 80) {
      try {
        if (ed.getValue() !== content) ed.setValue(content);
      } catch {}
    }
  }, [content]);

  // Autosave (debounced) when local edits happen with localStorage fallback on 404
  useEffect(() => {
    const now = Date.now();
    if (now - lastRemote.current < 120) return;
    const t = setTimeout(async () => {
      try {
        if (!autosave404Ref.current) {
          await saveRoomContent({ roomId, content, language: (room as any)?.language });
        } else {
          localStorage.setItem(`room:${roomId}:content`, content);
        }
      } catch (e: any) {
        if (e?.response?.status === 404 || e?.response?.status === 403) {
          autosave404Ref.current = true;
          try {
            localStorage.setItem(`room:${roomId}:content`, content);
          } catch {}
        } else {
          
        }
      }
    }, 800);
    return () => clearTimeout(t);
  }, [content, roomId, room]);

  // Always mirror to localStorage fast (best-effort), independent of server autosave window
  useEffect(() => {
    try {
      localStorage.setItem(`room:${roomId}:content`, content);
    } catch {}
  }, [content, roomId]);

  // Resizable output panel handlers
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizingRef.current) return;
      const dy = e.clientY - startYRef.current;
      const next = Math.max(100, Math.min(400, startHeightRef.current + dy));
      setOutputHeight(next);
    }
    function onUp() {
      resizingRef.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [outputHeight]);

  if (!roomId) return <div className="p-6">Invalid room</div>;
  if (isLoading) return <div className="p-6">Loading room...</div>;

  const language = (room as any)?.language || "javascript";

  async function onRun() {
    try {
      console.log("[RUN 1] Run clicked", { roomId, language });
      setRunning(true);
      setOutput("Queued...");
      const code = monacoEditorRef.current ? monacoEditorRef.current.getValue() : content;
      const res = await executeCode({ code, language, roomId });
      const data = (res as any)?.data || res;
      console.log("[RUN 2] Run response (full)", data);
      // If queued, poll for result
      const execId = data?.executionId || data?.id;
      if (execId) {
        const started = Date.now();
        const poll = async () => {
          try {
            const r = await getExecution(execId);
            console.log("[RUN P-RAW] GET /execution/:id raw", r);
            const exec = (r as any)?.data || r;
            console.log("[RUN P-EXEC] Exec record", exec);
            const status = exec?.status;
            console.log("[RUN P] Poll tick", { execId, status, hasOutput: typeof exec?.output === "string" });
            if (status === "COMPLETED" || status === "FAILED") {
              const out = exec?.output ?? exec?.stdout ?? exec?.errorMessage ?? JSON.stringify(exec);
              console.log("[RUN P2] Final result (all fields)", { status, execId, output: exec?.output, stdout: (exec as any)?.stdout, stderr: (exec as any)?.stderr, errorMessage: exec?.errorMessage, preview: String(out ?? "").slice(0, 200) });
              const display = String(out ?? "");
              setOutput(display.length ? display : "(no output)" );
              setRunning(false);
              // Share result via Yjs (preferred)
              try {
                if (yOutputRef.current) {
                  yOutputRef.current.set("text", display);
                } else {
                  // Fallback to socket broadcast if Yjs not ready
                  socket.emit("execution-result", { roomId, status, output: display });
                }
              } catch {}
              return true;
            }
            if (Date.now() - started > 30000) {
              console.warn("[RUN PT] Timed out waiting for result", { execId });
              setOutput("Timed out waiting for result. Check history.");
              setRunning(false);
              return true;
            }
            return false;
          } catch {
            console.error("[RUN PE] Fetch execution failed", { execId });
            setOutput("Failed to fetch execution result.");
            setRunning(false);
            return true;
          }
        };
        let stopped = await poll();
        while (!stopped) {
          await new Promise((r) => setTimeout(r, 1000));
          stopped = await poll();
        }
      } else {
        const out = data?.output ?? data?.stdout ?? JSON.stringify(data);
        console.log("[RUN 2A] Immediate result (all fields)", { data, preview: String(out ?? "").slice(0, 200) });
        const display = String(out ?? "");
        setOutput(display.length ? display : "(no output)");
      }
    } catch (e) {
      console.error("[RUN 2E] Run failed", e);
      setOutput("Run failed. Check console.");
    } finally {
      setRunning(false);
      console.log("[RUN 3] Run finished");
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{room?.name || roomId}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="font-medium text-sm text-muted-foreground">Language: {language}</div>
        </div>
        <div className="flex items-center gap-2 relative">
          {/* Presence avatars */}
          <div className="hidden md:flex items-center -space-x-2 mr-2">
            {(yUsers.length ? yUsers : [{ id: localStorage.getItem("userId") || "me", name: localStorage.getItem("username") || "Me", color: colorForUser(localStorage.getItem("userId") || "me") }]).slice(0,6).map((u, idx) => (
              <HoverCard key={String(u.id)+idx}>
                <HoverCardTrigger asChild>
                  <div className="rounded-full border-2" style={{ borderColor: u.color }}>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback style={{ backgroundColor: u.color }} className="text-[10px] text-white">
                        {(u.name || u.id).slice(0,2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-56">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback style={{ backgroundColor: u.color }} className="text-xs text-white">
                        {(u.name || u.id).slice(0,2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.name || u.id}</div>
                      <div className="text-xs text-muted-foreground truncate">{presenceRoles[u.id] || "Member"}</div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
            {yUsers.length > 6 ? (
              <div className="h-7 w-7 rounded-full bg-accent text-[11px] flex items-center justify-center border-2 border-border">+{yUsers.length - 6}</div>
            ) : null}
          </div>
          <Popover open={showUsers} onOpenChange={setShowUsers}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                {Math.max(1, yUsers.length)} online
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="max-h-64 overflow-auto space-y-1">
                {(yUsers.length ? yUsers : [{ id: "me", name: localStorage.getItem("username") || localStorage.getItem("userId") || "me", color: colorForUser(localStorage.getItem("userId") || "me") }]).map((u, idx) => (
                  <HoverCard key={String(u.id) + idx}>
                    <HoverCardTrigger asChild>
                      <div className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-accent cursor-default">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback style={{ backgroundColor: u.color }} className="text-[10px] text-white">
                            {(u.name || u.id).slice(0,2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{u.name || u.id}</span>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-56">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ backgroundColor: u.color }} className="text-xs text-white">
                            {(u.name || u.id).slice(0,2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{u.name || u.id}</div>
                          <div className="text-xs text-muted-foreground truncate">Active in this room</div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm">Share</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Share options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={copyShareLink}>Copy Share Link</DropdownMenuItem>
              <DropdownMenuItem onClick={togglePublic}>{isPublic ? "Make Private" : "Make Public"}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="secondary" asChild>
            <Link to="/dashboard">Back</Link>
          </Button>
          <Button onClick={onRun} disabled={running}>{running ? "Running..." : "Run"}</Button>
        </div>
      </div>
      <div className="flex-1 bg-aurora relative">
        <div ref={containerRef} className="w-full h-full" />
        <CodeHistoryPanel
          roomId={roomId}
          currentCode={(monacoEditorRef.current ? monacoEditorRef.current.getValue() : content) || ""}
          onApply={(code) => {
            try {
              if (yTextRef.current) {
                const y = yTextRef.current;
                y.delete(0, y.length);
                y.insert(0, code);
              } else if (monacoEditorRef.current) {
                monacoEditorRef.current.setValue(code);
              } else {
                setContent(code);
              }
            } catch {}
          }}
        />
      </div>
      <div
        onMouseDown={(e) => {
          resizingRef.current = true;
          startYRef.current = e.clientY;
          startHeightRef.current = outputHeight;
        }}
        className="h-1 cursor-row-resize bg-border"
      />
      <div className="border-t bg-background p-2 overflow-auto" style={{ height: outputHeight }}>
        <div className="text-xs font-semibold mb-1">Output</div>
        <pre className="text-xs whitespace-pre-wrap">{output}</pre>
      </div>
      <ChatDrawer roomId={roomId} />
    </div>
  );
}
