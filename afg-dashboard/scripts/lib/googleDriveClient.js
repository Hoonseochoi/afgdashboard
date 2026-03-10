const { google } = require('googleapis');
const { Readable } = require('stream');

function sanitizeName(name) {
  if (!name) return '미지정';
  return String(name)
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || '미지정';
}

class GoogleDriveClient {
  constructor(options) {
    const { serviceAccountJson, rootFolderId } = options;
    if (!serviceAccountJson) {
      throw new Error('GDRIVE_SERVICE_ACCOUNT_KEY 가 비어 있습니다.');
    }
    this.rootFolderId = rootFolderId;

    let parsed;
    try {
      parsed = JSON.parse(serviceAccountJson);
    } catch {
      try {
        // JSON 형식이 약간 어긋난 경우를 위해 느슨한 파서 사용
        // eslint-disable-next-line no-eval
        parsed = eval(`(${serviceAccountJson})`);
      } catch {
        throw new Error('GDRIVE_SERVICE_ACCOUNT_KEY JSON 파싱 실패');
      }
    }
    const clientEmail = parsed.client_email;
    const privateKey = parsed.private_key;
    if (!clientEmail || !privateKey) {
      throw new Error('서비스 계정 JSON에 client_email 또는 private_key 가 없습니다.');
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async findOrCreateFolder(name, parentId) {
    const safeName = name.replace(/'/g, "\\'");
    const q = [
      "mimeType = 'application/vnd.google-apps.folder'",
      `name = '${safeName}'`,
      `'${parentId}' in parents`,
      'trashed = false',
    ].join(' and ');

    const listRes = await this.drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
      pageSize: 1,
    });

    const existing = listRes.data.files && listRes.data.files[0];
    if (existing && existing.id) {
      return existing.id;
    }

    const createRes = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    });
    const id = createRes.data.id;
    if (!id) {
      throw new Error(`폴더 생성 실패: ${name}`);
    }
    return id;
  }

  async uploadPng(params) {
    const { buffer, managerName, agentName, dateLabelMMDD } = params;
    const dateName = dateLabelMMDD || 'unknown';
    const dateFolderName = sanitizeName(dateName);
    const managerFolderName = sanitizeName(managerName);
    const fileName = `${sanitizeName(agentName)}.png`;

    const dateFolderId = await this.findOrCreateFolder(dateFolderName, this.rootFolderId);
    const managerFolderId = await this.findOrCreateFolder(managerFolderName, dateFolderId);

    const fileMetadata = {
      name: fileName,
      parents: [managerFolderId],
    };

    const media = {
      mimeType: 'image/png',
      body: bufferToStream(buffer),
    };

    await this.drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id',
    });
  }
}

function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

module.exports = {
  GoogleDriveClient,
};

