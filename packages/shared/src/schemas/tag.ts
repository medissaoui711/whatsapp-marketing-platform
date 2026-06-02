import { z } from 'zod';

const tagColors = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'gray', 'teal', 'pink', 'indigo'] as const;

export const tagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
  color: z.enum(tagColors).optional(),
});

export const updateTagSchema = tagSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' },
);

export type TagInput = z.infer<typeof tagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

export interface TagResponse {
  name: string;
  color?: string | null;
  contactCount: number;
}


