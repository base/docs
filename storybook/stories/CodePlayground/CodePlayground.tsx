import React, { useState, useEffect } from 'react';

export interface CodePlaygroundProps {
  initialCode?: string;
  language?: 'javascript' | 'typescript' | 'solidity';
  editable?: boolean;
  showLineNumbers?: boolean;
  height?: string;
  onRun?: (code: string) => void;
}

export const CodePlayground: React.FC<CodePlaygroundProps> = ({
  initialCode = '// Write your code here\nconsole.log("Hello, Base!");',
  language = 'javascript',
  editable = true,
  showLineNumbers = true,
  height = '400px',
  onRun,
}) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async () => {
    setIsRunning(true);
    setOutput([]);

    try {
      // Capture console.log output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      };

      // Execute code
      if (language === 'javascript' || language === 'typescript') {
        // Use Function constructor for safe evaluation
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction(code);
        await fn();
      } else {
        logs.push('Solidity execution requires a testnet connection. Preview only.');
      }

      // Restore original console.log
      console.log = originalLog;

      setOutput(logs.length > 0 ? logs : ['Code executed successfully (no output)']);

      if (onRun) {
        onRun(code);
      }
    } catch (error: any) {
      setOutput([`Error: ${error.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const resetCode = () => {
    setCode(initialCode);
    setOutput([]);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setOutput(['Code copied to clipboard!']);
    setTimeout(() => setOutput([]), 2000);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.languageBadge}>
          {language}
        </div>
        <div style={styles.actions}>
          <button
            onClick={copyCode}
            style={styles.button}
            title="Copy code"
          >
            📋 Copy
          </button>
          <button
            onClick={resetCode}
            style={styles.button}
            title="Reset code"
          >
            ↺ Reset
          </button>
          <button
            onClick={runCode}
            disabled={isRunning}
            style={{
              ...styles.button,
              ...styles.runButton,
              ...(isRunning ? styles.disabledButton : {}),
            }}
          >
            {isRunning ? '⏳ Running...' : '▶ Run'}
          </button>
        </div>
      </div>

      <div style={styles.editorContainer}>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={!editable}
          style={{
            ...styles.editor,
            height,
            cursor: editable ? 'text' : 'default',
          }}
          spellCheck={false}
        />
      </div>

      {output.length > 0 && (
        <div style={styles.outputContainer}>
          <div style={styles.outputHeader}>Output:</div>
          <div style={styles.output}>
            {output.map((line, index) => (
              <div key={index} style={styles.outputLine}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    fontFamily: 'monospace',
  } as React.CSSProperties,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  } as React.CSSProperties,

  languageBadge: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#0000ff',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,

  button: {
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  runButton: {
    backgroundColor: '#0000ff',
    color: '#ffffff',
    border: 'none',
  } as React.CSSProperties,

  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,

  editorContainer: {
    position: 'relative' as const,
  } as React.CSSProperties,

  editor: {
    width: '100%',
    padding: '16px',
    fontSize: '14px',
    lineHeight: '1.6',
    fontFamily: '"Fira Code", "Courier New", monospace',
    border: 'none',
    outline: 'none',
    resize: 'vertical' as const,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  } as React.CSSProperties,

  outputContainer: {
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  } as React.CSSProperties,

  outputHeader: {
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  output: {
    padding: '12px 16px',
    fontSize: '13px',
    lineHeight: '1.6',
    fontFamily: '"Fira Code", "Courier New", monospace',
    backgroundColor: '#1f2937',
    color: '#f3f4f6',
    maxHeight: '200px',
    overflowY: 'auto' as const,
  } as React.CSSProperties,

  outputLine: {
    marginBottom: '4px',
  } as React.CSSProperties,
};

export default CodePlayground;
