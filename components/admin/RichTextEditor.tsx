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
import { analysisArticleExtensions, emptyArticleDocJson } from "@/lib/analysis-tiptap-extensions";

type RichTextEditorProps = {
  value: string;
  onChange: (json: string) => void;
};

async function uploadCoverAndGetSrc(file: File): Promise<string> {
  const params = new URLSearchParams({ folder: "covers" });
  const res = await fetch(`/api/admin/upload-proxy?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const json = (await res.json()) as { ok?: boolean; storageKey?: string; error?: string };
  if (!res.ok || !json.ok || !json.storageKey) {
    throw new Error(json.error || "Upload fehlgeschlagen.");
  }
  return `/api/cover-url?key=${encodeURIComponent(json.storageKey)}`;
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
    <Tooltip label={label} hasArrow openDelay={400}>
      <IconButton
        aria-label={label}
        size="xs"
        variant={active ? "solid" : "ghost"}
        colorScheme={active ? "yellow" : "gray"}
        icon={icon}
        onClick={onClick}
      />
    </Tooltip>
  );

  return (
    <Box borderRadius="12px" borderWidth="1px" borderColor="whiteAlpha.200" bg="rgba(7,8,10,0.65)" overflow="hidden">
      <ButtonGroup
        size="xs"
        variant="ghost"
        spacing={0}
        flexWrap="wrap"
        p={2}
        gap={1}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.150"
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
