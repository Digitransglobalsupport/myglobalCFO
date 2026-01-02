import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-800 group-[.toaster]:text-white group-[.toaster]:border-slate-700 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-slate-300",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-slate-600 group-[.toast]:text-white",
          success: "group-[.toaster]:bg-green-800 group-[.toaster]:text-white group-[.toaster]:border-green-700",
          error: "group-[.toaster]:bg-red-800 group-[.toaster]:text-white group-[.toaster]:border-red-700",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
