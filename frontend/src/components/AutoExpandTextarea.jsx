import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const AutoExpandTextarea = forwardRef(({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  className,
  minHeight = 80,
  maxHeight = 300,
  ...props
}, ref) => {
  const textareaRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    blur: () => textareaRef.current?.blur(),
    get element() { return textareaRef.current; }
  }));

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value, minHeight, maxHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      rows={1}
      {...props}
    />
  );
});

AutoExpandTextarea.displayName = 'AutoExpandTextarea';

export default AutoExpandTextarea;
