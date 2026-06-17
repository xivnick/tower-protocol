import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../api/profileApi";
import type { Character } from "./character";

export type AuthMode = "signin" | "signup" | "reset-request" | "reset-update";
export type AuthStatus = "checking" | "config-error" | "signed-out" | "profile-required" | "signed-in";
export type MessageType = "info" | "error";

export type AuthState = {
  status: AuthStatus;
  mode: AuthMode;
  email: string;
  recoveryEmail: string;
  isSubmitting: boolean;
  session: Session | null;
  profile: Profile | null;
  character: Character | null;
  message: string;
  messageType: MessageType;
};
