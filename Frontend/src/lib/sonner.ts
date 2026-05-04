import { toast as baseToast } from "@/hooks/use-toast";

type ToastOptions = {
  description?: string;
};

const show = (message: string, options?: ToastOptions) => {
  baseToast({
    title: message,
    description: options?.description,
  });
};

const toast = Object.assign(
  (message: string, options?: ToastOptions) => show(message, options),
  {
    success: (message: string, options?: ToastOptions) => show(message, options),
    info: (message: string, options?: ToastOptions) => show(message, options),
    warning: (message: string, options?: ToastOptions) => show(message, options),
    error: (message: string, options?: ToastOptions) =>
      baseToast({
        title: message,
        description: options?.description,
        variant: "destructive",
      }),
  },
);

export { toast };
