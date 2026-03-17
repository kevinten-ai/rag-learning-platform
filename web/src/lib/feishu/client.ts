import * as lark from '@larksuiteoapi/node-sdk'

let client: lark.Client | null = null

export function getFeishuClient() {
  if (!client) {
    client = new lark.Client({
      appId: process.env.FEISHU_APP_ID!,
      appSecret: process.env.FEISHU_APP_SECRET!,
    })
  }
  return client
}

export async function getDocumentContent(documentId: string) {
  const feishu = getFeishuClient()
  const res = await feishu.docx.documentBlock.list({
    path: { document_id: documentId },
    params: { document_revision_id: -1, page_size: 500 },
  })
  return res
}

export async function getDocumentMeta(documentId: string) {
  const feishu = getFeishuClient()
  const res = await feishu.docx.document.get({
    path: { document_id: documentId },
  })
  return res
}

export async function getRawContent(documentId: string) {
  const feishu = getFeishuClient()
  const res = await feishu.docx.document.rawContent({
    path: { document_id: documentId },
  })
  return res
}
