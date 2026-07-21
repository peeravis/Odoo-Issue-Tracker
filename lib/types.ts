export type { IssuePriority, IssueStatus, FieldType } from "@/app/generated/prisma/enums";

/** User that can be assigned to issues (extraRoles: vendor | aspd). */
export type AssigneeUser = {
  id: string;
  name: string;
  extraRoles: string[];
};

/** Minimal user shape used in dropdowns and filter lists. */
export type UserOption = {
  id: string;
  name: string;
  extraRoles?: string[];
};
