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
import { Iframe } from '../utils/tiptapExtensions';
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
  const [loomDialogOpen, setLoomDialogOpen] = useState(false);
  const [loomUrl, setLoomUrl] = useState("");
  const [articleLinkDialogOpen, setArticleLinkDialogOpen] = useState(false);
  const [articleSearch, setArticleSearch] = useState("");
  const [articles, setArticles] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<typeof articles>([]);
  const [selectedArticle, setSelectedArticle] = useState<{ id: string; title: string; slug: string } | null>(null);


  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      LinkExtension,
      Underline,
      Highlight,
      Code,
      Blockquote,
      Iframe,
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

  useEffect(() => {
    if (articleLinkDialogOpen && articles.length === 0) {
      supabase
        .from("articles")
        .select("id, title, slug")
        .then(({ data }) => {
          if (data) setArticles(data);
        });
    }
  }, [articleLinkDialogOpen, articles.length]);

  useEffect(() => {
    if (articleSearch.trim() === "") {
      setFilteredArticles(articles);
    } else {
      setFilteredArticles(
        articles.filter(a =>
          a.title.toLowerCase().includes(articleSearch.toLowerCase()) ||
          a.slug.toLowerCase().includes(articleSearch.toLowerCase())
        )
      );
    }
  }, [articleSearch, articles]);

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

  const handleLoomEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    if (loomUrl && editor) {
      editor.chain().focus().insertContent({
        type: 'iframe',
        attrs: { src: loomUrl, width: 640, height: 360, frameborder: 0, allowfullscreen: true },
      }).run();
      setLoomDialogOpen(false);
      setLoomUrl("");
    }
  };

  return (
    <div className="article-editor-responsive">
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
              className="w-full px-3 py-2 border rounded mb-2 text-base"
              required
              inputMode="text"
              style={{ fontSize: '16px' }}
            />
            <label className="block text-sm font-medium mb-1" htmlFor="link-text">Link Text</label>
            <input
              id="link-text"
              type="text"
              placeholder="Link text"
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-4 text-base"
              required
              inputMode="text"
              style={{ fontSize: '16px' }}
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
      
      {/* Loom Embed Dialog */}
      <Dialog open={loomDialogOpen} onOpenChange={open => {
        setLoomDialogOpen(open);
        if (!open) setLoomUrl("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Loom Video</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLoomEmbed}>
            <label className="block text-sm font-medium mb-1" htmlFor="loom-url">Loom Video URL</label>
            <input
              id="loom-url"
              type="url"
              placeholder="https://www.loom.com/share/..."
              value={loomUrl}
              onChange={e => setLoomUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-4 text-base"
              required
              inputMode="text"
              style={{ fontSize: '16px' }}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={!loomUrl}>Embed</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Article Link Dialog */}
      <Dialog open={articleLinkDialogOpen} onOpenChange={setArticleLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link to Article</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            placeholder="Search articles..."
            value={articleSearch}
            onChange={e => setArticleSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded mb-2 text-base"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto border rounded mb-4">
            {filteredArticles.length === 0 ? (
              <div className="p-2 text-muted-foreground">No articles found.</div>
            ) : (
              filteredArticles.map(article => (
                <div
                  key={article.id}
                  className={`p-2 cursor-pointer hover:bg-accent ${selectedArticle?.id === article.id ? 'bg-accent' : ''}`}
                  onClick={() => setSelectedArticle(article)}
                >
                  <div className="font-medium">{article.title}</div>
                  <div className="text-xs text-muted-foreground">/article/{article.slug}</div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!selectedArticle}
              onClick={() => {
                if (selectedArticle && editor) {
                  const url = `/article/${selectedArticle.slug}`;
                  const text = selectedArticle.title;
                  editor.chain().focus().insertContent(text).setTextSelection({ from: editor.state.selection.from, to: editor.state.selection.from + text.length }).setLink({ href: url }).run();
                  setArticleLinkDialogOpen(false);
                  setSelectedArticle(null);
                  setArticleSearch("");
                }
              }}
            >
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLoomDialogOpen(true)}
            disabled={!editor}
            aria-label="Embed Loom Video"
          >
            🎥 Loom
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setArticleLinkDialogOpen(true)}
            disabled={!editor}
            aria-label="Link to Article"
          >
            📎 Article Link
          </Button>
        </div>
        
        {/* Editor content */}
        <div className="p-2">
          <EditorContent editor={editor} className="tiptap" onMouseDown={handleEditorClick} />
        </div>
      </div>
    </div>
  );
} 