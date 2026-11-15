"use client";

import { Button } from "@chakra-ui/react";
import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

/** Abmelden von der Bewerbungs-Statusseite — nur dieser Browser (`scope: "local"`). */
export function AbmeldenKnopf({ children }: { children: ReactNode }) {
  const [laeuft, setLaeuft] = useState(false);
  return (
    <Button
      variant="line"
      size="sm"
      isLoading={laeuft}
      onClick={async () => {
        setLaeuft(true);
        try {
          await createClient().auth.signOut({ scope: "local" });
        } finally {
          window.location.assign("/training");
        }
      }}
    >
      {children}
    </Button>
  );
}
