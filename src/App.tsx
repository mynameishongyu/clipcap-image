import { useEffect, useState } from 'react';
import { DiagramCard } from './components/DiagramCard';
import { EXAMPLE_SOURCE, MODEL_OUTPUT_PROMPT } from './lib/example';
import { buildSvgMarkup, downloadDiagramPng, downloadManyPng } from './lib/export';
import { buildDiagramLayout } from './lib/layout';
import {
  SchemaValidationError,
  formatSchemaIssue,
  parseDiagrams,
} from './lib/schema';

interface GeneratedDiagram {
  id: string;
  name: string;
  svgMarkup: string;
  width: number;
  height: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return '发生了未知错误';
}

function formatJsonSource(value: string): string {
  if (value.trim().length === 0) {
    return '';
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function App() {
  const [source, setSource] = useState(EXAMPLE_SOURCE);
  const [generatedDiagrams, setGeneratedDiagrams] = useState<GeneratedDiagram[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copyPromptFeedback, setCopyPromptFeedback] = useState<string | null>(null);

  const hasSelection = selectedIds.length > 0;
  const hasGenerated = generatedDiagrams.length > 0;
  const allSelected = hasGenerated && selectedIds.length === generatedDiagrams.length;

  useEffect(() => {
    const formatted = formatJsonSource(source);
    if (formatted === source) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSource((current) => {
        const nextFormatted = formatJsonSource(current);
        return nextFormatted === current ? current : nextFormatted;
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [source]);

  function handleSourceChange(nextSource: string): void {
    setSource(nextSource);
    setCopyPromptFeedback(null);
  }

  function handleFormatSource(): string {
    const formatted = formatJsonSource(source);
    if (formatted !== source) {
      setSource(formatted);
    }

    return formatted;
  }

  function handleGenerate(): void {
    try {
      const diagrams = parseDiagrams(handleFormatSource());
      const nextGenerated = diagrams.map((diagram, index) => {
        const layout = buildDiagramLayout(diagram);
        return {
          id: `diagram-${index}`,
          name: diagram.name,
          svgMarkup: buildSvgMarkup(layout),
          width: layout.width,
          height: layout.height,
        };
      });

      setGeneratedDiagrams(nextGenerated);
      setSelectedIds([]);
      setIssues([]);
      setDownloadError(null);
    } catch (error) {
      setGeneratedDiagrams([]);
      setSelectedIds([]);
      setDownloadError(null);
      if (error instanceof SchemaValidationError) {
        setIssues(error.issues.map(formatSchemaIssue));
        return;
      }

      setIssues([`生成失败: ${getErrorMessage(error)}`]);
    }
  }

  function handleFillExample(): void {
    setSource(EXAMPLE_SOURCE);
    setIssues([]);
    setDownloadError(null);
    setCopyPromptFeedback(null);
  }

  function handleClear(): void {
    setSource('');
    setGeneratedDiagrams([]);
    setSelectedIds([]);
    setIssues([]);
    setDownloadError(null);
    setCopyPromptFeedback(null);
  }

  function handleToggleSelection(id: string): void {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
  }

  async function handleDownloadSingle(diagram: GeneratedDiagram): Promise<void> {
    setDownloadError(null);

    try {
      await downloadDiagramPng({
        filename: diagram.name,
        svgMarkup: diagram.svgMarkup,
      });
    } catch (error) {
      setDownloadError(`单张下载失败: ${getErrorMessage(error)}`);
    }
  }

  async function handleDownloadSelected(): Promise<void> {
    const diagramsToDownload = generatedDiagrams
      .filter((diagram) => selectedIds.includes(diagram.id))
      .map((diagram) => ({
        filename: diagram.name,
        svgMarkup: diagram.svgMarkup,
      }));

    if (diagramsToDownload.length === 0) {
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      await downloadManyPng(diagramsToDownload);
    } catch (error) {
      setDownloadError(`批量下载失败: ${getErrorMessage(error)}`);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDownloadAll(): Promise<void> {
    if (generatedDiagrams.length === 0) {
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      await downloadManyPng(
        generatedDiagrams.map((diagram) => ({
          filename: diagram.name,
          svgMarkup: diagram.svgMarkup,
        })),
      );
    } catch (error) {
      setDownloadError(`批量下载失败: ${getErrorMessage(error)}`);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleCopyPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(MODEL_OUTPUT_PROMPT);
      setCopyPromptFeedback('提示词要求已复制到剪贴板');
    } catch (error) {
      setCopyPromptFeedback(`复制失败: ${getErrorMessage(error)}`);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__eyebrow">Architecture Diagram Generator</div>
        <h1>批量架构图生成器</h1>
        <p>
          直接粘贴符合约定的 JSON 数组，批量生成预览图，并按需单张下载、勾选下载或全部下载。
        </p>
      </header>

      <main className="workspace">
        <section className="panel panel--editor">
          <div className="panel__header">
            <div>
              <h2>JSON 输入</h2>
              <p>输入顶层为 `Diagram[]` 的 JSON，生成后会保留固定配色和层级布局。</p>
            </div>

            <div className="button-row">
              <button className="button button--secondary" onClick={handleFillExample} type="button">
                示例填充
              </button>
              <button className="button button--secondary" onClick={() => void handleCopyPrompt()} type="button">
                复制提示词要求
              </button>
              <button className="button button--primary" onClick={handleGenerate} type="button">
                生成预览
              </button>
              <button className="button button--ghost" onClick={handleClear} type="button">
                清空
              </button>
            </div>
          </div>

          <label className="editor">
            <span className="sr-only">JSON 输入</span>
            <textarea
              aria-label="JSON 输入"
              className="editor__textarea"
              onBlur={handleFormatSource}
              onChange={(event) => handleSourceChange(event.target.value)}
              spellCheck={false}
              value={source}
            />
          </label>

          {copyPromptFeedback ? (
            <div
              aria-live="polite"
              className={`message ${
                copyPromptFeedback.startsWith('复制失败') ? 'message--error' : 'message--success'
              }`}
              role="status"
            >
              {copyPromptFeedback}
            </div>
          ) : null}

          {issues.length > 0 ? (
            <div className="message message--error" role="alert">
              <strong>输入校验失败</strong>
              <ul>
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="message message--hint">
              `name` 会直接用于预览标题和下载文件名；输入合法 JSON 后会自动格式化；子集结构只支持两层嵌套。
            </div>
          )}
        </section>

        <section className="panel panel--preview">
          <div className="panel__header panel__header--stacked">
            <div>
              <h2>预览与下载</h2>
              <p>{hasGenerated ? `已生成 ${generatedDiagrams.length} 张架构图` : '尚未生成预览'}</p>
            </div>

            <div className="toolbar">
              <button
                className="button button--secondary"
                disabled={!hasGenerated || isDownloading}
                onClick={() => setSelectedIds(generatedDiagrams.map((diagram) => diagram.id))}
                type="button"
              >
                全选
              </button>
              <button
                className="button button--secondary"
                disabled={!hasSelection || isDownloading}
                onClick={() => setSelectedIds([])}
                type="button"
              >
                取消全选
              </button>
              <button
                className="button button--primary"
                disabled={!hasSelection || isDownloading}
                onClick={() => void handleDownloadSelected()}
                type="button"
              >
                {isDownloading && hasSelection ? '下载中...' : '下载已选'}
              </button>
              <button
                className="button button--primary"
                disabled={!hasGenerated || isDownloading}
                onClick={() => void handleDownloadAll()}
                type="button"
              >
                {isDownloading && !hasSelection ? '下载中...' : '下载全部'}
              </button>
            </div>
          </div>

          <div className="selection-summary">
            <span>已选 {selectedIds.length} 张</span>
            <span>{allSelected ? '当前已全选' : '可单独勾选需要导出的图片'}</span>
          </div>

          {downloadError ? (
            <div className="message message--error" role="alert">
              {downloadError}
            </div>
          ) : null}

          {hasGenerated ? (
            <div className="preview-grid">
              {generatedDiagrams.map((diagram) => (
                <DiagramCard
                  key={diagram.id}
                  disabled={isDownloading}
                  onDownload={() => void handleDownloadSingle(diagram)}
                  onToggle={() => handleToggleSelection(diagram.id)}
                  selected={selectedIds.includes(diagram.id)}
                  sizeLabel={`${diagram.width} × ${diagram.height} px`}
                  svgMarkup={diagram.svgMarkup}
                  title={diagram.name}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>等待生成</h3>
              <p>点击“生成预览”后，这里会出现批量预览卡片和下载操作。</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
