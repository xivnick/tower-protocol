export type ToastTone = "common" | "uncommon" | "rare" | "epic" | "system" | "error";

export type ToastAction =
  | {
      label: string;
      href: string;
      onClick?: never;
    }
  | {
      label: string;
      onClick: () => void;
      href?: never;
    };

export type ToastInput = {
  message: string;
  tone?: ToastTone;
  duration?: number;
  action?: ToastAction;
};
