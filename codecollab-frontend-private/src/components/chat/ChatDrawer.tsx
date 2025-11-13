import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/sockets/socketClient";
import { listChat } from "@/services/chatService";
import { Button } from "@/components/ui/button";

export default function ChatDrawer({ roomId }: { roomId: string }) {
  const socket = getSocket();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; userId: string; text: string; createdAt: string; user?: { username?: string; avatarUrl?: string } }>>([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const me = localStorage.getItem("userId") || "me";

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    listChat(roomId)
      .then((res: any) => {
        const data = (res?.data ?? res) as any[];
        if (mounted) setMessages(data || []);
        setTimeout(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" }), 50);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [open, roomId]);

  useEffect(() => {
    const onReceive = (payload: any) => {
      if (payload?.roomId !== roomId) return;
      setMessages((m) => [...m, payload]);
      setTimeout(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" }), 10);
    };
    const onTyping = (payload: { userId: string; typing: boolean }) => {
      if (!payload) return;
      setTypingUsers((prev) => {
        const next = { ...prev } as Record<string, number>;
        if (payload.typing) next[payload.userId] = Date.now();
        else delete next[payload.userId];
        return next;
      });
    };
    socket.on("chat:receive", onReceive);
    socket.on("chat:typing", onTyping);
    return () => {
      socket.off("chat:receive", onReceive);
      socket.off("chat:typing", onTyping);
    };
  }, [roomId, socket]);

  function emitTypingTyping(val: string) {
    try {
      socket.emit("chat:typing", { roomId, userId: me, typing: val.length > 0 });
    } catch {}
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    socket.emit("chat:send", { roomId, userId: me, text });
    setInput("");
    try { socket.emit("chat:typing", { roomId, userId: me, typing: false }); } catch {}
  }

  const typingDisplay = Object.keys(typingUsers)
    .filter((u) => u !== me && Date.now() - (typingUsers[u] || 0) < 3000)
    .slice(0, 3)
    .join(", ");

  return (
    <div className="absolute inset-y-0 right-0 z-30 w-80 border-l bg-background flex flex-col" style={{ display: open ? "flex" : "none" }}>
      <div className="p-2 border-b flex items-center justify-between">
        <div className="font-medium">Chat</div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
      </div>
      <div ref={scrollerRef} className="flex-1 overflow-auto p-3 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`text-sm ${m.userId === me ? "text-right" : "text-left"}`}>
            <div className="text-muted-foreground text-[11px]">{m.user?.username || m.userId}</div>
            <div className={`inline-block px-2 py-1 rounded-md ${m.userId === me ? "bg-primary text-primary-foreground" : "bg-accent"}`}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t space-y-1">
        {typingDisplay ? <div className="text-[11px] text-muted-foreground">{typingDisplay} typing…</div> : null}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border px-2 py-1 text-sm bg-background"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => { setInput(e.target.value); emitTypingTyping(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          />
          <Button size="sm" onClick={send}>Send</Button>
        </div>
      </div>
      <Button className="absolute -left-10 top-2" size="sm" variant="secondary" onClick={() => setOpen(!open)}>{open ? "→" : "Chat"}</Button>
    </div>
  );
}
