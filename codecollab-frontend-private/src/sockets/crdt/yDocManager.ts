import * as Y from "yjs";

type RoomDocs = Map<string, Y.Doc>; // fileId -> Y.Doc or use a single doc and map texts

const roomDocs = new Map<string, RoomDocs>();

export function getRoomDocs(roomId: string) {
  if (!roomDocs.has(roomId)) roomDocs.set(roomId, new Map());
  return roomDocs.get(roomId)!;
}

export function getFileDoc(roomId: string, fileId: string) {
  const docs = getRoomDocs(roomId);
  if (!docs.has(fileId)) docs.set(fileId, new Y.Doc());
  return docs.get(fileId)!;
}
