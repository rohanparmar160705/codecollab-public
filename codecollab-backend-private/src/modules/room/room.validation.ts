// src/modules/room/room.validation.ts
import Joi from "joi";

export const createRoomSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  language: Joi.string().default("javascript"),
  description: Joi.string().allow("", null),
});

export const joinRoomSchema = Joi.object({
  roomId: Joi.string().required(),
  userId: Joi.string().required(),
  inviteCode: Joi.string().allow('', null),
});

export const setVisibilitySchema = Joi.object({
  isPublic: Joi.boolean().required(),
});
