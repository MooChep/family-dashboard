export async function GET(): Promise<Response> {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) return Response.json({ success: false, error: 'VAPID non configuré' }, { status: 500 })
  return Response.json({ success: true, data: key })
}
