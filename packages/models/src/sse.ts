import { ModelError } from './errors';

/** 将 SSE data 转成待校验对象，解析失败时保留统一错误类型。 */
export function parseSseJson(data: string): unknown {
  try {
    return JSON.parse(data) as unknown;
  } catch (error) {
    throw new ModelError('模型流式响应包含无效 JSON', {
      code: 'invalid_response',
      cause: error,
    });
  }
}

/** 按 SSE 事件边界读取 data 字段，不依赖底层网络分块方式。 */
export async function* readSseData(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = normalizeLineEndings(buffer, false);

      let boundaryIndex = buffer.indexOf('\n\n');

      while (boundaryIndex >= 0) {
        const event = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);
        const data = extractSseData(event);

        if (data !== undefined) {
          yield data;
        }

        boundaryIndex = buffer.indexOf('\n\n');
      }
    }

    const remainingData = extractSseData(normalizeLineEndings(buffer, true));

    if (remainingData !== undefined) {
      yield remainingData;
    }
  } catch (error) {
    throw new ModelError('读取模型流式响应失败', {
      code: 'request_failed',
      cause: error,
    });
  } finally {
    reader.releaseLock();
  }
}

/** 归一化 SSE 换行符，并在读取阶段保留可能跨块的末尾 CR。 */
function normalizeLineEndings(value: string, flush: boolean): string {
  const hasPendingCarriageReturn = !flush && value.endsWith('\r');
  const completeValue = hasPendingCarriageReturn ? value.slice(0, -1) : value;

  return `${completeValue.replace(/\r\n?/g, '\n')}${hasPendingCarriageReturn ? '\r' : ''}`;
}

/** 从单个 SSE 事件中提取并合并 data 行。 */
function extractSseData(event: string): string | undefined {
  const dataLines = event
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart());

  if (dataLines.length === 0) {
    return undefined;
  }

  return dataLines.join('\n');
}
