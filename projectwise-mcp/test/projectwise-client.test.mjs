import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { ProjectWiseClient } from '../dist/projectwise-client.js';

const repositoryId = '12345678-1234-1234-1234-123456789abc';
const documentId = 'abcdefab-cdef-abcd-efab-cdefabcdefab';

test('rejects invalid repository and object IDs before making requests', async () => {
  assert.throws(
    () => new ProjectWiseClient({
      baseUrl: 'http://127.0.0.1',
      repositoryId: '../../other-repository',
      token: 'test-token',
      appGuid: 'test-app',
      sessionUuid: 'test-session',
    }),
    /expected a GUID/
  );

  const client = new ProjectWiseClient({
    baseUrl: 'http://127.0.0.1',
    repositoryId,
    token: 'test-token',
    appGuid: 'test-app',
    sessionUuid: 'test-session',
  });

  await assert.rejects(client.getDocument('../../other-repository/document'), /expected a GUID/);
  await assert.rejects(client.getFolder('../another-folder'), /expected a GUID/);
  await assert.rejects(client.listDocuments('not-a-guid'), /expected a GUID/);
  await assert.rejects(client.listFolders('not-a-guid'), /expected a GUID/);
  await assert.rejects(client.get(`/Repositories/${repositoryId}-other/PW_WSG/Document`), /outside the configured repository/);
});

test('keeps valid requests within the configured repository and escapes filter text', async (t) => {
  let requestPath;
  const server = createServer((request, response) => {
    requestPath = request.url;
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const client = new ProjectWiseClient({
    baseUrl: `http://127.0.0.1:${address.port}`,
    repositoryId,
    token: 'test-token',
    appGuid: 'test-app',
    sessionUuid: 'test-session',
  });

  assert.deepEqual(await client.getDocument(documentId), { ok: true });
  assert.equal(requestPath, `/Repositories/${repositoryId}/PW_WSG/Document/${documentId}`);

  assert.deepEqual(await client.searchDocuments("O'Brien"), { ok: true });
  const filter = new URL(`http://127.0.0.1${requestPath}`).searchParams.get('$filter');
  assert.equal(filter, "contains(Name,'O''Brien')");
});
