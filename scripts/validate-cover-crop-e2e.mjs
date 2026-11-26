import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [executableArgument, imageArgument, libraryName = 'Validação de recorte', nudgeKey = 'ArrowDown'] = process.argv.slice(2);
const attachedSession = process.env.BMD_CROP_TEST_PORT !== undefined;
if ((!attachedSession && !executableArgument) || !imageArgument) {
  throw new Error('Uso: node scripts/validate-cover-crop-e2e.mjs <aplicativo.exe> <imagem.png> ou BMD_CROP_TEST_PORT=9339 para sessão aberta');
}

const executable = executableArgument ? resolve(executableArgument) : null;
const image = resolve(imageArgument);
const testProfile = attachedSession ? null : mkdtempSync(join(tmpdir(), 'bmd-cover-crop-e2e-'));
const debuggingPort = Number(process.env.BMD_CROP_TEST_PORT ?? 9339);
const child = attachedSession ? null : spawn(executable, [], {
  env: {
    ...process.env,
    APPDATA: testProfile,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${debuggingPort}`,
  },
  stdio: 'ignore',
});

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitForTarget() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      // WebView2 has not opened the debugging endpoint yet.
    }
    await delay(200);
  }
  throw new Error('O aplicativo não abriu uma página WebView2 para o teste.');
}

function createCdpClient(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 1;
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  return {
    ready: new Promise((resolveReady, rejectReady) => {
      socket.addEventListener('open', resolveReady, { once: true });
      socket.addEventListener('error', rejectReady, { once: true });
    }),
    close: () => socket.close(),
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolveRequest, rejectRequest) => {
        pending.set(id, { resolve: resolveRequest, reject: rejectRequest });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

async function run() {
  const target = await waitForTarget();
  const client = createCdpClient(target.webSocketDebuggerUrl);
  await client.ready;
  const evaluate = async (expression, returnByValue = true) => {
    const response = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return returnByValue ? response.result.value : response.result;
  };
  const waitFor = async (expression, message) => {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await delay(100);
    }
    throw new Error(message);
  };

  await client.send('Runtime.enable');
  await client.send('DOM.enable');
  try {
    await waitFor("document.querySelector('.page-heading') !== null", 'A tela de bibliotecas não foi carregada.');
  } catch (error) {
    const pageState = await evaluate("({ url: location.href, title: document.title, body: document.body?.innerText ?? '' })");
    throw new Error(`${error.message} Estado da página: ${JSON.stringify(pageState)}`);
  }
  await evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Nova biblioteca')).click()");
  await waitFor("document.querySelector('#library-form') !== null", 'O formulário de biblioteca não abriu.');
  await evaluate(`(() => {
    const input = document.querySelector('#library-form input[required]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(libraryName)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  const fileInput = await evaluate("document.querySelector('#library-form input[type=file]')", false);
  await client.send('DOM.setFileInputFiles', { objectId: fileInput.objectId, files: [image] });
  await waitFor("document.querySelector('.cover-preview img')?.complete === true && document.querySelector('.cover-preview img')?.naturalWidth > 0", 'A imagem de capa não foi carregada.');
  await evaluate("document.querySelector('#library-form').requestSubmit()");
  await waitFor("document.querySelector('.detail-banner img')?.complete === true", 'A biblioteca criada não exibiu o banner.');

  const original = await evaluate(`(() => {
    const banner = document.querySelector('.detail-banner');
    const imageElement = banner.querySelector('img');
    const bounds = banner.getBoundingClientRect();
    return { ratio: bounds.width / bounds.height, naturalWidth: imageElement.naturalWidth, naturalHeight: imageElement.naturalHeight };
  })()`);
  await evaluate("document.querySelector('[aria-label=\"Editar recorte da capa\"]').click()");
  await waitFor("document.querySelector('.crop-editor-stage') !== null", 'O editor de recorte não abriu.');
  const editorRatio = await evaluate(`(() => {
    const bounds = document.querySelector('.crop-editor-stage').getBoundingClientRect();
    return bounds.width / bounds.height;
  })()`);
  if (Math.abs(editorRatio - original.ratio) > 0.02) {
    throw new Error(`A prévia (${editorRatio}) não reproduz a proporção do banner (${original.ratio}).`);
  }

  await evaluate("document.querySelector('.crop-editor-stage').focus()");
  const keyCode = { ArrowDown: 40, ArrowUp: 38, ArrowRight: 39, ArrowLeft: 37 }[nudgeKey];
  if (!keyCode) throw new Error(`Tecla de ajuste inválida: ${nudgeKey}`);
  for (let index = 0; index < 10; index += 1) {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: nudgeKey, code: nudgeKey, windowsVirtualKeyCode: keyCode });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: nudgeKey, code: nudgeKey, windowsVirtualKeyCode: keyCode });
  }
  await evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Salvar recorte')).click()");
  await waitFor("document.querySelector('.crop-editor-stage') === null && document.querySelector('.notice')?.textContent.includes('Recorte da capa atualizado')", 'O recorte não foi salvo.');
  const savedPosition = await evaluate("document.querySelector('.detail-banner img').style.objectPosition");
  const expectedPosition = nudgeKey === 'ArrowDown' ? '50% 70%' : nudgeKey === 'ArrowUp' ? '50% 30%' : nudgeKey === 'ArrowRight' ? '70% 50%' : '30% 50%';
  if (savedPosition !== expectedPosition) throw new Error(`Posição exibida após salvar: ${savedPosition}; esperada: ${expectedPosition}.`);

  await evaluate("document.querySelector('.back-link').click()");
  await waitFor("document.querySelector('.library-card') !== null", 'A listagem de bibliotecas não reapareceu.');
  await evaluate(`[...document.querySelectorAll('.library-card')].find((button) => button.textContent.includes(${JSON.stringify(libraryName)})).click()`);
  await waitFor("document.querySelector('.detail-banner img')?.complete === true", 'O banner não reapareceu ao reabrir a biblioteca.');
  const reopenedPosition = await evaluate("document.querySelector('.detail-banner img').style.objectPosition");
  if (reopenedPosition !== savedPosition) throw new Error(`O recorte reaberto mudou para ${reopenedPosition}.`);

  client.close();
  return { ...original, editorRatio, savedPosition, reopenedPosition };
}

try {
  const result = await run();
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  if (child) {
    child.kill();
    await Promise.race([
      new Promise((resolveExit) => child.once('exit', resolveExit)),
      delay(2_000),
    ]);
    rmSync(testProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
