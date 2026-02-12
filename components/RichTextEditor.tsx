
import React, { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && editorRef.current && !quillRef.current) {
      // @ts-ignore
      const Quill = (window as any).Quill;
      if (Quill) {
        quillRef.current = new Quill(editorRef.current, {
          theme: 'snow',
          placeholder: 'Tell your story...',
          modules: {
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              ['blockquote', 'code-block'],
              [{ 'list': 'ordered' }, { 'list': 'bullet' }],
              [{ 'color': [] }, { 'background': [] }],
              ['link', 'image', 'video'],
              ['clean']
            ],
          },
        });

        quillRef.current.on('text-change', () => {
          const html = quillRef.current.root.innerHTML;
          onChange(html);
        });
      }
    }
  }, []); // Only init once

  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      quillRef.current.root.innerHTML = value;
    }
  }, [value]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      <div ref={editorRef} className="flex-1 overflow-auto" style={{ minHeight: '300px' }} />
    </div>
  );
};

export default RichTextEditor;
