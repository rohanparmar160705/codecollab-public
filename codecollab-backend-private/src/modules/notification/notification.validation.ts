import { z } from "zod";

export const CreateNotificationSchema = z.object({
  userId: z.string(),
  type: z.string(),
  message: z.string(),
  refType: z.string().optional(),
  refId: z.string().optional(),
});
