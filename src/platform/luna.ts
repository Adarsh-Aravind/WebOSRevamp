// Minimal Luna service bus caller. This is what LG's webOSTV.js does under the hood:
// every webOS web app gets a global `PalmServiceBridge`. Calls the TV refuses simply fail —
// the sandbox decides, we never need (or try) to get around it.


export interface LunaError extends Error {
  response?: any;
}

const alive = new Set<any>(); // keep bridges referenced until they answer (otherwise GC drops them)

export const isTV = typeof (window as any).PalmServiceBridge === 'function';

export function luna<T = any>(uri: string, params: object = {}, timeoutMs = 6000): Promise<T> {
  const Bridge = (window as any).PalmServiceBridge;
  if (!Bridge) return Promise.reject(makeError('Not running on a webOS TV'));

  return new Promise<T>((resolve, reject) => {
    const bridge = new Bridge();
    alive.add(bridge);
    let done = false;
    const finish = () => {
      done = true;
      alive.delete(bridge);
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      if (done) return;
      finish();
      try { bridge.cancel && bridge.cancel(); } catch (_) { /* ignore */ }
      reject(makeError('No answer from TV (timeout)'));
    }, timeoutMs);

    bridge.onservicecallback = (msg: string) => {
      if (done) return;
      finish();
      let res: any;
      try {
        res = JSON.parse(msg);
      } catch (_) {
        reject(makeError('Unreadable answer from TV'));
        return;
      }
      if (res && (res.returnValue === false || (res.errorCode !== undefined && res.returnValue !== true))) {
        const err = makeError(res.errorText || `Error ${res.errorCode}`);
        err.response = res;
        reject(err);
      } else {
        resolve(res as T);
      }
    };
    bridge.call(uri, JSON.stringify(params));
  });
}

function makeError(message: string): LunaError {
  return new Error(message) as LunaError;
}
