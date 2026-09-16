"use client";

import { Box, Button, HStack, IconButton, Text } from "@chakra-ui/react";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Clock3, Heading2, Italic, List, ListOrdered } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ModuleNotesProps = {
  moduleId: string;
  initialContent: string;
  /** Aktuelle Wiedergabeposition (Sekunden) — aktiviert den Zeitstempel-Button. */
  getTimestamp?: () => number;
};

const SAVE_DEBOUNCE_MS = 1500;

function formatStamp(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ModuleNotes({ moduleId, initialContent, getTimestamp }: ModuleNotesProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(initialContent);
  const htmlRef = useRef<string>(initialContent);
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    htmlRef.current = initialContent;
    lastSavedRef.current = initialContent;
  }, [moduleId, initialContent]);

  // Nur die Notizen rendern sekündlich neu, nicht das ganze Modul-Layout.
  useEffect(() => {
    if (!getTimestamp) return;
    const id = window.setInterval(() => setStamp(Math.floor(getTimestamp())), 1000);
    return () => window.clearInterval(id);
  }, [getTimestamp]);

  const save = useCallback(async (html: string) => {
    if (html === lastSavedRef.current) return;
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, content: html }),
      });
      const json = (await res.json()) as { ok?: boolean };
      if (json.ok) lastSavedRef.current = html;
    } catch {
      /* ignore */
    }
  }, [moduleId]);

  const scheduleSave = useCallback(
    (html: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void save(html);
      }, SAVE_DEBOUNCE_MS);
    },
    [save],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        Placeholder.configure({
          placeholder: "Schreibe deine Gedanken hier…",
        }),
      ],
      content: initialContent || "",
      editorProps: {
        attributes: {
          class: "module-notes-editor",
        },
      },
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML();
        htmlRef.current = html;
        scheduleSave(html);
      },
    },
    [moduleId],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void save(htmlRef.current);
    };
  }, [save]);

  const toolButton = (label: string, icon: React.ReactElement, active: boolean, onClick: () => void) => (
    <IconButton
      aria-label={label}
      icon={icon}
      size="sm"
      variant="ghost"
      onClick={onClick}
      color={active ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
      bg={active ? "rgba(212, 176, 128, 0.12)" : "transparent"}
      _hover={{ bg: "rgba(255, 255, 255, 0.06)", color: "var(--cc-text)" }}
    />
  );

  return (
    <Box>
      <HStack justify="space-between" align="flex-start" gap={3} mb={3} flexWrap="wrap">
        <Box>
          <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
            Neue Notiz erstellen
          </Text>
          <Text fontSize="12px" color="var(--cc-text-3)" mt={0.5}>
            Wird automatisch gespeichert.
          </Text>
        </Box>
        {getTimestamp && editor ? (
          <Button
            size="xs"
            variant="line"
            leftIcon={<Clock3 size={13} strokeWidth={2} />}
            color="var(--cc-gold-light)"
            borderColor="var(--cc-gold-line)"
            className="cc-num"
            onClick={() => editor.chain().focus().insertContent(`[${formatStamp(stamp)}] `).run()}
            title="Aktuelle Videoposition in die Notiz einfügen"
          >
            Zeitstempel: {formatStamp(stamp)}
          </Button>
        ) : null}
      </HStack>
      {editor ? (
        <Box
          borderRadius="12px"
          border="1px solid var(--cc-line-strong)"
          bg="rgba(255, 255, 255, 0.03)"
          overflow="hidden"
          transition="border-color 150ms var(--cc-ease), box-shadow 150ms var(--cc-ease)"
          _focusWithin={{ borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" }}
        >
          <HStack flexWrap="wrap" gap={1} px={2} py={1.5} borderBottom="1px solid var(--cc-line)">
            {toolButton("Fett", <Bold size={16} />, editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
            {toolButton("Kursiv", <Italic size={16} />, editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
            {toolButton("Überschrift", <Heading2 size={16} />, editor.isActive("heading", { level: 2 }), () =>
              editor.chain().focus().toggleHeading({ level: 2 }).run(),
            )}
            {toolButton("Liste", <List size={16} />, editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
            {toolButton("Nummerierung", <ListOrdered size={16} />, editor.isActive("orderedList"), () =>
              editor.chain().focus().toggleOrderedList().run(),
            )}
          </HStack>
          <Box px={4} py={3} fontSize="14px" color="var(--cc-text)">
            <EditorContent editor={editor} />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
