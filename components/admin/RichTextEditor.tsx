"use client";

import { Box, ButtonGroup, IconButton, Tooltip } from "@chakra-ui/react";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Table2,
  Underline,
  Undo2,
} from "lucide-react";
import { useCallback, type ReactElement } from "react";
import { uploadSmallFilePresigned } from "@/lib/admin-upload-presigned";
import { analysisArticleExtensions, emptyArticleDocJson } from "@/lib/analysis-tiptap-extensions";

type RichTextEditorProps = {
  value: string;
  onChange: (json: string) => void;
};

async function uploadCoverAndGetSrc(file: File): Promise<string> {
  const storageKey = await uploadSmallFilePresigned(file, { folder: "covers" });
  return `/api/cover-url?key=${encodeURIComponent(storageKey)}`;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const initialContent = (() => {
    try {
      const t = value?.trim();
      if (!t) return JSON.parse(emptyArticleDocJson);
      const j = JSON.parse(value) as { type?: string };
      if (j?.type === "doc") return j;
    } catch {
      /* noop */
    }
    return JSON.parse(emptyArticleDocJson);
  })();

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: analysisArticleExtensions({
        placeholder: "Artikeltext… Überschriften, Listen, Tabellen, Bilder.",
        includePlaceholder: true,
        linkOpenOnClick: false,
      }),
      content: initialContent,
      editorProps: {
        attributes: {
          class: "article-body",
        },
        /**
         * Bild in den Text ziehen: Datei hochladen und an der Stelle einfügen,
         * an der losgelassen wurde. Ohne das würde ProseMirror die Datei
         * verwerfen (`allowBase64` ist aus) und der Browser sie im Tab öffnen.
         *
         * Das ist zugleich der Weg am Windows-Dateidialog vorbei, der auf dem
         * Rechner des Nutzers den ganzen Browser einfriert.
         */
        handleDrop: (view, event) => {
          const dateien = Array.from((event as DragEvent).dataTransfer?.files ?? []);
          const bild = dateien.find((f) => f.type.startsWith("image/"));
          if (!bild) return false;

          event.preventDefault();
          const pos = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY })?.pos;

          void (async () => {
            try {
              const src = await uploadCoverAndGetSrc(bild);
              const chain = view.state.tr;
              const node = view.state.schema.nodes.image?.create({ src });
              if (!node) return;
              view.dispatch(chain.insert(pos ?? view.state.selection.from, node));
            } catch (e) {
              console.error("[editor] Bild-Upload fehlgeschlagen:", e);
            }
          })();

          // true = wir haben den Drop übernommen, ProseMirror soll nichts tun.
          return true;
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange(JSON.stringify(ed.getJSON()));
      },
    },
    [],
  );

  const pickImage = useCallback(() => {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const src = await uploadCoverAndGetSrc(file);
        editor.chain().focus().setImage({ src }).run();
      } catch (e) {
        console.error(e);
      }
    };
    input.click();
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link") as { href?: string };
    const href = window.prompt("Link-URL", prev.href ?? "https://");
    if (href === null) return;
    if (href === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const tb = (label: string, onClick: () => void, icon: ReactElement, active?: boolean) => (
    <Tooltip label={label} hasArrow openDelay={400} bg="var(--cc-surface-2)" color="var(--cc-text)">
      <IconButton
        aria-label={label}
        aria-pressed={active}
        size="xs"
        variant="ghost"
        icon={icon}
        onClick={onClick}
        color={active ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
        bg={active ? "rgba(212, 176, 128, 0.12)" : "transparent"}
        _hover={{ bg: "rgba(255, 255, 255, 0.06)", color: "var(--cc-text)" }}
      />
    </Tooltip>
  );

  return (
    <Box
      borderRadius="12px"
      border="1px solid var(--cc-line-strong)"
      bg="rgba(255, 255, 255, 0.03)"
      overflow="hidden"
      transition="border-color 150ms var(--cc-ease), box-shadow 150ms var(--cc-ease)"
      _focusWithin={{ borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" }}
    >
      <ButtonGroup
        size="xs"
        variant="ghost"
        spacing={0}
        flexWrap="wrap"
        px={2}
        py={1.5}
        gap={1}
        borderBottom="1px solid var(--cc-line)"
      >
        {tb("Rückgängig", () => editor.chain().focus().undo().run(), <Undo2 size={16} />)}
        {tb("Wiederholen", () => editor.chain().focus().redo().run(), <Redo2 size={16} />)}
        {tb("Fett", () => editor.chain().focus().toggleBold().run(), <Bold size={16} />, editor.isActive("bold"))}
        {tb("Kursiv", () => editor.chain().focus().toggleItalic().run(), <Italic size={16} />, editor.isActive("italic"))}
        {tb("Unterstrichen", () => editor.chain().focus().toggleUnderline().run(), <Underline size={16} />, editor.isActive("underline"))}
        {tb("Überschrift 1", () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 size={16} />, editor.isActive("heading", { level: 1 }))}
        {tb("Überschrift 2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 size={16} />, editor.isActive("heading", { level: 2 }))}
        {tb("Überschrift 3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 size={16} />, editor.isActive("heading", { level: 3 }))}
        {tb("Liste", () => editor.chain().focus().toggleBulletList().run(), <List size={16} />, editor.isActive("bulletList"))}
        {tb("Nummerierung", () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={16} />, editor.isActive("orderedList"))}
        {tb("Zitat", () => editor.chain().focus().toggleBlockquote().run(), <Quote size={16} />, editor.isActive("blockquote"))}
        {tb("Code", () => editor.chain().focus().toggleCode().run(), <Code size={16} />, editor.isActive("code"))}
        {tb("Link", () => setLink(), <Link2 size={16} />, editor.isActive("link"))}
        {tb("Bild hochladen", () => void pickImage(), <ImageIcon size={16} />)}
        {tb("Tabelle", () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), <Table2 size={16} />)}
        {tb("Trennlinie", () => editor.chain().focus().setHorizontalRule().run(), <Minus size={16} />)}
        {tb("Links", () => editor.chain().focus().setTextAlign("left").run(), <AlignLeft size={16} />)}
        {tb("Zentriert", () => editor.chain().focus().setTextAlign("center").run(), <AlignCenter size={16} />)}
        {tb("Rechts", () => editor.chain().focus().setTextAlign("right").run(), <AlignRight size={16} />)}
        {tb("Blocksatz", () => editor.chain().focus().setTextAlign("justify").run(), <AlignJustify size={16} />)}
      </ButtonGroup>
      <Box className="analysis-rich-editor">
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
