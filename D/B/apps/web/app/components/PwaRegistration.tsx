"use client";

import { useEffect, useState } from "react";

export function PwaRegistration() {
  const [swRegistered, setSwRegistered] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) {
            console.log('Service Worker registration successful with scope: ', registration.scope);
            setSwRegistered(true);
          },
          function(err) {
            console.log('Service Worker registration failed: ', err);
          }
        );
      });
    }
  }, []);

  return null;
}
