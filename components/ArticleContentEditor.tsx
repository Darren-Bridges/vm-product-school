"use client";

import { useState, useRef, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Code from "@tiptap/extension-code";
import Blockquote from "@tiptap/extension-blockquote";
// Remove Youtube, Video, Iframe imports and extensions


import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { supabase } from "../lib/supabaseClient";

interface ArticleContentEditorProps {
  value?: string;
  onChange?: (content: string) => void;
}

export function ArticleContentEditor({ value, onChange }: ArticleContentEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [editingLink, setEditingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Remove Loom dialog state
  // const [loomDialogOpen, setLoomDialogOpen] = useState(false);
  // const [loomUrl, setLoomUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      LinkExtension,
      Underline,
      Highlight,
      Code,
      Blockquote,
      // Remove Youtube, Video, Iframe extensions
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const { error } = await supabase.storage.from("article-images").upload(fileName, file);
    if (error) {
      // Optionally, show error to user
      return;
    }
    const url = supabase.storage.from("article-images").getPublicUrl(fileName).data.publicUrl;
    editor?.chain().focus().setImage({ src: url }).run();
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Remove Loom upload and embed functions
  // const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;
  //   const fileExt = file.name.split('.').pop();
  //   const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  //   const { error } = await supabase.storage.from("article-images").upload(fileName, file);
  //   if (error) {
  //     // Optionally, show error to user
  //     return;
  //   }
  //   const url = supabase.storage.from("article-images").getPublicUrl(fileName).data.publicUrl;
  //   editor?.chain().focus().setNode('video', { src: url, controls: true }).run();
  // };

  // const handleVideoButtonClick = () => {
  //   videoInputRef.current?.click();
  // };

  const handleEditorClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === "A") {
      event.preventDefault();
      setLinkUrl(target.getAttribute("href") || "");
      setLinkText(target.textContent || "");
      setEditingLink(true);
      setLinkDialogOpen(true);
    }
  };

  // When opening the dialog for a new link, prefill linkText with the current selection
  useEffect(() => {
    if (linkDialogOpen && !editingLink && editor) {
      setLinkText(editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        " "
      ));
    }
    if (!linkDialogOpen) {
      setLinkText("");
    }
  }, [linkDialogOpen, editingLink, editor]);

  return (
    <div>
      {/* Link Dialog outside the main form */}
      <Dialog open={linkDialogOpen} onOpenChange={open => {
        setLinkDialogOpen(open);
        if (!open) {
          setEditingLink(false);
          setLinkUrl("");
          setLinkText("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Link" : "Insert Link"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            if (linkUrl) {
              if (linkText && editor) {
                // Replace selection with new text if changed
                const { from, to } = editor.state.selection;
                if (linkText !== editor.state.doc.textBetween(from, to, " ")) {
                  editor.chain().focus().insertContent(linkText).setTextSelection({ from, to: from + linkText.length }).run();
                }
                editor.chain().focus().setLink({ href: linkUrl }).run();
              }
            }
            setLinkDialogOpen(false);
            setEditingLink(false);
            setLinkUrl("");
            setLinkText("");
          }}>
            <label className="block text-sm font-medium mb-1" htmlFor="link-url">Link URL</label>
            <input
              id="link-url"
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-2"
              required
            />
            <label className="block text-sm font-medium mb-1" htmlFor="link-text">Link Text</label>
            <input
              id="link-text"
              type="text"
              placeholder="Link text"
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-4"
              required
            />
            <DialogFooter>
              {editingLink && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    editor?.chain().focus().unsetLink().run();
                    setLinkDialogOpen(false);
                    setEditingLink(false);
                    setLinkUrl("");
                    setLinkText("");
                  }}
                >
                  Remove Link
                </Button>
              )}
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={!linkUrl || !linkText}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Remove Loom Embed Dialog */}

      <div className="border rounded min-h-[120px] bg-white dark:bg-card">
        {/* Toolbar at the top */}
        <div className="border-b p-2 flex gap-1 flex-wrap">
          <Button
            type="button"
            variant={editor?.isActive('bold') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor}
            aria-label="Bold"
          >
            <b>B</b>
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('italic') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor}
            aria-label="Italic"
          >
            <i>I</i>
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('strike') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            disabled={!editor}
            aria-label="Strike"
          >
            <s>S</s>
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('underline') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            disabled={!editor}
            aria-label="Underline"
          >
            <u>U</u>
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('highlight') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              const isActive = editor?.isActive('highlight');
              if (isActive) {
                editor?.chain().focus().unsetHighlight().run();
              } else {
                editor?.chain().focus().setHighlight().run();
              }
            }}
            disabled={!editor}
            aria-label="Highlight"
          >
            <span style={{ background: 'yellow', padding: '0 2px' }}>H</span>
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('code') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => editor?.chain().focus().toggleCode().run()}
            disabled={!editor}
            aria-label="Inline Code"
          >
            {'<>'}
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('link') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setLinkDialogOpen(true)}
            disabled={!editor}
            aria-label="Link"
          >
            🔗
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('bulletList') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor}
            aria-label="Bullet List"
          >
            • List
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('orderedList') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor}
            aria-label="Ordered List"
          >
            1. List
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('blockquote') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={!editor}
            aria-label="Quote"
          >
            ❝
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleImageButtonClick}
            disabled={!editor}
            aria-label="Insert Image"
          >
            🖼️ Image
          </Button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
          {/* Remove Loom button */}
        </div>
        
        {/* Editor content */}
        <div className="p-2">
          <EditorContent editor={editor} className="tiptap" onMouseDown={handleEditorClick} />
        </div>
      </div>
    </div>
  );
} 