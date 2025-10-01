import React from "react";

export const Toaster: React.FC = () => {
  return <div id="toast-container" aria-live="polite" className="fixed z-50 top-4 right-4"></div>;
};
