"use client";

import { Box } from "@chakra-ui/react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { useEffect, useMemo } from "react";
import { analysisArticleExtensions, emptyArticleDocJson } from "@/lib/analysis-tiptap-extensions";

function parseTiptapDoc(raw: string): JSONContent | null {
  const t = raw?.trim() ?? "";
  if (!t) return JSON.parse(emptyArticleDocJson) as JSONContent;
  try {
    const j = JSON.parse(raw) as unknown;
    if (j && typeof j === "object" && (j as JSONContent).type === "doc") {
      return j as JSONContent;
    }
  } catch {
    return null;
  }
  return null;
}

function legacyPlainToDoc(text: string): JSONContent {
  if (!text.trim()) return JSON.parse(emptyArticleDocJson) as JSONContent;
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

type ArticleRendererProps = {
  content: string;
};

export function ArticleRenderer({ content }: ArticleRendererProps) {
  const doc = useMemo(() => {
    const parsed = parseTiptapDoc(content);
    if (parsed) return parsed;
    return legacyPlainToDoc(content);
  }, [content]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: false,
      extensions: analysisArticleExtensions({ linkOpenOnClick: true, includePlaceholder: false }),
      content: doc,
      editorProps: {
        attributes: {
          class: "article-body",
        },
      },
    },
    [],
  );

  useEffect(() => {
    if (!editor) return;
    const next = (() => {
      const parsed = parseTiptapDoc(content);
      if (parsed) return parsed;
      return legacyPlainToDoc(content);
    })();
    editor.commands.setContent(next);
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <Box className="article-body-wrap">
      <EditorContent editor={editor} />
    </Box>
  );
}
