"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import 'react-quill-new/dist/quill.snow.css';

// react-quill touches `document` during import in some environments, so disable SSR for it.
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const [editorValue, setEditorValue] = useState(value || "");

  useEffect(() => {
    setEditorValue(value || "");
  }, [value]);

  const handleChange = (content: string) => {
    setEditorValue(content);
    onChange(content);
  };

  // 🔧 Toolbar “full”
  const modules = {
    toolbar: [
      [{ font: [] }],                     // dropdown font
      [{ size: [] }],                     // dropdown size
      [{ header: [1, 2, 3, 4, 5, 6, false] }], // heading
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],      // màu chữ / nền
      [{ script: "sub" }, { script: "super" }], // x₂, x²
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ align: [] }],
      ["blockquote", "code-block"],
      ["link", "image", "video"],
      ["clean"],                           // clear format
    ],
  };

  const formats = [
    "font",
    "size",
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "script",
    "list",
    "bullet",
    "indent",
    "align",
    "blockquote",
    "code-block",
    "link",
    "image",
    "video",
  ];

  return (
    <div className="w-full">
      <ReactQuill
        value={editorValue}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        theme="snow"
        className="rich-text-editor"
      />
    </div>
  );
};

export default RichTextEditor;
