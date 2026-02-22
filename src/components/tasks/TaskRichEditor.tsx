import React, { useMemo } from 'react';
// @ts-ignore
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
// @ts-ignore
import ImageResize from 'quill-image-resize-module-react';
import './TaskRichEditor.css';

// Register the Image Resize module
Quill.register('modules/imageResize', ImageResize);

interface TaskRichEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    readOnly?: boolean;
}

const TaskRichEditor: React.FC<TaskRichEditorProps> = ({ value, onChange, placeholder, readOnly = false }) => {
    const quillRef = React.useRef<any>(null);

    React.useEffect(() => {
        if (!readOnly && quillRef.current) {
            // Give it a tiny moment to mount/key-swap
            setTimeout(() => {
                quillRef.current?.focus();
            }, 100);
        }
    }, [readOnly]);

    const modules = useMemo(() => ({
        toolbar: readOnly ? false : [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'font': [] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'script': 'sub' }, { 'script': 'super' }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }, { 'align': [] }],
            ['link', 'image', 'video'],
            ['blockquote', 'code-block'],
            ['clean']
        ],
        imageResize: {
            parchment: Quill.import('parchment'),
            modules: ['Resize', 'DisplaySize']
        }
    }), [readOnly]);

    return (
        <div className={`task-rich-editor ${readOnly ? 'read-only' : ''}`}>
            <ReactQuill
                ref={quillRef}
                key={readOnly ? 'view' : 'edit'}
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                placeholder={placeholder || "Add mission details..."}
                readOnly={readOnly}
            />
        </div>
    );
};

export default TaskRichEditor;
