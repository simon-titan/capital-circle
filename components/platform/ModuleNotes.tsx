"use client";

import { Box, Button, ButtonGroup, HStack, Text } from "@chakra-ui/react";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, List, ListOrdered } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

type ModuleNotesProps = {
  moduleId: string;
  initialContent: string;
};

const SAVE_DEBOUNCE_MS = 1500;

export function ModuleNotes({ moduleId, initialContent }: ModuleNotesProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(initialContent);
  const htmlRef = useRef<string>(initialContent);

  useEffect(() => {
    htmlRef.current = initialContent;
    lastSavedRef.current = initialContent;
  }, [moduleId, initialContent]);

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
          placeholder: "Deine Notizen zu diesem Modul…",
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

  return (
    <Box mt={8}>
      <Text className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="var(--color-text-muted)" mb={2}>
        Meine Notizen
      </Text>
      <Text className="inter" fontSize="xs" color="var(--color-text-muted)" mb={3}>
        Wird automatisch gespeichert.
      </Text>
      {editor ? (
        <Box
          borderRadius="16px"
          borderWidth="1px"
          borderColor="rgba(255,255,255,0.1)"
          bg="rgba(0,0,0,0.25)"
          overflow="hidden"
        >
          <HStack
            flexWrap="wrap"
            gap={1}
            px={2}
            py={2}
            borderBottomWidth="1px"
            borderColor="rgba(255,255,255,0.08)"
            bg="rgba(255,255,255,0.03)"
          >
            <ButtonGroup size="sm" variant="ghost" spacing={0}>
              <Button
                aria-label="Fett"
                onClick={() => editor.chain().focus().toggleBold().run()}
                variant={editor.isActive("bold") ? "solid" : "ghost"}
                colorScheme="yellow"
              >
                <Bold size={16} />
              </Button>
              <Button
                aria-label="Kursiv"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                variant={editor.isActive("italic") ? "solid" : "ghost"}
                colorScheme="yellow"
              >
                <Italic size={16} />
              </Button>
              <Button
                aria-label="Überschrift"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                variant={editor.isActive("heading", { level: 2 }) ? "solid" : "ghost"}
                colorScheme="yellow"
              >
                <Heading2 size={16} />
              </Button>
              <Button
                aria-label="Liste"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                variant={editor.isActive("bulletList") ? "solid" : "ghost"}
                colorScheme="yellow"
              >
                <List size={16} />
              </Button>
              <Button
                aria-label="Nummerierung"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                variant={editor.isActive("orderedList") ? "solid" : "ghost"}
                colorScheme="yellow"
              >
                <ListOrdered size={16} />
              </Button>
            </ButtonGroup>
          </HStack>
          <Box px={3} py={3} className="inter" fontSize="sm" color="var(--color-text-primary)">
            <EditorContent editor={editor} />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
