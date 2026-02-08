import { z } from "zod";

export const PageSchema = z.enum(["dashboard", "settings", "applications", "help"]);

export type PageValidated = z.infer<typeof PageSchema>;
