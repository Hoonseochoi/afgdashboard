import { Client, Account, Databases } from "appwrite";

const client = new Client()
  .setEndpoint("https://sgp.cloud.appwrite.io/v1")
  .setProject("69a11879001bc4449874");

const account = new Account(client);
const databases = new Databases(client);

// Appwrite Health 체크용 ping 헬퍼
// 공식 SDK에 ping 메서드는 없으므로, low-level call을 이용해 추가한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(client as any).ping = async () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).call("get", "/health");
    // eslint-disable-next-line no-console
    console.log("[Appwrite] Health OK");
  } catch (e) {
    console.error("[Appwrite] Health ping failed", e);
    throw e;
  }
};

export { client, account, databases };

