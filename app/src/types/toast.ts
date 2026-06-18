export type ToastTone = "common" | "uncommon" | "rare" | "epic" | "system" | "error";

export type ToastInput = {
  message: string;
  tone?: ToastTone;
};
