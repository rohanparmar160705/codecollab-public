// src/modules/room/room.types.ts
export interface RoomPayload {
  name: string;
  language?: string;
  description?: string;
}

export interface JoinRoomPayload {
  roomId: string;
  userId: string;
}

export interface RoomResponse {
  id: string;
  name: string;
  ownerId: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}
