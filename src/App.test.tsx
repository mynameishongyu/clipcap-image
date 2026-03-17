import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

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
    await user.click(screen.getByLabelText('心理健康科研架构图 选择框'));
    await user.click(screen.getByRole('button', { name: '下载已选' }));

    expect(downloadManyPngMock).toHaveBeenCalledTimes(1);
    expect(downloadManyPngMock).toHaveBeenCalledWith([
      expect.objectContaining({
        filename: '心理健康科研架构图',
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
});
