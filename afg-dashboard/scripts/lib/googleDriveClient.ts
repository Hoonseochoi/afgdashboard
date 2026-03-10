import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

interface GoogleDriveClientOptions {
  serviceAccountJson: string;
  rootFolderId: string;
}

export interface UploadPngParams {
  buffer: Buffer;
  managerName: string;
  agentName: string;
  dateLabelMMDD: string;
}

function sanitizeName(name: string | null | undefined): string {
  if (!name) return '미지정';
  return String(name)
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || '미지정';
}

export class GoogleDriveClient {
  private drive: drive_v3.Drive;
  private rootFolderId: string;

  constructor(options: GoogleDriveClientOptions) {
    const { serviceAccountJson, rootFolderId } = options;
    if (!serviceAccountJson) {
      throw new Error('GDRIVE_SERVICE_ACCOUNT_KEY 가 비어 있습니다.');
    }
    this.rootFolderId = rootFolderId;

    let parsed: {
      client_email?: string;
      private_key?: string;
      [key: string]: unknown;
    };
    try {
      parsed = JSON.parse(serviceAccountJson);
    } catch {
      throw new Error('GDRIVE_SERVICE_ACCOUNT_KEY JSON 파싱 실패');
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

  private async findOrCreateFolder(name: string, parentId: string): Promise<string> {
    const q = [
      "mimeType = 'application/vnd.google-apps.folder'",
      `name = '${name.replace(/'/g, "\\'")}'`,
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

  async uploadPng(params: UploadPngParams): Promise<void> {
    const { buffer, managerName, agentName, dateLabelMMDD } = params;
    const dateName = dateLabelMMDD || 'unknown';
    const dateFolderName = sanitizeName(dateName);
    const managerFolderName = sanitizeName(managerName);
    const fileName = `${sanitizeName(agentName)}.png`;

    const dateFolderId = await this.findOrCreateFolder(dateFolderName, this.rootFolderId);
    const managerFolderId = await this.findOrCreateFolder(managerFolderName, dateFolderId);

    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      parents: [managerFolderId],
    };

    const media: {
      mimeType: string;
      body: NodeJS.ReadableStream;
    } = {
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

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

