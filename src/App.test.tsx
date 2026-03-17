import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { MODEL_OUTPUT_PROMPT } from './lib/example';

const { downloadDiagramPngMock, downloadManyPngMock } = vi.hoisted(() => ({
  downloadDiagramPngMock: vi.fn().mockResolvedValue(undefined),
  downloadManyPngMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./lib/export', async () => {
  const actual = await vi.importActual<typeof import('./lib/export')>('./lib/export');
  return {
    ...actual,
    downloadDiagramPng: downloadDiagramPngMock,
    downloadManyPng: downloadManyPngMock,
  };
});

describe('App', () => {
  it('auto formats valid JSON input after a short delay', async () => {
    render(<App />);

    const textarea = screen.getByLabelText('JSON 输入');
    const minifiedSource =
      '[{"name":"示例图","layers":[{"title":"接入层","children":["Web 端",{"title":"接口组","children":["OpenAPI","Webhook"]}]}]}]';

    fireEvent.change(textarea, { target: { value: minifiedSource } });

    await waitFor(() => {
      expect(textarea).toHaveValue(JSON.stringify(JSON.parse(minifiedSource), null, 2));
    });
  });

  it('generates previews with all items unselected by default', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '生成预览' }));

    expect(screen.getByText('已生成 2 张架构图')).toBeInTheDocument();
    screen.getAllByRole('checkbox').forEach((checkbox) => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it('downloads only selected diagrams when clicking 下载已选', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '生成预览' }));
    await user.click(screen.getByLabelText('通用业务平台架构图 选择框'));
    await user.click(screen.getByRole('button', { name: '下载已选' }));

    expect(downloadManyPngMock).toHaveBeenCalledTimes(1);
    expect(downloadManyPngMock).toHaveBeenCalledWith([
      expect.objectContaining({
        filename: '通用业务平台架构图',
      }),
    ]);
  });

  it('downloads all generated diagrams when clicking 下载全部', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '生成预览' }));
    await user.click(screen.getByRole('button', { name: '下载全部' }));

    expect(downloadManyPngMock).toHaveBeenCalledTimes(1);
    expect(downloadManyPngMock.mock.calls[0][0]).toHaveLength(2);
  });

  it('copies prompt requirements to clipboard', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '复制提示词要求' }));

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith(MODEL_OUTPUT_PROMPT);
    expect(screen.getByRole('status')).toHaveTextContent('提示词要求已复制到剪贴板');
  });
});
