"use client";

import { Toaster } from "react-hot-toast";

export { toast } from "react-hot-toast";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          borderRadius: "8px",
        },
      }}
    />
  );
}
