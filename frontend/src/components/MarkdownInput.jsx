import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import './MarkdownInput.css';

const MarkdownInput = forwardRef(({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  className,
  minHeight = 36,
  maxHeight = 300,
}, ref) => {
  const containerRef = useRef(null);
  const crepeRef = useRef(null);
  const isReadyRef = useRef(false);  // Track when editor is fully initialized
  const instanceSeqRef = useRef(0);
  const activeInstanceIdRef = useRef(0);
  const pendingMarkdownRef = useRef(null);
  const placeholderRef = useRef(placeholder || 'Type your message...');
  const disabledRef = useRef(disabled);
  const valueRef = useRef(value);
  const isInternalUpdate = useRef(false);

  // Store callbacks in refs to avoid effect re-runs when they change
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);

  // Keep refs in sync with latest props
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;
    disabledRef.current = disabled;
  });

  const safeGetMarkdown = useCallback((crepeOverride) => {
    const crepe = crepeOverride ?? crepeRef.current;
    if (!crepe || !isReadyRef.current || typeof crepe.getMarkdown !== 'function') return null;
    try {
      return crepe.getMarkdown() ?? '';
    } catch {
      return null;
    }
  }, []);

  const safeSetMarkdown = useCallback((md) => {
    const crepe = crepeRef.current;
    if (!crepe || !isReadyRef.current || typeof crepe.setMarkdown !== 'function') {
      pendingMarkdownRef.current = md;
      return false;
    }
    isInternalUpdate.current = true;
    try {
      crepe.setMarkdown(md);
      return true;
    } catch {
      pendingMarkdownRef.current = md;
      return false;
    } finally {
      isInternalUpdate.current = false;
    }
  }, []);

  const safeFocus = useCallback(() => {
    const crepe = crepeRef.current;
    if (!crepe || !isReadyRef.current || !crepe.editor) return;
    try {
      crepe.editor.commands.focus();
    } catch {
      // Editor may be in transitional state
    }
  }, []);

  const safeBlur = useCallback(() => {
    const crepe = crepeRef.current;
    if (!crepe || !isReadyRef.current || !crepe.editor) return;
    try {
      crepe.editor.commands.blur();
    } catch {
      // Editor may be in transitional state
    }
  }, []);

  const safeSetEditable = useCallback((editable) => {
    const crepe = crepeRef.current;
    if (!crepe || !isReadyRef.current || !crepe.editor) return;
    try {
      crepe.editor.setEditable(editable);
    } catch {
      // Editor may be in transitional state
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      safeFocus();
    },
    blur: () => {
      safeBlur();
    },
    getMarkdown: () => {
      return safeGetMarkdown() || '';
    },
    setMarkdown: (md) => {
      safeSetMarkdown(md);
    },
    clear: () => {
      safeSetMarkdown('');
    },
  }));

  // Initialize Milkdown Crepe editor - only runs once
  useEffect(() => {
    if (!containerRef.current || crepeRef.current) return;
    const root = containerRef.current;
    const localInstanceId = instanceSeqRef.current + 1;
    instanceSeqRef.current = localInstanceId;
    activeInstanceIdRef.current = localInstanceId;

    // Define inside effect so the reference is stable for add/remove
    const handleKeydown = (e) => {
      if (activeInstanceIdRef.current !== localInstanceId) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const content = safeGetMarkdown()?.trim();
        if (content == null) return;
        if (content && onSubmitRef.current) {
          onSubmitRef.current(content);
        }
      }
    };

    const crepe = new Crepe({
      root,
      defaultValue: valueRef.current || '',
      features: {
        [Crepe.Feature.ImageBlock]: false,
        [Crepe.Feature.CodeMirror]: false,
        [Crepe.Feature.BlockEdit]: false,
        [Crepe.Feature.Toolbar]: false,
        [Crepe.Feature.Cursor]: false,
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.LinkPreview]: false,
      },
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: placeholderRef.current,
          mode: 'doc',
        },
      },
    });

    // Set ref immediately to prevent StrictMode double-creation
    crepeRef.current = crepe;

    // Set up content change listener BEFORE create (per Milkdown docs)
    crepe.on((listener) => {
      listener.markdownUpdated(() => {
        // Guard against destroyed editor (React StrictMode cleanup)
        if (activeInstanceIdRef.current !== localInstanceId || !isReadyRef.current) return;
        const md = safeGetMarkdown(crepe);
        if (md == null) return;
        if (!isInternalUpdate.current && md !== valueRef.current) {
          onChangeRef.current?.({ target: { value: md } });
        }
      });
    });

    // Add keydown listener to container for Enter handling (capture phase)
    root.addEventListener('keydown', handleKeydown, true);

    crepe.create().then(() => {
      if (activeInstanceIdRef.current !== localInstanceId) return;
      isReadyRef.current = true;
      if (pendingMarkdownRef.current != null) {
        const pending = pendingMarkdownRef.current;
        pendingMarkdownRef.current = null;
        safeSetMarkdown(pending);
      }
      safeSetEditable(!disabledRef.current);
    }).catch(() => {
      // Ignore create errors during StrictMode teardown
    });

    return () => {
      // Remove listener from container
      root.removeEventListener('keydown', handleKeydown, true);

      if (activeInstanceIdRef.current === localInstanceId && crepeRef.current) {
        // Set flags BEFORE destroy to prevent callbacks from accessing destroyed editor
        isReadyRef.current = false;
        activeInstanceIdRef.current = 0;
        pendingMarkdownRef.current = null;
        const crepeToDestroy = crepeRef.current;
        crepeRef.current = null;

        crepeToDestroy.destroy();
      }
    };
  }, [safeGetMarkdown, safeSetMarkdown, safeSetEditable]);  // Initialize once; placeholder is frozen on mount

  // Sync external value changes (e.g., clearing after submit)
  useEffect(() => {
    const current = safeGetMarkdown();
    if (current == null) {
      pendingMarkdownRef.current = value || '';
      return;
    }
    if (value !== current) {
      safeSetMarkdown(value || '');
    }
  }, [value, safeGetMarkdown, safeSetMarkdown]);

  // Handle disabled state
  useEffect(() => {
    safeSetEditable(!disabled);
  }, [disabled, safeSetEditable]);

  return (
    <div
      ref={containerRef}
      className={`markdown-input-container ${className || ''} ${disabled ? 'disabled' : ''}`}
      style={{
        '--min-height': `${minHeight}px`,
        '--max-height': `${maxHeight}px`,
      }}
    />
  );
});

MarkdownInput.displayName = 'MarkdownInput';

export default MarkdownInput;
