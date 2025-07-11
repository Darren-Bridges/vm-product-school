import { Node, mergeAttributes } from '@tiptap/core';

export const Iframe = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100%' },
      height: { default: 360 },
      frameborder: { default: 0 },
      allowfullscreen: { default: true },
      allow: { default: 'fullscreen' },
      style: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'iframe',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(HTMLAttributes, {
      allowfullscreen: 'true',
      style: 'max-width: 100%; border: 0;',
    })];
  },
}); 