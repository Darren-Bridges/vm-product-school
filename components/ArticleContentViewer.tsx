"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import Blockquote from "@tiptap/extension-blockquote";

interface ArticleContentViewerProps {
  content: string;
}

export function ArticleContentViewer({ content }: ArticleContentViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      LinkExtension,
      Underline,
      Highlight,
      Code,
      CodeBlock,
      Blockquote,
    ],
    content: content,
    editable: false, // Make it read-only
  });

  return (
    <div className="tiptap">
      <EditorContent editor={editor} />
    </div>
  );
} 