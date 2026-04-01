import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import type { AnyExtension } from "@tiptap/core";

export type AnalysisTiptapOptions = {
  placeholder?: string;
  /** In der Leseansicht Links per Klick öffnen */
  linkOpenOnClick?: boolean;
  includePlaceholder?: boolean;
};

export function analysisArticleExtensions(opts: AnalysisTiptapOptions = {}): AnyExtension[] {
  const base: AnyExtension[] = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
    }),
    Underline,
    Link.configure({
      openOnClick: opts.linkOpenOnClick ?? false,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank", class: "article-body-link" },
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Image.configure({
      HTMLAttributes: { class: "article-inline-img" },
    }),
    TableKit.configure({
      table: { resizable: true },
    }),
  ];

  if (opts.includePlaceholder && opts.placeholder) {
    base.push(
      Placeholder.configure({
        placeholder: opts.placeholder,
      }),
    );
  }

  return base;
}

export const emptyArticleDocJson = '{"type":"doc","content":[{"type":"paragraph"}]}';
